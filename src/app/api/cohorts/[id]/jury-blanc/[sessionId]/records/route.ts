import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES, canAccessCohortByScope } from '@/lib/rbac';

// POST — upsert learner summary record (comment, levels, project scores)
export async function POST(req: Request, { params }: { params: { id: string; sessionId: string } }) {
  const { error, user } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;
  if (user?.role === 'PROJECT_MANAGER') {
    const allowed = await canAccessCohortByScope(user.id, user.role, params.id);
    if (!allowed) return NextResponse.json({ error: 'Acces refuse a cette cohorte' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { learnerProfileId, generalComment, juryLevel, trainerLevel, projectClarity, projectImpl, projectExplain } = body;

    if (!learnerProfileId) return NextResponse.json({ error: 'learnerProfileId requis' }, { status: 400 });

    const record = await prisma.juryBlancLearnerRecord.upsert({
      where: { sessionId_learnerProfileId: { sessionId: params.sessionId, learnerProfileId } },
      update: {
        generalComment: generalComment !== undefined ? (generalComment || null) : undefined,
        juryLevel: juryLevel !== undefined ? (juryLevel || null) : undefined,
        trainerLevel: trainerLevel !== undefined ? (trainerLevel || null) : undefined,
        projectClarity: projectClarity !== undefined ? (projectClarity || null) : undefined,
        projectImpl: projectImpl !== undefined ? (projectImpl || null) : undefined,
        projectExplain: projectExplain !== undefined ? (projectExplain || null) : undefined,
      },
      create: {
        sessionId: params.sessionId,
        learnerProfileId,
        generalComment: generalComment || null,
        juryLevel: juryLevel || null,
        trainerLevel: trainerLevel || null,
        projectClarity: projectClarity || null,
        projectImpl: projectImpl || null,
        projectExplain: projectExplain || null,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err: any) {
    console.error('[JURY LEARNER RECORD]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
