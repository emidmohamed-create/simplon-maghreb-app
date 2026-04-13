import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const rates = await prisma.monthlyPresenceRate.findMany({
    where: { learnerId: params.id },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  return NextResponse.json(rates);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const { year, month, presenceRate } = await req.json();

    if (!year || !month || presenceRate === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const rate = await prisma.monthlyPresenceRate.upsert({
      where: {
        learnerId_year_month: {
          learnerId: params.id,
          year: parseInt(year),
          month: parseInt(month),
        },
      },
      update: { presenceRate: parseFloat(presenceRate) },
      create: {
        learnerId: params.id,
        year: parseInt(year),
        month: parseInt(month),
        presenceRate: parseFloat(presenceRate),
      },
    });

    return NextResponse.json(rate);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const { error } = await requireAuth(ADMIN_ROLES);
    if (error) return error;
  
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
  
    if (!year || !month) {
      return NextResponse.json({ error: 'Missing year or month' }, { status: 400 });
    }
  
    await prisma.monthlyPresenceRate.delete({
      where: {
        learnerId_year_month: {
          learnerId: params.id,
          year: parseInt(year),
          month: parseInt(month),
        },
      },
    });
  
    return NextResponse.json({ success: true });
}
