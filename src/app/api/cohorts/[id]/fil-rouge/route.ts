import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

// GET /api/cohorts/[id]/fil-rouge — get the fil rouge project + full matrix data
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  const cohortId = params.id;

  // Get fil rouge project with phases
  const filRouge = await prisma.filRougeProject.findUnique({
    where: { cohortId },
    include: {
      phases: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  // Get all learners in this cohort
  const learners = await prisma.learnerProfile.findMany({
    where: { cohortId },
    orderBy: { lastName: 'asc' },
    select: { id: true, firstName: true, lastName: true, statusCurrent: true },
  });

  if (!filRouge) {
    return NextResponse.json({ filRouge: null, learners, submissions: [] });
  }

  // Get all submissions for this cohort
  const phaseIds = filRouge.phases.map(p => p.id);
  const learnerIds = learners.map(l => l.id);

  const submissions = await prisma.filRougeSubmission.findMany({
    where: {
      phaseId: { in: phaseIds },
      learnerProfileId: { in: learnerIds },
    },
    include: {
      validatedBy: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ filRouge, learners, submissions });
}

// POST /api/cohorts/[id]/fil-rouge — create a new fil rouge project
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, description, assignedAt, defenseDate, phases } = body;

    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

    const filRouge = await prisma.filRougeProject.create({
      data: {
        cohortId: params.id,
        name,
        description: description || null,
        assignedAt: assignedAt ? new Date(assignedAt) : null,
        defenseDate: defenseDate ? new Date(defenseDate) : null,
        phases: {
          create: (phases || []).map((p: any, i: number) => ({
            name: p.name,
            description: p.description || null,
            deadline: p.deadline ? new Date(p.deadline) : null,
            orderIndex: i,
            isOptional: p.isOptional || false,
          })),
        },
      },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });

    return NextResponse.json(filRouge, { status: 201 });
  } catch (err: any) {
    console.error('[FIL ROUGE CREATE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/cohorts/[id]/fil-rouge — update project settings
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, description, assignedAt, defenseDate } = body;

    const filRouge = await prisma.filRougeProject.update({
      where: { cohortId: params.id },
      data: {
        name: name || undefined,
        description: description || null,
        assignedAt: assignedAt ? new Date(assignedAt) : null,
        defenseDate: defenseDate ? new Date(defenseDate) : null,
      },
    });

    return NextResponse.json(filRouge);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
