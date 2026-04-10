import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const programs = await prisma.program.findMany({
    orderBy: { name: 'asc' },
    include: {
      project: { select: { name: true, code: true } },
      _count: { select: { cohorts: true } },
    },
  });

  return NextResponse.json(programs);
}

export async function POST(req: Request) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  const body = await req.json();
  const { name, projectId, description } = body;

  if (!name) {
    return NextResponse.json({ error: 'Le nom du programme est requis' }, { status: 400 });
  }

  const program = await prisma.program.create({
    data: { name, projectId: projectId || null, description },
  });

  return NextResponse.json(program, { status: 201 });
}
