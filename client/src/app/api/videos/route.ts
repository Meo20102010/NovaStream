import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { apiSuccess, apiError, serializeBigInt } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';
    const status = searchParams.get('status') || 'READY';

    const skip = (page - 1) * limit;
    const where: any = { status };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({ where, orderBy: { [sort]: order }, skip, take: limit }),
      prisma.video.count({ where }),
    ]);

    return apiSuccess({
      videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
