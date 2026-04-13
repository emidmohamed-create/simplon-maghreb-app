import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function POST(req: Request) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const { learnerIds, cohortId } = await req.json();

    if (!learnerIds || !Array.isArray(learnerIds) || !cohortId) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Bulk update cohortId for selected learners
    const result = await prisma.learnerProfile.updateMany({
      where: {
        id: { in: learnerIds },
      },
      data: {
        cohortId,
      },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
