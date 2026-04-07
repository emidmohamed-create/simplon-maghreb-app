import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  const cohortId = params.id;

  const learners = await prisma.learnerProfile.findMany({
    where: { cohortId },
    orderBy: { lastName: 'asc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      academicLevel: true,
      academicField: true,
      statusCurrent: true,
      insertionType: true,
      insertionCompany: true,
      insertionDate: true,
    },
  });

  // Compute stats
  const total = learners.length;
  const inserted = learners.filter(l => l.statusCurrent === 'INSERTED').length;
  const notInserted = total - inserted;
  const insertionRate = total > 0 ? ((inserted / total) * 100).toFixed(2) : '0.00';

  // By insertion type
  const byType: Record<string, number> = {};
  for (const l of learners) {
    const t = l.insertionType || 'ACTIVE_SEARCH';
    byType[t] = (byType[t] || 0) + 1;
  }

  // By academic level
  const byLevel: Record<string, { total: number; inserted: number }> = {};
  for (const l of learners) {
    const lvl = l.academicLevel || 'Non renseigné';
    if (!byLevel[lvl]) byLevel[lvl] = { total: 0, inserted: 0 };
    byLevel[lvl].total++;
    if (l.statusCurrent === 'INSERTED') byLevel[lvl].inserted++;
  }

  // By academic field
  const byField: Record<string, { total: number; inserted: number }> = {};
  for (const l of learners) {
    const field = l.academicField || 'Non renseigné';
    if (!byField[field]) byField[field] = { total: 0, inserted: 0 };
    byField[field].total++;
    if (l.statusCurrent === 'INSERTED') byField[field].inserted++;
  }

  // By gender
  const byGender: Record<string, { total: number; inserted: number }> = {};
  for (const l of learners) {
    const g = l.gender || 'Non renseigné';
    if (!byGender[g]) byGender[g] = { total: 0, inserted: 0 };
    byGender[g].total++;
    if (l.statusCurrent === 'INSERTED') byGender[g].inserted++;
  }

  // By type and level (stacked chart)
  const byTypeAndLevel: Record<string, Record<string, number>> = {};
  for (const l of learners) {
    const lvl = l.academicLevel || 'Non renseigné';
    const t = l.insertionType || 'ACTIVE_SEARCH';
    if (!byTypeAndLevel[lvl]) byTypeAndLevel[lvl] = {};
    byTypeAndLevel[lvl][t] = (byTypeAndLevel[lvl][t] || 0) + 1;
  }

  return NextResponse.json({
    stats: { total, inserted, notInserted, insertionRate },
    byType,
    byLevel,
    byField,
    byGender,
    byTypeAndLevel,
    learners,
  });
}
