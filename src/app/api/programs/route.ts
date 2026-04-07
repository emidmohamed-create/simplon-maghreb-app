import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const campusId = searchParams.get('campusId');

  const programs = await prisma.program.findMany({
    where: campusId ? { campusId } : undefined,
    orderBy: { name: 'asc' },
    include: {
      campus: { select: { name: true } },
      project: { select: { name: true, code: true } },
      _count: { select: { cohorts: true } },
    },
  });

  return NextResponse.json(programs);
}

export async function POST(req: Request) {
  const { error } = await requireAuth(['SUPER_ADMIN', 'ADMIN_CAMPUS']);
  if (error) return error;

  const body = await req.json();
  const { name, campusId, projectId, description } = body;

  if (!name || !campusId) {
    return NextResponse.json({ error: 'Nom et campus requis' }, { status: 400 });
  }

  const program = await prisma.program.create({
    data: { name, campusId, projectId: projectId || null, description },
  });

  return NextResponse.json(program, { status: 201 });
}
