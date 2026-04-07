import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

// GET /api/cohorts/[id]/jury-blanc/[sessionId] — full grid data
export async function GET(req: Request, { params }: { params: { id: string; sessionId: string } }) {
  const { error } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  const [session, learners, evaluations, learnerRecords] = await Promise.all([
    prisma.juryBlancSession.findUnique({
      where: { id: params.sessionId },
      include: {
        competencies: { orderBy: [{ category: 'asc' }, { orderIndex: 'asc' }] },
      },
    }),
    prisma.learnerProfile.findMany({
      where: { cohortId: params.id, statusCurrent: { not: 'DROPPED' } },
      orderBy: { lastName: 'asc' },
      select: { id: true, firstName: true, lastName: true, statusCurrent: true },
    }),
    prisma.juryBlancEvaluation.findMany({
      where: { sessionId: params.sessionId },
    }),
    prisma.juryBlancLearnerRecord.findMany({
      where: { sessionId: params.sessionId },
    }),
  ]);

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });

  return NextResponse.json({ session, learners, evaluations, learnerRecords });
}

// PUT /api/cohorts/[id]/jury-blanc/[sessionId] — update session settings
export async function PUT(req: Request, { params }: { params: { id: string; sessionId: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, date, description, isLocked } = body;

    const session = await prisma.juryBlancSession.update({
      where: { id: params.sessionId },
      data: {
        name: name || undefined,
        date: date !== undefined ? (date ? new Date(date) : null) : undefined,
        description: description !== undefined ? (description || null) : undefined,
        isLocked: isLocked !== undefined ? isLocked : undefined,
      },
    });

    return NextResponse.json(session);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/cohorts/[id]/jury-blanc/[sessionId] — delete session
export async function DELETE(req: Request, { params }: { params: { id: string; sessionId: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    await prisma.juryBlancSession.delete({ where: { id: params.sessionId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
