import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { roleGuard } from '../middleware/auth';

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get('/api/settings', {
    schema: { tags: ['Settings'], summary: 'Get all settings' },
  }, async () => {
    const settings = await prisma.setting.findMany();
    const grouped: Record<string, Record<string, string>> = {};
    for (const s of settings) {
      if (!grouped[s.group]) grouped[s.group] = {};
      grouped[s.group][s.key] = s.value;
    }
    return { success: true, data: grouped };
  });

  app.put('/api/settings', {
    preHandler: [roleGuard('ADMIN')],
    schema: {
      tags: ['Settings'],
      summary: 'Update settings',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const settings = request.body as Record<string, Record<string, string>>;

    for (const [group, entries] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(entries)) {
        await prisma.setting.upsert({
          where: { key },
          update: { value, group },
          create: { key, value, group },
        });
      }
    }

    return { success: true, data: { message: 'Settings updated' } };
  });

  app.get('/api/settings/:group', {
    schema: { tags: ['Settings'], summary: 'Get settings by group' },
  }, async (request) => {
    const { group } = request.params as { group: string };
    const settings = await prisma.setting.findMany({ where: { group } });
    const mapped: Record<string, string> = {};
    for (const s of settings) mapped[s.key] = s.value;
    return { success: true, data: mapped };
  });
}
