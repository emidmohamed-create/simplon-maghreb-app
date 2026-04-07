import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

// POST — add/update a competency in the session
export async function POST(req: Request, { params }: { params: { id: string; sessionId: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { category, code, name, description, orderIndex } = body;

    const competency = await prisma.juryBlancCompetency.create({
      data: {
        sessionId: params.sessionId,
        category: category || 'TECHNIQUE',
        code: code || 'C?',
        name,
        description: description || null,
        orderIndex: orderIndex ?? 99,
      },
    });

    return NextResponse.json(competency, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
