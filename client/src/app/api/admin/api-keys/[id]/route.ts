import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, 'ADMIN');
    const { id } = await params;
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key) return apiError('API key not found', 404);
    await prisma.apiKey.delete({ where: { id } });
    return apiSuccess({ message: 'API key deleted' });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}
