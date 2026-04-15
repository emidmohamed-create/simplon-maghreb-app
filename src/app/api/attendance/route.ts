import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

export async function GET(req: Request) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get('cohortId');
  const date = searchParams.get('date');
  const halfDay = searchParams.get('halfDay');

  if (!cohortId) {
    return NextResponse.json({ error: 'Donn?es incompl?tes' }, { status: 400 });
  }

  const where: any = { cohortId };
  if (date) where.date = new Date(date);
  if (halfDay) where.halfDay = halfDay;

  const sessions = await prisma.attendanceSession.findMany({
    where,
    orderBy: [{ date: 'desc' }, { halfDay: 'asc' }],
    include: {
      records: {
        include: {
          learnerProfile: { select: { id: true, firstName: true, lastName: true, statusCurrent: true } },
        },
        // Return all fields including id, note, lateMinutes
      },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const body = await req.json();
  const { cohortId, date, halfDay, records } = body;

  if (!cohortId || !date || !halfDay || !records?.length) {
    return NextResponse.json({ error: 'Donn?es incompl?tes' }, { status: 400 });
  }

  const allowedStatuses = new Set(['PRESENT', 'ABSENT', 'JUSTIFIED_ABSENT', 'LATE', 'NOT_APPLICABLE']);
  const hasInvalidStatus = records.some((record: any) => !allowedStatuses.has(record?.status));
  if (hasInvalidStatus) {
    return NextResponse.json({ error: 'Statut de présence invalide' }, { status: 400 });
  }

  // Upsert session
  let session = await prisma.attendanceSession.findUnique({
    where: { cohortId_date_halfDay: { cohortId, date: new Date(date), halfDay } },
  });

  if (!session) {
    session = await prisma.attendanceSession.create({
      data: {
        cohortId,
        date: new Date(date),
        halfDay,
        createdById: user!.id,
      },
    });
  }

  // Upsert records
  for (const record of records) {
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        attendanceSessionId_learnerProfileId: {
          attendanceSessionId: session.id,
          learnerProfileId: record.learnerProfileId,
        },
      },
    });

    if (existing) {
      await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          status: record.status,
          lateMinutes: record.lateMinutes || null,
          note: record.note || null,
          recordedById: user!.id,
        },
      });
    } else {
      await prisma.attendanceRecord.create({
        data: {
          attendanceSessionId: session.id,
          learnerProfileId: record.learnerProfileId,
          status: record.status,
          lateMinutes: record.lateMinutes || null,
          note: record.note || null,
          recordedById: user!.id,
        },
      });
    }
  }

  return NextResponse.json({ success: true, sessionId: session.id });
}

