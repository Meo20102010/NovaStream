import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { apiError } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const video = await prisma.video.findFirst({
      where: { OR: [{ id }, { slug: id }, { customUrl: id }], status: 'READY' },
    });
    if (!video) return apiError('Video not found', 404);

    // Increment view count asynchronously
    prisma.video.update({
      where: { id: video.id },
      data: { views: { increment: 1 } },
    }).catch(() => {});

    // If the video path is already a public Blob URL, redirect to it.
    // Vercel Blob handles range requests, CDN delivery and large file streaming natively.
    if (video.path.startsWith('https://') && video.path.includes('blob.vercel-storage.com')) {
      return Response.redirect(video.path, 302);
    }

    // Fallback: stream via fetch for any other URL
    const range = request.headers.get('range');
    const fetchHeaders: Record<string, string> = {};
    if (range) fetchHeaders['Range'] = range;

    const response = await fetch(video.path, { headers: fetchHeaders });
    if (!response.ok) return apiError('Failed to stream video', 500);

    const headers = new Headers(response.headers);
    headers.set('Accept-Ranges', 'bytes');

    return new Response(response.body, {
      status: range ? 206 : response.status,
      headers,
    });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
