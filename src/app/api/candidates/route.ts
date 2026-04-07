import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const campusId = searchParams.get('campusId');
  const stage = searchParams.get('stage');
  const search = searchParams.get('search');

  const where: any = {};
  if (projectId) where.projectId = projectId;
  if (campusId) where.campusId = campusId;
  if (stage) where.currentStage = stage;
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      campus: { select: { name: true } },
      project: { select: { name: true, code: true } },
      evaluations: { select: { id: true, score: true, recommendation: true } },
      learnerProfile: { select: { id: true } },
    },
  });

  return NextResponse.json(candidates);
}

export async function POST(req: Request) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const body = await req.json();
  const { firstName, lastName, email, phone, cin, birthdate, campusId, projectId, sourceChannel, notes } = body;

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: 'Prénom, nom et email requis' }, { status: 400 });
  }

  const candidate = await prisma.candidate.create({
    data: {
      firstName, lastName, email, phone, cin,
      birthdate: birthdate ? new Date(birthdate) : null,
      campusId: campusId || null,
      projectId: projectId || null,
      sourceChannel, notes,
    },
  });

  return NextResponse.json(candidate, { status: 201 });
}
