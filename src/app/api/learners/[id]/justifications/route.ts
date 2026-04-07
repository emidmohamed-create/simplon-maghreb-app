import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

// GET — list justification requests for a learner
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const requests = await prisma.absenceJustificationRequest.findMany({
    where: { learnerProfileId: params.id },
    include: {
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      attachments: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  return NextResponse.json(requests);
}

// POST — create a justification request (admin creating on behalf of learner)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { cohortId, dateFrom, halfDayFrom, dateTo, halfDayTo, reasonType, description } = body;

    if (!cohortId || !dateFrom || !dateTo || !reasonType) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const request = await prisma.absenceJustificationRequest.create({
      data: {
        learnerProfileId: params.id,
        cohortId,
        dateFrom: new Date(dateFrom),
        halfDayFrom: halfDayFrom || 'AM',
        dateTo: new Date(dateTo),
        halfDayTo: halfDayTo || 'PM',
        reasonType,
        description: description || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
