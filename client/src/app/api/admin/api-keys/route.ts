import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');
    const keys = await prisma.apiKey.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return apiSuccess(keys);
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, 'ADMIN');
    const { name } = await request.json();
    const key = `ns_${uuidv4().replace(/-/g, '')}`;

    const apiKey = await prisma.apiKey.create({
      data: { name, key, userId: user.id },
    });

    return apiSuccess(apiKey, 201);
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}
