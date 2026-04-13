import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES, canAccessCohortByScope } from '@/lib/rbac';

// PUT — update a competency
export async function PUT(req: Request, { params }: { params: { id: string; sessionId: string; compId: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;
  if (user?.role === 'PROJECT_MANAGER') {
    const allowed = await canAccessCohortByScope(user.id, user.role, params.id);
    if (!allowed) return NextResponse.json({ error: 'Acces refuse a cette cohorte' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const comp = await prisma.juryBlancCompetency.update({
      where: { id: params.compId },
      data: {
        category: body.category || undefined,
        code: body.code || undefined,
        name: body.name || undefined,
        description: body.description !== undefined ? (body.description || null) : undefined,
        orderIndex: body.orderIndex !== undefined ? body.orderIndex : undefined,
      },
    });
    return NextResponse.json(comp);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a competency
export async function DELETE(req: Request, { params }: { params: { id: string; sessionId: string; compId: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;
  if (user?.role === 'PROJECT_MANAGER') {
    const allowed = await canAccessCohortByScope(user.id, user.role, params.id);
    if (!allowed) return NextResponse.json({ error: 'Acces refuse a cette cohorte' }, { status: 403 });
  }

  try {
    await prisma.juryBlancCompetency.delete({ where: { id: params.compId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
