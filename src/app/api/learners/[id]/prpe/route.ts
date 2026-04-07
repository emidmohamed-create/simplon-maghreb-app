import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

// GET — list PRPE cases for a learner
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const cases = await prisma.pRPECase.findMany({
    where: { learnerProfileId: params.id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      learnerProfile: {
        select: {
          firstName: true, lastName: true,
          cohort: { select: { name: true, program: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(cases);
}

// POST — create a PRPE case
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { caseType, startDate, endDate, triggerAbsenceDays, triggerNotes, step0Notes } = body;

    const prpeCase = await prisma.pRPECase.create({
      data: {
        learnerProfileId: params.id,
        createdById: user?.id || null,
        caseType: caseType || 'A',
        status: 'DRAFT',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        triggerAbsenceDays: triggerAbsenceDays || 0,
        triggerNotes: triggerNotes || null,
        step0Notes: step0Notes || null,
        step0PreparedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(prpeCase, { status: 201 });
  } catch (err: any) {
    console.error('[PRPE CREATE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
