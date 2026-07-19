import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { id } = await requireAuth(request);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true, role: true, avatar: true, createdAt: true },
    });
    if (!user) return apiError('User not found', 404);
    return apiSuccess(user);
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(e.message, 500);
  }
}
