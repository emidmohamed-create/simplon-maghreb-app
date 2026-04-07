import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

// POST — add a phase to the fil rouge project
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { filRougeProjectId, name, description, deadline, isOptional, orderIndex } = body;

    const phase = await prisma.filRougePhase.create({
      data: {
        filRougeProjectId,
        name,
        description: description || null,
        deadline: deadline ? new Date(deadline) : null,
        isOptional: isOptional || false,
        orderIndex: orderIndex ?? 99,
      },
    });

    return NextResponse.json(phase, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
