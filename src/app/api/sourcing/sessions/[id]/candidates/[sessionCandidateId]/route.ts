import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_ROLES, STAFF_ROLES, requireAuth } from '@/lib/rbac';
import { canAccessSourcingSession, canFinalizeSourcingSession } from '@/lib/sourcing-access';
import { computeFinalSourcingScore, decisionToCandidateStage, normalizeCommitteeKey } from '@/lib/sourcing-session';

export async function PUT(req: Request, { params }: { params: { id: string; sessionCandidateId: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  try {
    const body = await req.json();
    const { checkInStatus, timeSlot, groupName, finalDecision, finalComment, interviewAction, committeeKey } = body;

    const existing = await prisma.sourcingSessionCandidate.findFirst({
      where: { id: params.sessionCandidateId, sessionId: params.id },
      include: { evaluations: { where: { status: 'SUBMITTED' }, select: { section: true, score: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Candidat introuvable dans cette session' }, { status: 404 });

    const isAdminRole = ADMIN_ROLES.includes(user!.role as any);

    if (interviewAction !== undefined) {
      const action = String(interviewAction);
      if (!['START', 'FINISH', 'RELEASE'].includes(action)) {
        return NextResponse.json({ error: 'Action entretien invalide' }, { status: 400 });
      }

      const normalizedCommitteeKey = normalizeCommitteeKey(committeeKey);
      let canUseCommittee = isAdminRole;

      if (!canUseCommittee) {
        const juryMembership = await prisma.sourcingSessionJury.findFirst({
          where: {
            sessionId: params.id,
            userId: user!.id,
            OR: [
              { committeeKey: normalizedCommitteeKey },
              { committeeKey: null },
            ],
          },
          select: { id: true },
        });
        canUseCommittee = Boolean(juryMembership);
      }

      if (!canUseCommittee) {
        return NextResponse.json({ error: 'Vous ne faites pas partie de ce comite' }, { status: 403 });
      }

      const lockedByAnotherCommittee =
        existing.interviewStatus === 'IN_PROGRESS'
        && existing.interviewCommitteeKey
        && existing.interviewCommitteeKey !== normalizedCommitteeKey;

      if (lockedByAnotherCommittee) {
        return NextResponse.json({
          error: `Ce candidat est deja pris par ${existing.interviewCommitteeKey}`,
        }, { status: 409 });
      }

      const now = new Date();
      const updated = await prisma.sourcingSessionCandidate.update({
        where: { id: params.sessionCandidateId },
        data: action === 'START'
          ? {
              checkInStatus: 'PRESENT',
              interviewStatus: 'IN_PROGRESS',
              interviewCommitteeKey: normalizedCommitteeKey,
              interviewStartedById: user!.id,
              interviewStartedAt: existing.interviewStartedAt || now,
              interviewEndedAt: null,
            }
          : action === 'FINISH'
            ? {
                interviewStatus: 'DONE',
                interviewCommitteeKey: normalizedCommitteeKey,
                interviewEndedAt: now,
              }
            : {
                interviewStatus: 'WAITING',
                interviewCommitteeKey: null,
                interviewStartedById: null,
                interviewStartedAt: null,
                interviewEndedAt: null,
              },
      });

      return NextResponse.json(updated);
    }

    const wantsCandidateUpdate = checkInStatus !== undefined || timeSlot !== undefined || groupName !== undefined;
    if (wantsCandidateUpdate && !isAdminRole) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier les informations de convocation' }, { status: 403 });
    }

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
