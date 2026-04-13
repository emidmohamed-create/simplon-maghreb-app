import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES, canAccessCohortByScope } from '@/lib/rbac';

// POST — upsert an evaluation cell (learner × competency)
export async function POST(req: Request, { params }: { params: { id: string; sessionId: string } }) {
  const { error, user } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;
  if (user?.role === 'PROJECT_MANAGER') {
    const allowed = await canAccessCohortByScope(user.id, user.role, params.id);
    if (!allowed) return NextResponse.json({ error: 'Acces refuse a cette cohorte' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { learnerProfileId, competencyId, status, comment, projectTitle } = body;

    if (!learnerProfileId || !competencyId) {
      return NextResponse.json({ error: 'learnerProfileId et competencyId requis' }, { status: 400 });
    }

    const evaluation = await prisma.juryBlancEvaluation.upsert({
      where: {
        sessionId_learnerProfileId_competencyId: {
          sessionId: params.sessionId,
          learnerProfileId,
          competencyId,
        },
      },
      update: {
        status: status || undefined,
        comment: comment !== undefined ? (comment || null) : undefined,
        projectTitle: projectTitle !== undefined ? (projectTitle || null) : undefined,
        evaluatedAt: new Date(),
      },
      create: {
        sessionId: params.sessionId,
        learnerProfileId,
        competencyId,
        status: status || 'PENDING',
        comment: comment || null,
        projectTitle: projectTitle || null,
        evaluatedAt: new Date(),
      },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (err: any) {
    console.error('[JURY EVAL UPSERT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST bulk — update all evaluations for a learner (batch row update)
export async function PUT(req: Request, { params }: { params: { id: string; sessionId: string } }) {
  const { error, user } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;
  if (user?.role === 'PROJECT_MANAGER') {
    const allowed = await canAccessCohortByScope(user.id, user.role, params.id);
    if (!allowed) return NextResponse.json({ error: 'Acces refuse a cette cohorte' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { learnerProfileId, projectTitle, evaluations } = body;
    // evaluations: [{competencyId, status, comment}]

    await Promise.all(evaluations.map((ev: any) =>
      prisma.juryBlancEvaluation.upsert({
        where: {
          sessionId_learnerProfileId_competencyId: {
            sessionId: params.sessionId, learnerProfileId, competencyId: ev.competencyId,
          },
        },
        update: { status: ev.status, comment: ev.comment || null, projectTitle: projectTitle || null, evaluatedAt: new Date() },
        create: { sessionId: params.sessionId, learnerProfileId, competencyId: ev.competencyId, status: ev.status, comment: ev.comment || null, projectTitle: projectTitle || null, evaluatedAt: new Date() },
      })
    ));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
