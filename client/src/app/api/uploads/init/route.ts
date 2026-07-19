import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { filename, mimeType, totalSize, totalChunks } = await request.json();

    if (!filename || !mimeType || !totalSize || !totalChunks) {
      return apiError('Missing required fields');
    }

    // 10GB max upload size for Vercel Blob client uploads
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;
    if (totalSize > MAX_FILE_SIZE) {
      return apiError('File too large (max 10GB)', 413);
    }

    const session = await prisma.uploadSession.create({
      data: {
        filename,
        originalName: filename,
        mimeType,
        totalSize: BigInt(totalSize),
        totalChunks,
        userId: user.id,
        status: 'UPLOADING',
      },
    });

    return apiSuccess({ uploadId: session.id, chunkSize: CHUNK_SIZE });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(e.message, 500);
  }
}
