import prisma from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      where: { status: 'READY', isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return apiSuccess(videos);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
