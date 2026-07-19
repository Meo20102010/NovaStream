import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { authGuard, roleGuard } from '../middleware/auth';
import { getVideoMetadata, generateThumbnails, generatePoster, logActivity, generateVideoSlug } from '../services/video.service';
import { config } from '../config/env';
import { serializeBigInt } from '../utils/serialize';
import path from 'path';
import fs from 'fs/promises';

export async function registerVideoRoutes(app: FastifyInstance) {
  app.get('/api/videos', {
    schema: { tags: ['Videos'], summary: 'List videos' },
  }, async (request) => {
    const {
      page = '1',
      limit = '20',
      search,
      category,
      tag,
      sort = 'createdAt',
      order = 'desc',
      status,
      resolution,
    } = request.query as any;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = { status: status || 'READY' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (tag) where.tags = { contains: tag };

    const orderBy: any = { [sort]: order };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({ where, orderBy, skip, take }),
      prisma.video.count({ where }),
    ]);

    return serializeBigInt({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      },
    });
  });

  app.get('/api/videos/:id', {
    schema: { tags: ['Videos'], summary: 'Get video by ID or slug' },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const video = await prisma.video.findFirst({
      where: {
        OR: [{ id }, { slug: id }, { customUrl: id }],
      },
    });

    if (!video) {
      return reply.status(404).send({ success: false, error: { message: 'Video not found' } });
    }

    return serializeBigInt({ success: true, data: video });
  });

  app.patch('/api/videos/:id', {
    preHandler: [roleGuard('ADMIN', 'MODERATOR', 'EDITOR')],
    schema: { tags: ['Videos'], summary: 'Update video', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { title, description, category, tags, isPublic, customUrl } = request.body as any;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return reply.status(404).send({ success: false, error: { message: 'Video not found' } });
    }

    if (customUrl && customUrl !== video.customUrl) {
      const existing = await prisma.video.findUnique({ where: { customUrl } });
      if (existing) {
        return reply.status(409).send({ success: false, error: { message: 'Custom URL already in use' } });
      }
    }

    const updated = await prisma.video.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(tags && { tags }),
        ...(isPublic !== undefined && { isPublic }),
        ...(customUrl && { customUrl }),
      },
    });

    return serializeBigInt({ success: true, data: updated });
  });

  app.post('/api/videos/:id/regenerate-url', {
    preHandler: [roleGuard('ADMIN', 'MODERATOR')],
    schema: { tags: ['Videos'], summary: 'Regenerate video URL', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return reply.status(404).send({ success: false, error: { message: 'Video not found' } });
    }

    const newSlug = generateVideoSlug();

    await prisma.video.update({
      where: { id },
      data: { slug: newSlug },
    });

    const user = request.user as { id: string } | undefined;
    if (user) {
      await logActivity(user.id, 'UPDATE', 'video', `Regenerated URL for: ${video.title}`);
    }

    return serializeBigInt({ success: true, data: { slug: newSlug, url: `/vx/${newSlug}` } });
  });

  app.delete('/api/videos/:id', {
    preHandler: [roleGuard('ADMIN', 'MODERATOR')],
    schema: { tags: ['Videos'], summary: 'Delete video', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return reply.status(404).send({ success: false, error: { message: 'Video not found' } });
    }

    try {
      await fs.unlink(video.path).catch(() => {});
      if (video.thumbnailPath) await fs.unlink(video.thumbnailPath).catch(() => {});
      if (video.posterPath) await fs.unlink(video.posterPath).catch(() => {});
    } catch {}

    await prisma.video.delete({ where: { id } });

    const user = request.user as { id: string } | undefined;
    if (user) {
      await logActivity(user.id, 'DELETE', 'video', `Deleted video: ${video.title}`);
    }

    return { success: true, data: { message: 'Video deleted' } };
  });

  app.get('/api/videos/:id/stream', {
    schema: { tags: ['Videos'], summary: 'Stream video' },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const video = await prisma.video.findFirst({
      where: { OR: [{ id }, { slug: id }, { customUrl: id }], status: 'READY' },
    });

    if (!video) {
      return reply.status(404).send({ success: false, error: { message: 'Video not found' } });
    }

    const range = request.headers.range;
    const stat = await fs.stat(video.path);
    const fileSize = stat.size;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = require('fs').createReadStream(video.path, { start, end });

      reply.raw.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });

      stream.pipe(reply.raw);
      return;
    }

    reply.raw.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });

    require('fs').createReadStream(video.path).pipe(reply.raw);
  });

  app.get('/api/videos/:id/thumbnails', {
    schema: { tags: ['Videos'], summary: 'Get video thumbnails' },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return reply.status(404).send({ success: false, error: { message: 'Video not found' } });
    }

    const thumbDir = config.THUMBNAIL_DIR;
    const thumbs: string[] = [];

    try {
      const files = await fs.readdir(thumbDir);
      for (const file of files) {
        if (file.startsWith(id) && file.includes('_thumb_')) {
          thumbs.push(`/storage/thumbnails/${file}`);
        }
      }
    } catch {}

    return { success: true, data: thumbs };
  });

  app.get('/api/videos/popular', {
    schema: { tags: ['Videos'], summary: 'Get popular videos' },
  }, async () => {
    const videos = await prisma.video.findMany({
      where: { status: 'READY', isPublic: true },
      orderBy: { views: 'desc' },
      take: 10,
    });
    return serializeBigInt({ success: true, data: videos });
  });

  app.get('/api/videos/recent', {
    schema: { tags: ['Videos'], summary: 'Get recent videos' },
  }, async () => {
    const videos = await prisma.video.findMany({
      where: { status: 'READY', isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return serializeBigInt({ success: true, data: videos });
  });

  app.get('/api/categories', {
    schema: { tags: ['Videos'], summary: 'Get all categories' },
  }, async () => {
    const videos = await prisma.video.findMany({
      where: { category: { not: null }, status: 'READY' },
      select: { category: true },
    });
    const catMap: Record<string, number> = {};
    for (const v of videos) {
      if (v.category) catMap[v.category] = (catMap[v.category] || 0) + 1;
    }
    const categories = Object.entries(catMap)
      .map(([category, count]) => ({ category, _count: count }));
    return { success: true, data: categories };
  });

  app.get('/api/tags', {
    schema: { tags: ['Videos'], summary: 'Get all tags' },
  }, async () => {
    const videos = await prisma.video.findMany({
      where: { status: 'READY' },
      select: { tags: true },
    });
    const tagCounts: Record<string, number> = {};
    for (const v of videos) {
      const parsed = typeof v.tags === 'string' ? JSON.parse(v.tags || '[]') : (v.tags || []);
      for (const tag of parsed) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return { success: true, data: tags };
  });
}
