import prisma from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      where: { category: { not: null }, status: 'READY' },
      select: { category: true },
    });
    const catMap: Record<string, number> = {};
    for (const v of videos) {
      if (v.category) catMap[v.category] = (catMap[v.category] || 0) + 1;
    }
    const categories = Object.entries(catMap).map(([category, count]) => ({ category, _count: count }));
    return apiSuccess(categories);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
