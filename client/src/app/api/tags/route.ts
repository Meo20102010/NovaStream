import prisma from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      where: { status: 'READY' },
      select: { tags: true },
    });
    const tagCounts: Record<string, number> = {};
    for (const v of videos) {
      const parsed = typeof v.tags === 'string' ? JSON.parse(v.tags || '[]') : (v.tags || []);
      for (const tag of parsed) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return apiSuccess(tags);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
