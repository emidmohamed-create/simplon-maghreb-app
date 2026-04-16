import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_ROLES, requireAuth } from '@/lib/rbac';
import { canAccessSourcingSession } from '@/lib/sourcing-access';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  try {
    const body = await req.json();
    const candidateIds = Array.isArray(body.candidateIds) ? body.candidateIds.filter(Boolean) : [];
    const timeSlot = body.timeSlot || null;
    const groupName = body.groupName || null;

    if (!candidateIds.length) {
      return NextResponse.json({ error: 'Aucun candidat sélectionné' }, { status: 400 });
    }

    const created = await prisma.$transaction(
      candidateIds.map((candidateId: string) =>
        prisma.sourcingSessionCandidate.upsert({
          where: { sessionId_candidateId: { sessionId: params.id, candidateId } },
          create: {
            sessionId: params.id,
            candidateId,
            timeSlot,
            groupName,
          },
          update: {
            ...(timeSlot ? { timeSlot } : {}),
            ...(groupName ? { groupName } : {}),
          },
        }),
      ),
    );

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
