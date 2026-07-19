import prisma from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const [totalVideos, totalViews, totalStorage] = await Promise.all([
      prisma.video.count({ where: { status: 'READY' } }),
      prisma.video.aggregate({ _sum: { views: true }, where: { status: 'READY' } }),
      prisma.video.aggregate({ _sum: { size: true }, where: { status: 'READY' } }),
    ]);

    return apiSuccess({
      totalVideos,
      totalViews: totalViews._sum.views || 0,
      totalStorage: Number(totalStorage._sum.size || 0),
    });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
