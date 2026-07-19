import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { signToken } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json();
    if (!email || !username || !password) return apiError('Missing required fields');
    if (password.length < 8) return apiError('Password must be at least 8 characters');

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) return apiError('Email or username already exists', 409);

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword, role: 'VIEWER' },
    });

    const token = await signToken({ id: user.id, role: user.role, email: user.email });

    return apiSuccess({
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
      token,
    }, 201);
  } catch (e: any) {
    return apiError(e.message || 'Registration failed', 500);
  }
}
