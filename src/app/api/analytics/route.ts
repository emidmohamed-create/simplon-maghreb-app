import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const campusId = searchParams.get('campusId');
  const programId = searchParams.get('programId');
  const projectId = searchParams.get('projectId');
  const cohortId = searchParams.get('cohortId');

  // Build cohort filter
  const cohortWhere: any = { isActive: true };
  if (cohortId) cohortWhere.id = cohortId;
  if (projectId) cohortWhere.projectId = projectId;
  if (programId) cohortWhere.programId = programId;
  if (campusId) cohortWhere.campusId = campusId;

  // Overview KPIs
  const learnerWhere: any = {};
  if (cohortId || projectId || programId || campusId) {
    learnerWhere.cohort = cohortWhere;
  }

  const totalLearners = await prisma.learnerProfile.count({ where: learnerWhere });
  const activeLearners = await prisma.learnerProfile.count({ where: { ...learnerWhere, statusCurrent: 'IN_TRAINING' } });
  const droppedLearners = await prisma.learnerProfile.count({ where: { ...learnerWhere, statusCurrent: 'DROPPED' } });
  const insertedLearners = await prisma.learnerProfile.count({ where: { ...learnerWhere, statusCurrent: 'INSERTED' } });
  const excludedLearners = await prisma.learnerProfile.count({ where: { ...learnerWhere, statusCurrent: 'EXCLUDED' } });
  
  const activeCohorts = await prisma.cohort.count({ where: { ...cohortWhere, isActive: true } });

  // Attendance stats
  const allRecords = await prisma.attendanceRecord.findMany({
    where: {
      session: cohortId ? { cohortId } : undefined,
      learnerProfile: learnerWhere.cohort ? { cohort: cohortWhere } : undefined,
    },
    select: { status: true, lateMinutes: true },
  });

  const totalRecords = allRecords.length;
  const absences = allRecords.filter(r => r.status === 'ABSENT').length;
  const justified = allRecords.filter(r => r.status === 'JUSTIFIED_ABSENT').length;
  const lates = allRecords.filter(r => r.status === 'LATE').length;
  const totalLateMinutes = allRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);

  const absenceRate = totalRecords > 0 ? Math.round(((absences + justified) / totalRecords) * 10000) / 100 : 0;
  const lateRate = totalRecords > 0 ? Math.round((lates / totalRecords) * 10000) / 100 : 0;

  // Insertion breakdown
  const insertions = await prisma.learnerProfile.groupBy({
    by: ['insertionType'],
    where: { ...learnerWhere, statusCurrent: 'INSERTED', insertionType: { not: null } },
    _count: true,
  });

  // Status by program
  const programs = await prisma.program.findMany({
    where: campusId ? { cohorts: { some: { campusId } } } : undefined,
    select: {
      id: true,
      name: true,
      cohorts: {
        select: {
          learnerProfiles: {
            select: { statusCurrent: true },
          },
        },
      },
    },
  });

  const statusByProgram = programs.map(p => {
    const allLearners = p.cohorts.flatMap(c => c.learnerProfiles);
    return {
      program: p.name,
      IN_TRAINING: allLearners.filter(l => l.statusCurrent === 'IN_TRAINING').length,
      DROPPED: allLearners.filter(l => l.statusCurrent === 'DROPPED').length,
      INSERTED: allLearners.filter(l => l.statusCurrent === 'INSERTED').length,
      EXCLUDED: allLearners.filter(l => l.statusCurrent === 'EXCLUDED').length,
    };
  });

  // Cohorts table
  const cohortsData = await prisma.cohort.findMany({
    where: cohortWhere,
    include: {
      program: true,
      campus: { select: { name: true } },
      project: { select: { name: true, code: true } },
      trainer: { select: { firstName: true, lastName: true } },
      learnerProfiles: { select: { statusCurrent: true } },
      attendanceSessions: {
        include: {
          records: { select: { status: true, lateMinutes: true } },
        },
      },
    },
  });

  const cohortsTable = cohortsData.map(c => {
    const learners = c.learnerProfiles;
    const active = learners.filter(l => l.statusCurrent === 'IN_TRAINING').length;
    const dropped = learners.filter(l => l.statusCurrent === 'DROPPED').length;
    const inserted = learners.filter(l => l.statusCurrent === 'INSERTED').length;
    const excluded = learners.filter(l => l.statusCurrent === 'EXCLUDED').length;

    const records = c.attendanceSessions.flatMap(s => s.records);
    const totalR = records.length;
    const abs = records.filter(r => r.status === 'ABSENT' || r.status === 'JUSTIFIED_ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const lateMin = records.reduce((s, r) => s + (r.lateMinutes || 0), 0);

    const now = new Date();
    const start = c.startDate ? new Date(c.startDate) : now;
    const end = c.endDate ? new Date(c.endDate) : now;
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 86400)));
    const elapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 86400)));
    const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));

    const absRate = totalR > 0 ? Math.round((abs / totalR) * 10000) / 100 : 0;
    const lateRate = totalR > 0 ? Math.round((late / totalR) * 10000) / 100 : 0;

    let status = 'À venir';
    if (c.startDate && now >= new Date(c.startDate)) status = 'En cours';
    if (c.endDate && now > new Date(c.endDate)) status = 'Terminée';

    return {
      id: c.id,
      name: c.name,
      campus: c.campus?.name || '-',
      program: c.program.name,
      project: c.project?.name || '-',
      trainer: c.trainer ? `${c.trainer.firstName} ${c.trainer.lastName}` : '-',
      startDate: c.startDate,
      endDate: c.endDate,
      progress,
      status,
      total: learners.length,
      active,
      dropped,
      inserted,
      excluded,
      absenceRate: absRate,
      absences: abs,
      lateRate,
      lateMinutes: lateMin,
      risk: absRate >= 20 ? 'high' : absRate >= 10 ? 'medium' : 'low',
    };
  });

  // Absence by cohort (for chart)
  const absenceByCohort = cohortsTable
    .map(c => ({ name: c.name, absenceRate: c.absenceRate, absences: c.absences }))
    .sort((a, b) => b.absenceRate - a.absenceRate);

  // Top risk learners
  const riskLearners = await prisma.learnerProfile.findMany({
    where: { ...learnerWhere, statusCurrent: 'IN_TRAINING' },
    include: {
      cohort: { select: { name: true } },
      attendanceRecords: { select: { status: true, lateMinutes: true } },
    },
  });

  const riskData = riskLearners.map(l => {
    const totalR = l.attendanceRecords.length;
    const abs = l.attendanceRecords.filter(r => r.status === 'ABSENT' || r.status === 'JUSTIFIED_ABSENT').length;
    const lates = l.attendanceRecords.filter(r => r.status === 'LATE').length;
    const lateMin = l.attendanceRecords.reduce((s, r) => s + (r.lateMinutes || 0), 0);
    const absRate = totalR > 0 ? Math.round((abs / totalR) * 10000) / 100 : 0;
    return {
      id: l.id,
      name: `${l.firstName} ${l.lastName}`,
      cohort: l.cohort.name,
      absenceRate: absRate,
      absences: abs,
      lates,
      lateMinutes: lateMin,
      risk: absRate >= 20 ? 'high' : absRate >= 10 ? 'medium' : 'low',
    };
  }).sort((a, b) => b.absenceRate - a.absenceRate).slice(0, 10);

  // Candidate funnel
  const totalCandidates = await prisma.candidate.count();
  const qualifiedCandidates = await prisma.candidate.count({ where: { currentStage: { in: ['QUALIFIED', 'CONVERTED'] } } });
  const convertedCandidates = await prisma.candidate.count({ where: { currentStage: 'CONVERTED' } });

  return NextResponse.json({
    overview: {
      totalLearners,
      activeLearners,
      droppedLearners,
      insertedLearners,
      excludedLearners,
      activeCohorts,
      absenceRate,
      lateRate,
      totalLateMinutes,
      totalAbsences: absences + justified,
    },
    funnel: {
      candidates: totalCandidates,
      qualified: qualifiedCandidates,
      inTraining: activeLearners,
      inserted: insertedLearners,
      dropped: droppedLearners,
    },
    statusByProgram,
    insertionTypes: insertions.map(i => ({
      type: i.insertionType,
      count: i._count,
    })),
    cohortsTable,
    absenceByCohort,
    riskLearners: riskData,
  });
}
