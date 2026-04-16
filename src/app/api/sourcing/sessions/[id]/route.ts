import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ADMIN_ROLES, STAFF_ROLES, requireAuth } from '@/lib/rbac';
import { canAccessSourcingSession } from '@/lib/sourcing-access';

const sessionInclude = {
  campus: { select: { id: true, name: true, city: true } },
  project: { select: { id: true, name: true, code: true } },
  cohort: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  juryMembers: {
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    orderBy: [{ section: 'asc' }, { createdAt: 'asc' }],
  },
  candidates: {
    include: {
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          sourceChannel: true,
          currentStage: true,
          academicLevel: true,
          academicField: true,
        },
      },
      decidedBy: { select: { id: true, firstName: true, lastName: true } },
      evaluations: {
        include: { evaluator: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: [{ section: 'asc' }, { updatedAt: 'desc' }],
      },
    },
    orderBy: [{ groupName: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.SourcingSessionInclude;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  const session = await prisma.sourcingSession.findUnique({
    where: { id: params.id },
    include: sessionInclude,
  });

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  return NextResponse.json(session);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  try {
    const body = await req.json();
    const { name, date, location, status, campusId, projectId, cohortId, notes } = body;

    const session = await prisma.sourcingSession.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(date !== undefined ? { date: date ? new Date(date) : null } : {}),
        ...(location !== undefined ? { location: location || null } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(campusId !== undefined ? { campusId: campusId || null } : {}),
        ...(projectId !== undefined ? { projectId: projectId || null } : {}),
        ...(cohortId !== undefined ? { cohortId: cohortId || null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
      include: sessionInclude,
    });

    return NextResponse.json(session);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  await prisma.sourcingSession.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
