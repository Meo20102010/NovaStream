import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError, generateVideoSlug, logActivity } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { uploadId } = await params;
    const { blobUrl, title, description, category, tags, isPublic } = await request.json();

    if (!blobUrl) return apiError('Missing blob URL');

    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
    });

    if (!session) return apiError('Upload session not found', 404);
    if (session.userId !== user.id) return apiError('Unauthorized', 401);
    if (session.status !== 'UPLOADING') return apiError('Upload session is not active');

    const slug = generateVideoSlug();
    const ext = session.originalName.includes('.') ? '.' + session.originalName.split('.').pop() : '';
    const finalFilename = `${slug}${ext}`;

    const videoTitle = title || session.originalName.replace(/\.[^/.]+$/, '');
    const tagString = Array.isArray(tags) ? JSON.stringify(tags) : tags || '[]';

    const video = await prisma.video.create({
      data: {
        title: videoTitle,
        description: description || null,
        filename: finalFilename,
        originalName: session.originalName,
        mimeType: session.mimeType,
        size: session.totalSize,
        path: blobUrl,
        slug,
        status: 'READY',
        isPublic: isPublic !== false,
        category: category || null,
        tags: tagString,
        uploadedById: user.id,
      },
    });

    await prisma.uploadSession.update({
      where: { id: uploadId },
      data: { status: 'COMPLETED', videoId: video.id },
    });

    await logActivity(user.id, 'UPLOAD', 'video', `Uploaded: ${session.originalName}`);

    return apiSuccess({ videoId: video.id, slug });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(e.message, 500);
  }
}
