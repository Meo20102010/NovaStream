import { NextResponse } from 'next/server';

export function serializeBigInt<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export function apiSuccess(data: any, status = 200) {
  return NextResponse.json(serializeBigInt({ success: true, data }), { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export function generateVideoSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'v';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function logActivity(userId: string | null, action: string, resource?: string, details?: string) {
  try {
    const prisma = (await import('./db')).default;
    await prisma.activityLog.create({
      data: { userId, action, resource, details },
    });
  } catch {}
}
