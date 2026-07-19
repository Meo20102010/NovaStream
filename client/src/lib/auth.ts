import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'novastream-dev-secret-change-in-production-32chars');

export interface JWTPayload {
  id: string;
  role: string;
  email: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getUser(request: NextRequest): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  const tokenCookie = request.cookies.get('token')?.value;

  if (apiKey) {
    const prisma = (await import('./db')).default;
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey, isActive: true },
      include: { user: true },
    });
    if (!key || (key.expiresAt && key.expiresAt < new Date())) return null;
    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsed: new Date() } });
    return { id: key.user.id, role: key.user.role, email: key.user.email };
  }

  let token: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (tokenCookie) {
    token = tokenCookie;
  }

  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(request: NextRequest) {
  const user = await getUser(request);
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function requireRole(request: NextRequest, ...roles: string[]) {
  const user = await requireAuth(request);
  if (!roles.includes(user.role)) throw new Error('FORBIDDEN');
  return user;
}
