import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return apiError('Video not found', 404);
    await prisma.video.update({ where: { id }, data: { views: { increment: 1 } } });
    return apiSuccess({ views: video.views + 1 });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
