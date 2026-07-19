import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { roleGuard, authGuard } from '../middleware/auth';
import { serializeBigInt } from '../utils/serialize';
import bcrypt from 'bcryptjs';
import os from 'os';

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/api/admin/dashboard', {
    preHandler: [roleGuard('ADMIN', 'MODERATOR')],
    schema: {
      tags: ['Admin'],
      summary: 'Get dashboard stats',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const [totalVideos, totalUsers, totalViews, recentVideos, popularVideos, storageStats] = await Promise.all([
      prisma.video.count({ where: { status: 'READY' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.video.aggregate({ _sum: { views: true }, where: { status: 'READY' } }),
      prisma.video.findMany({ orderBy: { createdAt: 'desc' }, take: 5, where: { status: 'READY' } }),
      prisma.video.findMany({ orderBy: { views: 'desc' }, take: 5, where: { status: 'READY' } }),
      prisma.video.aggregate({ _sum: { size: true }, where: { status: 'READY' } }),
    ]);

    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total);
    }, 0) / cpus.length;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return serializeBigInt({
      success: true,
      data: {
        totalVideos,
        totalUsers,
        totalViews: totalViews._sum.views || 0,
        totalStorage: Number(storageStats._sum.size || 0),
        totalUrls: totalVideos,
        cpu: Math.round(cpuUsage * 100),
        ram: Math.round(((totalMem - freeMem) / totalMem) * 100),
        disk: 0,
        bandwidth: 0,
        activeUsers: totalUsers,
        serverStatus: 'online',
        recentVideos,
        popularVideos,
      },
    });
  });

  app.get('/api/admin/users', {
    preHandler: [roleGuard('ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'List all users',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const { page = '1', limit = '20' } = request.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, email: true, username: true, role: true, isActive: true, lastLogin: true, createdAt: true },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return {
      success: true,
      data: {
        users,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
      },
    };
  });

  app.post('/api/admin/users', {
    preHandler: [roleGuard('ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'Create user',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { email, username, password, role } = request.body as any;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return reply.status(409).send({ success: false, error: { message: 'User already exists' } });
    }

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: await bcrypt.hash(password, 12),
        role: role || 'VIEWER',
      },
      select: { id: true, email: true, username: true, role: true, createdAt: true },
    });

    return { success: true, data: user };
  });

  app.patch('/api/admin/users/:id', {
    preHandler: [roleGuard('ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'Update user',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role, isActive } = request.body as any;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ success: false, error: { message: 'User not found' } });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { ...(role && { role }), ...(isActive !== undefined && { isActive }) },
      select: { id: true, email: true, username: true, role: true, isActive: true },
    });

    return { success: true, data: updated };
  });

  app.delete('/api/admin/users/:id', {
    preHandler: [roleGuard('ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'Delete user',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ success: false, error: { message: 'User not found' } });
    }
    await prisma.user.delete({ where: { id } });
    return { success: true, data: { message: 'User deleted' } };
  });

  app.get('/api/admin/logs', {
    preHandler: [roleGuard('ADMIN', 'MODERATOR')],
    schema: {
      tags: ['Admin'],
      summary: 'Get activity logs',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const { page = '1', limit = '50', action } = request.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = action ? { action } : {};
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { user: { select: { username: true, email: true } } },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        logs,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
      },
    };
  });

  app.get('/api/admin/api-keys', {
    preHandler: [roleGuard('ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'List API keys',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const keys = await prisma.apiKey.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: keys };
  });

  app.post('/api/admin/api-keys', {
    preHandler: [roleGuard('ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'Create API key',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const { id: userId } = request.user as { id: string };
    const { name, expiresAt } = request.body as any;
    const { v4: uuidv4 } = await import('uuid');
    const key = `ns_${uuidv4().replace(/-/g, '')}`;

    const apiKey = await prisma.apiKey.create({
      data: { name, key, userId, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });

    return { success: true, data: apiKey };
  });

  app.delete('/api/admin/api-keys/:id', {
    preHandler: [roleGuard('ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'Delete API key',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key) {
      return reply.status(404).send({ success: false, error: { message: 'API key not found' } });
    }
    await prisma.apiKey.delete({ where: { id } });
    return { success: true, data: { message: 'API key deleted' } };
  });

  app.get('/api/admin/stats/system', {
    preHandler: [roleGuard('ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'Get system stats',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return acc + ((total - cpu.times.idle) / total);
    }, 0) / cpus.length;

    return {
      success: true,
      data: {
        cpu: Math.round(cpuUsage * 100),
        ram: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
        },
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        hostname: os.hostname(),
        loadAvg: os.loadavg(),
      },
    };
  });
}
