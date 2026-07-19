import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      body: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3 },
          password: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (request, reply) => {
    const input = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
    });

    if (existingUser) {
      return reply.status(409).send({ success: false, error: { message: 'Email or username already exists' } });
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        password: hashedPassword,
        role: 'VIEWER',
      },
    });

    const token = app.jwt.sign({ id: user.id, role: user.role, email: user.email });

    return reply.status(201).send({
      success: true,
      data: {
        user: { id: user.id, email: user.email, username: user.username, role: user.role },
        token,
      },
    });
  });

  app.post('/api/auth/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const input = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !await bcrypt.compare(input.password, user.password)) {
      return reply.status(401).send({ success: false, error: { message: 'Invalid credentials' } });
    }

    if (!user.isActive) {
      return reply.status(403).send({ success: false, error: { message: 'Account is disabled' } });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const token = app.jwt.sign({ id: user.id, role: user.role, email: user.email });

    return {
      success: true,
      data: {
        user: { id: user.id, email: user.email, username: user.username, role: user.role },
        token,
      },
    };
  });

  app.get('/api/auth/me', {
    preHandler: [authGuard],
    schema: {
      tags: ['Auth'],
      summary: 'Get current user',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const { id } = request.user as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true, role: true, avatar: true, createdAt: true },
    });
    return { success: true, data: user };
  });

  app.post('/api/auth/change-password', {
    preHandler: [authGuard],
    schema: {
      tags: ['Auth'],
      summary: 'Change password',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.user as { id: string };
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !await bcrypt.compare(currentPassword, user.password)) {
      return reply.status(401).send({ success: false, error: { message: 'Current password is incorrect' } });
    }

    await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(newPassword, 12) },
    });

    return { success: true, data: { message: 'Password changed successfully' } };
  });
}
