import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

// PUT — review (approve/reject) a justification request
export async function PUT(req: Request, { params }: { params: { id: string; justId: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { status, reviewComment } = body; // APPROVED | REJECTED

    if (!status) return NextResponse.json({ error: 'status requis' }, { status: 400 });

    const updated = await prisma.absenceJustificationRequest.update({
      where: { id: params.justId },
      data: {
        status,
        reviewComment: reviewComment || null,
        reviewedById: user?.id || null,
        reviewedAt: new Date(),
      },
    });

    // If approved: mark corresponding attendance records as JUSTIFIED_ABSENT
    if (status === 'APPROVED') {
      const req2 = await prisma.absenceJustificationRequest.findUnique({ where: { id: params.justId } });
      if (req2) {
        // Update all ABSENT records in the date range
        await prisma.attendanceRecord.updateMany({
          where: {
            learnerProfileId: params.id,
            status: 'ABSENT',
            session: {
              date: { gte: req2.dateFrom, lte: req2.dateTo },
            },
          },
          data: { status: 'JUSTIFIED_ABSENT' },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a justification request
export async function DELETE(req: Request, { params }: { params: { id: string; justId: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    await prisma.absenceJustificationRequest.delete({ where: { id: params.justId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
