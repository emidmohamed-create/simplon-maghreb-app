import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_ROLES, requireAuth } from '@/lib/rbac';
import { canAccessSourcingSession } from '@/lib/sourcing-access';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  const members = await prisma.sourcingSessionJury.findMany({
    where: { sessionId: params.id },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    orderBy: [{ section: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(members);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  try {
    const body = await req.json();
    const { userId, section, role, canFinalize } = body;
    if (!userId || !section) {
      return NextResponse.json({ error: 'Utilisateur et section requis' }, { status: 400 });
    }

    const member = await prisma.sourcingSessionJury.upsert({
      where: { sessionId_userId_section: { sessionId: params.id, userId, section } },
      create: {
        sessionId: params.id,
        userId,
        section,
        role: role || 'JURY',
        canFinalize: Boolean(canFinalize),
      },
      update: {
        role: role || 'JURY',
        canFinalize: Boolean(canFinalize),
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const allowed = await canAccessSourcingSession(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Accès refusé à cette session' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId');
  if (!memberId) return NextResponse.json({ error: 'Affectation jury requise' }, { status: 400 });

  await prisma.sourcingSessionJury.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
