import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES, canAccessCohortByScope } from '@/lib/rbac';

// PUT — update a single phase (name, deadline, etc.)
export async function PUT(req: Request, { params }: { params: { id: string; phaseId: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;
  if (user?.role === 'PROJECT_MANAGER') {
    const allowed = await canAccessCohortByScope(user.id, user.role, params.id);
    if (!allowed) return NextResponse.json({ error: 'Acces refuse a cette cohorte' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, deadline, isOptional, orderIndex } = body;

    const phase = await prisma.filRougePhase.update({
      where: { id: params.phaseId },
      data: {
        name: name || undefined,
        description: description !== undefined ? (description || null) : undefined,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
        isOptional: isOptional !== undefined ? isOptional : undefined,
        orderIndex: orderIndex !== undefined ? orderIndex : undefined,
      },
    });

    return NextResponse.json(phase);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a phase
export async function DELETE(req: Request, { params }: { params: { id: string; phaseId: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;
  if (user?.role === 'PROJECT_MANAGER') {
    const allowed = await canAccessCohortByScope(user.id, user.role, params.id);
    if (!allowed) return NextResponse.json({ error: 'Acces refuse a cette cohorte' }, { status: 403 });
  }

  try {
    await prisma.filRougePhase.delete({ where: { id: params.phaseId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
