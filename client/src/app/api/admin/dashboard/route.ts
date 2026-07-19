import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN', 'MODERATOR');

    const [totalVideos, totalUsers, totalViews, storageStats] = await Promise.all([
      prisma.video.count({ where: { status: 'READY' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.video.aggregate({ _sum: { views: true }, where: { status: 'READY' } }),
      prisma.video.aggregate({ _sum: { size: true }, where: { status: 'READY' } }),
    ]);

    return apiSuccess({
      totalVideos,
      totalUsers,
      totalViews: totalViews._sum.views || 0,
      totalStorage: Number(storageStats._sum.size || 0),
      cpu: 0,
      ram: 0,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}
