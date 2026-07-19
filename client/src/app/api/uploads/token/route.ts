import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAuth } from '@/lib/auth';
import { apiError } from '@/lib/api-response';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth(request);
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string, clientPayload: string | null) => {
        // Validate upload session if client sent it
        let uploadId: string | undefined;
        try {
          const payload = clientPayload ? JSON.parse(clientPayload) : {};
          uploadId = payload.uploadId;
        } catch {
          // ignore invalid payload
        }

        return {
          allowedContentTypes: [
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-matroska',
            'video/x-flv',
            'video/mpeg',
            'video/ogg',
            'application/octet-stream',
          ],
          maximumSizeInBytes: 10 * 1024 * 1024 * 1024, // 10GB
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            userId: user.id,
            uploadId,
            pathname,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const payload = tokenPayload ? JSON.parse(tokenPayload) : {};
          console.log('Blob upload completed', {
            pathname: blob.pathname,
            url: blob.url,
            userId: payload.userId,
            uploadId: payload.uploadId,
          });
        } catch (error) {
          console.error('Blob upload completed webhook error:', error);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(e.message, 400);
  }
}
