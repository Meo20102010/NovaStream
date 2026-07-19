import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, email: true, username: true, role: true, isActive: true, lastLogin: true, createdAt: true },
        skip, take: limit, orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return apiSuccess({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');
    const { email, username, password, role } = await request.json();

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) return apiError('User already exists', 409);

    const user = await prisma.user.create({
      data: { email, username, password: await bcrypt.hash(password, 12), role: role || 'VIEWER' },
      select: { id: true, email: true, username: true, role: true, createdAt: true },
    });

    return apiSuccess(user, 201);
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}
