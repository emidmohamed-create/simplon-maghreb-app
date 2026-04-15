import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';
import {
  computeSourcingScore,
  parseSourcingCriteria,
  recommendationToStage,
  resolveSourcingRecommendation,
} from '@/lib/candidate-sourcing';

// POST /api/candidates/[id]/evaluate — create/update sourcing evaluation
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { score, recommendation, comment, criteriaJson, evaluationDate } = body;
    const parsedCriteria = parseSourcingCriteria(criteriaJson);
    const numericScore = score === null || score === undefined || score === '' ? Number.NaN : Number(score);
    const finalScore = Number.isFinite(numericScore) ? numericScore : computeSourcingScore(parsedCriteria);
    const finalRecommendation = resolveSourcingRecommendation(recommendation, finalScore);

    // Resolve evaluator
    let evaluatorId = user?.id;
    if (!evaluatorId) {
      const fallback = await prisma.user.findFirst();
      evaluatorId = fallback?.id || '';
    }
    if (!evaluatorId) return NextResponse.json({ error: 'Aucun utilisateur' }, { status: 500 });

    const evaluation = await prisma.$transaction(async (tx) => {
      await tx.candidate.update({
        where: { id: params.id },
        data: { currentStage: recommendationToStage(finalRecommendation) },
      });

      return tx.sourcingEvaluation.create({
        data: {
          candidateId: params.id,
          evaluatorId,
          evaluationDate: evaluationDate ? new Date(evaluationDate) : new Date(),
          score: finalScore,
          recommendation: finalRecommendation,
          comment: comment || null,
          criteriaJson: JSON.stringify(parsedCriteria),
        },
      });
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
