import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

// POST /api/candidates/[id]/evaluate — create/update sourcing evaluation
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { score, recommendation, comment, criteriaJson, evaluationDate } = body;

    // Resolve evaluator
    let evaluatorId = user?.id;
    if (!evaluatorId) {
      const fallback = await prisma.user.findFirst();
      evaluatorId = fallback?.id || '';
    }
    if (!evaluatorId) return NextResponse.json({ error: 'Aucun utilisateur' }, { status: 500 });

    // Update candidate stage to EVALUATED
    await prisma.candidate.update({
      where: { id: params.id },
      data: { currentStage: recommendation === 'REJECTED' ? 'REJECTED' : 'EVALUATED' },
    });

    const evaluation = await prisma.sourcingEvaluation.create({
      data: {
        candidateId: params.id,
        evaluatorId,
        evaluationDate: evaluationDate ? new Date(evaluationDate) : new Date(),
        score: score ? parseFloat(score) : null,
        recommendation: recommendation || null,
        comment: comment || null,
        criteriaJson: criteriaJson ? (typeof criteriaJson === 'string' ? criteriaJson : JSON.stringify(criteriaJson)) : null,
      },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
