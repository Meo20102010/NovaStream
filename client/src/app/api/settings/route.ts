import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const grouped: Record<string, Record<string, string>> = {};
    for (const s of settings) {
      if (!grouped[s.group]) grouped[s.group] = {};
      grouped[s.group][s.key] = s.value;
    }
    return apiSuccess(grouped);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');
    const settings = await request.json();

    for (const [group, entries] of Object.entries(settings) as [string, Record<string, string>][]) {
      for (const [key, value] of Object.entries(entries)) {
        await prisma.setting.upsert({
          where: { key },
          update: { value, group },
          create: { key, value, group },
        });
      }
    }

    return apiSuccess({ message: 'Settings updated' });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (e.message === 'FORBIDDEN') return apiError('Insufficient permissions', 403);
    return apiError(e.message, 500);
  }
}
