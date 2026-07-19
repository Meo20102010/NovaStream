import type { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma';

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    const apiKey = request.headers['x-api-key'] as string;

    if (apiKey) {
      const key = await prisma.apiKey.findUnique({
        where: { key: apiKey, isActive: true },
        include: { user: true },
      });

      if (!key || (key.expiresAt && key.expiresAt < new Date())) {
        return reply.status(401).send({ success: false, error: { message: 'Invalid API key' } });
      }

      await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsed: new Date() },
      });

      request.user = { id: key.user.id, role: key.user.role, email: key.user.email };
      return;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, error: { message: 'Authentication required' } });
    }

    const token = authHeader.substring(7);
    const decoded = request.server.jwt.verify<{ id: string; role: string; email: string }>(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id, isActive: true },
    });

    if (!user) {
      return reply.status(401).send({ success: false, error: { message: 'User not found or inactive' } });
    }

    request.user = { id: user.id, role: user.role, email: user.email };
  } catch (err) {
    return reply.status(401).send({ success: false, error: { message: 'Invalid token' } });
  }
}

export function roleGuard(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authGuard(request, reply);
    if (reply.sent) return;

    const user = request.user as { role: string };
    if (!roles.includes(user.role)) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }
  };
}
