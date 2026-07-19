import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { serializeBigInt } from '../utils/serialize';

export async function registerStatsRoutes(app: FastifyInstance) {
  app.get('/api/stats/overview', {
    schema: { tags: ['Stats'], summary: 'Get overview stats' },
  }, async () => {
    const [totalVideos, totalViews, totalStorage] = await Promise.all([
      prisma.video.count({ where: { status: 'READY' } }),
      prisma.video.aggregate({ _sum: { views: true }, where: { status: 'READY' } }),
      prisma.video.aggregate({ _sum: { size: true }, where: { status: 'READY' } }),
    ]);

    return serializeBigInt({
      success: true,
      data: {
        totalVideos,
        totalViews: totalViews._sum.views || 0,
        totalStorage: Number(totalStorage._sum.size || 0),
      },
    });
  });

  app.get('/api/stats/views', {
    schema: { tags: ['Stats'], summary: 'Get view statistics' },
  }, async () => {
    const videos = await prisma.video.findMany({
      where: { status: 'READY' },
      select: { id: true, title: true, views: true, createdAt: true },
      orderBy: { views: 'desc' },
      take: 100,
    });
    return serializeBigInt({ success: true, data: videos });
  });

  app.post('/api/videos/:id/view', {
    schema: { tags: ['Stats'], summary: 'Increment view count' },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return reply.status(404).send({ success: false, error: { message: 'Video not found' } });
    }
    await prisma.video.update({ where: { id }, data: { views: { increment: 1 } } });
    return serializeBigInt({ success: true, data: { views: video.views + 1 } });
  });
}
