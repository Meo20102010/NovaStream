import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { signToken } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return apiError('Missing email or password');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return apiError('Invalid credentials', 401);
    }
    if (!user.isActive) return apiError('Account is disabled', 403);

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    const token = await signToken({ id: user.id, role: user.role, email: user.email });

    return apiSuccess({
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
      token,
    });
  } catch (e: any) {
    return apiError(e.message || 'Login failed', 500);
  }
}
