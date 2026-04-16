import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_ROLES, requireAuth } from '@/lib/rbac';
import { canAccessSourcingSession, canFinalizeSourcingSession } from '@/lib/sourcing-access';
import { computeFinalSourcingScore, decisionToCandidateStage } from '@/lib/sourcing-session';

export async function PUT(req: Request, { params }: { params: { id: string; sessionCandidateId: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  try {
    const body = await req.json();
    const { checkInStatus, timeSlot, groupName, finalDecision, finalComment } = body;

    const existing = await prisma.sourcingSessionCandidate.findFirst({
      where: { id: params.sessionCandidateId, sessionId: params.id },
      include: { evaluations: { where: { status: 'SUBMITTED' }, select: { section: true, score: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Candidat introuvable dans cette session' }, { status: 404 });

    const wantsDecision = finalDecision !== undefined || finalComment !== undefined;
    if (wantsDecision) {
      const canFinalize = await canFinalizeSourcingSession(user, params.id);
      if (!canFinalize) return NextResponse.json({ error: 'Vous ne pouvez pas finaliser cette décision' }, { status: 403 });
    }

    const finalScore = wantsDecision ? computeFinalSourcingScore(existing.evaluations) : existing.finalScore;

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.sourcingSessionCandidate.update({
        where: { id: params.sessionCandidateId },
        data: {
          ...(checkInStatus !== undefined ? { checkInStatus } : {}),
          ...(timeSlot !== undefined ? { timeSlot: timeSlot || null } : {}),
          ...(groupName !== undefined ? { groupName: groupName || null } : {}),
          ...(wantsDecision ? {
            finalScore,
            finalDecision: finalDecision || 'PENDING',
            finalComment: finalComment || null,
            decidedById: user!.id,
            decidedAt: new Date(),
          } : {}),
        },
      });

      if (wantsDecision && finalDecision) {
        await tx.candidate.update({
          where: { id: existing.candidateId },
          data: { currentStage: decisionToCandidateStage(finalDecision) },
        });
      }

      return row;
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string; sessionCandidateId: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  await prisma.sourcingSessionCandidate.delete({ where: { id: params.sessionCandidateId } });
  return NextResponse.json({ ok: true });
}
