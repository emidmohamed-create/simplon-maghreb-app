import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET() {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const campuses = await prisma.campus.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { cohorts: true, users: true } },
    },
  });

  return NextResponse.json(campuses);
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  const body = await req.json();
  const { name, city } = body;

  if (!name || !city) {
    return NextResponse.json({ error: 'Nom et ville requis' }, { status: 400 });
  }

  const campus = await prisma.campus.create({
    data: { name, city },
  });

  return NextResponse.json(campus, { status: 201 });
}
