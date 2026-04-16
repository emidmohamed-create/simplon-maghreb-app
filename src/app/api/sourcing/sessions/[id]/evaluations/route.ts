import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { STAFF_ROLES, requireAuth } from '@/lib/rbac';
import { canAccessSourcingSession, canEvaluateSourcingSection } from '@/lib/sourcing-access';
import {
  computeSectionScore,
  parseSectionCriteria,
  suggestSectionRecommendation,
} from '@/lib/sourcing-session';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  try {
    const body = await req.json();
    const {
      sessionCandidateId,
      section,
      criteriaJson,
      recommendation,
      comment,
      strengths,
      risks,
      needsFollowUp,
      status,
    } = body;

    if (!sessionCandidateId || !section) {
      return NextResponse.json({ error: 'Candidat de session et section requis' }, { status: 400 });
    }

    const canEvaluate = await canEvaluateSourcingSection(user, params.id, section);
    if (!canEvaluate) return NextResponse.json({ error: 'Vous ne pouvez pas évaluer cette section' }, { status: 403 });

    const sessionCandidate = await prisma.sourcingSessionCandidate.findFirst({
      where: { id: sessionCandidateId, sessionId: params.id },
      select: { id: true },
    });
    if (!sessionCandidate) return NextResponse.json({ error: 'Candidat introuvable dans cette session' }, { status: 404 });

    const parsedCriteria = parseSectionCriteria(section, criteriaJson);
    const score = computeSectionScore(section, parsedCriteria);
    const finalRecommendation = recommendation || suggestSectionRecommendation(score);
    const finalStatus = status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT';

    const evaluation = await prisma.sourcingSectionEvaluation.upsert({
      where: {
        sessionCandidateId_evaluatorId_section: {
          sessionCandidateId,
          evaluatorId: user!.id,
          section,
        },
      },
      create: {
        sessionCandidateId,
        evaluatorId: user!.id,
        section,
        status: finalStatus,
        score,
        recommendation: finalRecommendation,
        comment: comment || null,
        strengths: strengths || null,
        risks: risks || null,
        needsFollowUp: needsFollowUp || null,
        criteriaJson: JSON.stringify(parsedCriteria),
        submittedAt: finalStatus === 'SUBMITTED' ? new Date() : null,
      },
      update: {
        status: finalStatus,
        score,
        recommendation: finalRecommendation,
        comment: comment || null,
        strengths: strengths || null,
        risks: risks || null,
        needsFollowUp: needsFollowUp || null,
        criteriaJson: JSON.stringify(parsedCriteria),
        submittedAt: finalStatus === 'SUBMITTED' ? new Date() : null,
      },
      include: { evaluator: { select: { id: true, firstName: true, lastName: true } } },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
