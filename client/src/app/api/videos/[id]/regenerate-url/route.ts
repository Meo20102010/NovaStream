import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { apiSuccess, apiError, generateVideoSlug, logActivity } from '@/lib/api-response';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(request, 'ADMIN', 'MODERATOR');
    const { id } = await params;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return apiError('Video not found', 404);

    const newSlug = generateVideoSlug();
    await prisma.video.update({ where: { id }, data: { slug: newSlug } });

    await logActivity(user.id, 'UPDATE', 'video', `Regenerated URL for: ${video.title}`);

    return apiSuccess({ slug: newSlug, url: `/vx/${newSlug}` });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}
