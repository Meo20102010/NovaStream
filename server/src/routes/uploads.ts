import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { authGuard, roleGuard } from '../middleware/auth';
import { generateVideoSlug, getVideoMetadata, generateThumbnails, generatePoster, logActivity } from '../services/video.service';
import { serializeBigInt } from '../utils/serialize';
import { config } from '../config/env';
import path from 'path';
import fs from 'fs/promises';
import { pipeline } from 'stream/promises';

export async function registerUploadRoutes(app: FastifyInstance) {
  app.post('/api/uploads/init', {
    preHandler: [authGuard],
    schema: {
      tags: ['Uploads'],
      summary: 'Initialize chunked upload',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { filename, mimeType, totalSize, totalChunks } = request.body as any;

    if (!filename || !mimeType || !totalSize || !totalChunks) {
      return reply.status(400).send({ success: false, error: { message: 'Missing required fields' } });
    }

    if (totalSize > config.MAX_FILE_SIZE) {
      return reply.status(413).send({ success: false, error: { message: 'File too large' } });
    }

    const session = await prisma.uploadSession.create({
      data: {
        filename,
        originalName: filename,
        mimeType,
        totalSize: BigInt(totalSize),
        totalChunks,
        userId,
        status: 'UPLOADING',
      },
    });

    const chunksDir = path.join(config.STORAGE_PATH, 'chunks', session.id);
    await fs.mkdir(chunksDir, { recursive: true });

    return {
      success: true,
      data: { uploadId: session.id, chunkSize: config.CHUNK_SIZE },
    };
  });

  app.post('/api/uploads/:uploadId/chunk/:chunkIndex', {
    preHandler: [authGuard],
    schema: {
      tags: ['Uploads'],
      summary: 'Upload a chunk',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { uploadId, chunkIndex } = request.params as { uploadId: string; chunkIndex: string };
    const idx = parseInt(chunkIndex);

    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
    });

    if (!session) {
      return reply.status(404).send({ success: false, error: { message: 'Upload session not found' } });
    }

    if (session.status !== 'UPLOADING') {
      return reply.status(400).send({ success: false, error: { message: 'Upload session is not active' } });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, error: { message: 'No chunk data' } });
    }

    const chunksDir = path.join(config.STORAGE_PATH, 'chunks', uploadId);
    const chunkPath = path.join(chunksDir, `chunk_${idx}`);

    const buffer = await data.toBuffer();
    await fs.writeFile(chunkPath, buffer);

    await prisma.uploadChunk.create({
      data: {
        uploadId,
        chunkIndex: idx,
        size: buffer.length,
        path: chunkPath,
        uploaded: true,
      },
    });

    await prisma.uploadSession.update({
      where: { id: uploadId },
      data: { uploadedChunks: { increment: 1 } },
    });

    return {
      success: true,
      data: {
        chunkIndex: idx,
        uploaded: true,
        progress: Math.round(((idx + 1) / session.totalChunks) * 100),
      },
    };
  });

  app.post('/api/uploads/:uploadId/complete', {
    preHandler: [authGuard],
    schema: {
      tags: ['Uploads'],
      summary: 'Complete upload and merge chunks',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { uploadId } = request.params as { uploadId: string };
    const { id: userId } = request.user as { id: string };

    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });

    if (!session) {
      return reply.status(404).send({ success: false, error: { message: 'Upload session not found' } });
    }

    if (session.uploadedChunks < session.totalChunks) {
      return reply.status(400).send({ success: false, error: { message: 'Not all chunks uploaded' } });
    }

    const slug = generateVideoSlug();
    const ext = path.extname(session.originalName);
    const finalFilename = `${slug}${ext}`;
    const videoPath = path.join(config.UPLOAD_DIR, finalFilename);

    const writeStream = require('fs').createWriteStream(videoPath);
    for (const chunk of session.chunks) {
      const chunkData = await fs.readFile(chunk.path);
      writeStream.write(chunkData);
    }
    writeStream.end();

    await new Promise<void>((resolve) => writeStream.on('finish', resolve));

    const metadata = await getVideoMetadata(videoPath);
    const stat = await fs.stat(videoPath);

    const video = await prisma.video.create({
      data: {
        title: path.basename(session.originalName, ext),
        filename: finalFilename,
        originalName: session.originalName,
        mimeType: session.mimeType,
        size: BigInt(stat.size),
        duration: metadata?.duration,
        width: metadata?.width,
        height: metadata?.height,
        codec: metadata?.codec,
        fps: metadata?.fps,
        bitrate: metadata?.bitrate,
        path: videoPath,
        slug,
        status: 'PROCESSING',
        uploadedById: userId,
      },
    });

    await prisma.uploadSession.update({
      where: { id: uploadId },
      data: { status: 'COMPLETED', videoId: video.id },
    });

    generateThumbnails(videoPath, video.id).then(async (thumbs) => {
      if (thumbs.length > 0) {
        await prisma.video.update({
          where: { id: video.id },
          data: { thumbnailPath: thumbs[0] },
        });
      }
    });

    generatePoster(videoPath, video.id).then(async (poster) => {
      if (poster) {
        await prisma.video.update({
          where: { id: video.id },
          data: { posterPath: poster, status: 'READY' },
        });
      } else {
        await prisma.video.update({
          where: { id: video.id },
          data: { status: 'READY' },
        });
      }
    });

    const chunksDir = path.join(config.STORAGE_PATH, 'chunks', uploadId);
    fs.rm(chunksDir, { recursive: true, force: true }).catch(() => {});

    await logActivity(userId, 'UPLOAD', 'video', `Uploaded: ${session.originalName}`);

    return { success: true, data: { videoId: video.id, slug } };
  });

  app.delete('/api/uploads/:uploadId', {
    preHandler: [authGuard],
    schema: {
      tags: ['Uploads'],
      summary: 'Cancel upload',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { uploadId } = request.params as { uploadId: string };

    const session = await prisma.uploadSession.findUnique({ where: { id: uploadId } });
    if (!session) {
      return reply.status(404).send({ success: false, error: { message: 'Upload session not found' } });
    }

    const chunksDir = path.join(config.STORAGE_PATH, 'chunks', uploadId);
    await fs.rm(chunksDir, { recursive: true, force: true }).catch(() => {});

    await prisma.uploadChunk.deleteMany({ where: { uploadId } });
    await prisma.uploadSession.update({ where: { id: uploadId }, data: { status: 'CANCELLED' } });

    return { success: true, data: { message: 'Upload cancelled' } };
  });

  app.get('/api/uploads', {
    preHandler: [authGuard],
    schema: {
      tags: ['Uploads'],
      summary: 'List user uploads',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const { id: userId } = request.user as { id: string };
    const sessions = await prisma.uploadSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, data: sessions };
  });
}
