import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, 'ADMIN');
    const { id } = await params;
    const { role, isActive } = await request.json();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return apiError('User not found', 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { ...(role && { role }), ...(isActive !== undefined && { isActive }) },
      select: { id: true, email: true, username: true, role: true, isActive: true },
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
    await requireRole(request, 'ADMIN');
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return apiError('User not found', 404);
    await prisma.user.delete({ where: { id } });
    return apiSuccess({ message: 'User deleted' });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}
