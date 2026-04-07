import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

// GET /api/learners/[id]/meetings — list all meetings for this learner
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const meetings = await prisma.learnerMeeting.findMany({
    where: { learnerProfileId: params.id },
    include: {
      organizedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(meetings);
}

// POST /api/learners/[id]/meetings — create a new meeting record
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { type, title, date, notes, outcome, isPrivate } = body;

    if (!title || !date) {
      return NextResponse.json({ error: 'Titre et date requis' }, { status: 400 });
    }

    const meeting = await prisma.learnerMeeting.create({
      data: {
        learnerProfileId: params.id,
        organizedById: user?.id || null,
        type: type || 'SUIVI',
        title,
        date: new Date(date),
        notes: notes || null,
        outcome: outcome || null,
        isPrivate: isPrivate || false,
      },
      include: {
        organizedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (err: any) {
    console.error('[LEARNER MEETING CREATE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
