import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

// GET /api/cohorts/[id]/jury-blanc — list all sessions for this cohort
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  const sessions = await prisma.juryBlancSession.findMany({
    where: { cohortId: params.id },
    include: {
      competencies: { orderBy: [{ category: 'asc' }, { orderIndex: 'asc' }] },
      _count: { select: { evaluations: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(sessions);
}

// POST /api/cohorts/[id]/jury-blanc — create a session
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, date, description, competencies } = body;

    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

    const session = await prisma.juryBlancSession.create({
      data: {
        cohortId: params.id,
        name,
        date: date ? new Date(date) : null,
        description: description || null,
        competencies: {
          create: (competencies || []).map((c: any, i: number) => ({
            category: c.category || 'TECHNIQUE',
            code: c.code,
            name: c.name,
            description: c.description || null,
            orderIndex: i,
          })),
        },
      },
      include: {
        competencies: { orderBy: [{ category: 'asc' }, { orderIndex: 'asc' }] },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err: any) {
    console.error('[JURY BLANC CREATE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
