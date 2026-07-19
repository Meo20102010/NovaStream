import { NextRequest } from 'next/server';
import { del } from '@vercel/blob';
import prisma from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const video = await prisma.video.findFirst({
      where: { OR: [{ id }, { slug: id }, { customUrl: id }] },
    });
    if (!video) return apiError('Video not found', 404);
    return apiSuccess(video);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, 'ADMIN', 'MODERATOR', 'EDITOR');
    const { id } = await params;
    const body = await request.json();
    const { title, description, category, tags, isPublic, customUrl } = body;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return apiError('Video not found', 404);

    if (customUrl && customUrl !== video.customUrl) {
      const existing = await prisma.video.findUnique({ where: { customUrl } });
      if (existing) return apiError('Custom URL already in use', 409);
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

    return apiSuccess(updated);
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(request, 'ADMIN', 'MODERATOR');
    const { id } = await params;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return apiError('Video not found', 404);

    // Delete the video file from Vercel Blob if stored there
    if (video.path && video.path.includes('blob.vercel-storage.com')) {
      try {
        await del(video.path);
      } catch (blobError) {
        console.error('Failed to delete blob:', blobError);
      }
    }

    await prisma.video.delete({ where: { id } });

    const { logActivity } = await import('@/lib/api-response');
    await logActivity(user.id, 'DELETE', 'video', `Deleted video: ${video.title}`);

    return apiSuccess({ message: 'Video deleted' });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}
