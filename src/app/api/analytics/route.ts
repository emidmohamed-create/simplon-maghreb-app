import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';
import { format } from 'date-fns';

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

  const totalRecords = allRecords.filter(r => r.status !== 'NOT_APPLICABLE').length;
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
      learnerProfiles: { select: { id: true, statusCurrent: true, manualAbsenceRate: true, attendanceRecords: { select: { status: true } } } },
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

    let totalRecordsCount = 0;
    let manualSum = 0;
    let manualCount = 0;
    let computedSum = 0;
    let computedCount = 0;

    learners.forEach(l => {
        if (l.manualAbsenceRate !== null && l.manualAbsenceRate !== undefined) {
            manualSum += l.manualAbsenceRate;
            manualCount += 1;
        } else {
            const lRecords = l.attendanceRecords?.filter((r: any) => r.status !== 'NOT_APPLICABLE') || [];
            if (lRecords.length > 0) {
               const lAbs = lRecords.filter((r: any) => r.status === 'ABSENT' || r.status === 'JUSTIFIED_ABSENT').length;
               computedSum += (lAbs / lRecords.length) * 100;
               computedCount += 1;
            }
        }
    });

    // Approximate average taking manual and computed into account
    let absRate = 0;
    if (manualCount + computedCount > 0) {
        absRate = Math.round((manualSum + computedSum) / (manualCount + computedCount) * 100) / 100;
    }

    const records = c.attendanceSessions.flatMap(s => s.records);
    const totalR = records.filter(r => r.status !== 'NOT_APPLICABLE').length;
    const abs = records.filter(r => r.status === 'ABSENT' || r.status === 'JUSTIFIED_ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const lateMin = records.reduce((s, r) => s + (r.lateMinutes || 0), 0);

    const now = new Date();
    const start = c.startDate ? new Date(c.startDate) : now;
    const end = c.endDate ? new Date(c.endDate) : now;
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 86400)));
    const elapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 86400)));
    const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));

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
    const totalR = l.attendanceRecords.filter(r => r.status !== 'NOT_APPLICABLE').length;
    const abs = l.attendanceRecords.filter(r => r.status === 'ABSENT' || r.status === 'JUSTIFIED_ABSENT').length;
    const lates = l.attendanceRecords.filter(r => r.status === 'LATE').length;
    const lateMin = l.attendanceRecords.reduce((s, r) => s + (r.lateMinutes || 0), 0);
    const calculatedAbsRate = totalR > 0 ? Math.round((abs / totalR) * 10000) / 100 : 0;
    const absRate = l.manualAbsenceRate !== null ? l.manualAbsenceRate : calculatedAbsRate;
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

  // Monthly attendance trend
  const allSessions = await prisma.attendanceSession.findMany({
      where: cohortId ? { cohortId } : (campusId || programId || projectId ? { cohort: cohortWhere } : undefined),
      include: {
          records: { select: { status: true } }
      },
      orderBy: { date: 'asc' }
  });

  const learnersForTrend = await prisma.learnerProfile.findMany({
      where: learnerWhere,
      include: { monthlyPresenceRates: true }
  });

  const monthlyData: Record<string, { total: number, present: number, manualSum: number, manualCount: number }> = {};
  
  // Aggregate real sessions
  allSessions.forEach(s => {
      const monthKey = format(new Date(s.date), 'MM/yyyy');
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { total: 0, present: 0, manualSum: 0, manualCount: 0 };
      
      const sessionRecords = s.records.filter(r => r.status !== 'NOT_APPLICABLE');
      monthlyData[monthKey].total += sessionRecords.length;
      monthlyData[monthKey].present += sessionRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  });

  // Aggregate manual overrides
  learnersForTrend.forEach(l => {
      l.monthlyPresenceRates.forEach(m => {
          const monthKey = `${m.month.toString().padStart(2, '0')}/${m.year}`;
          if (!monthlyData[monthKey]) monthlyData[monthKey] = { total: 0, present: 0, manualSum: 0, manualCount: 0 };
          monthlyData[monthKey].manualSum += m.presenceRate;
          monthlyData[monthKey].manualCount += 1;
      });
  });

  const attendanceTrend = Object.entries(monthlyData).map(([name, data]) => {
      let rate = 0;
      if (data.manualCount > 0) {
          // If we have manual overrides for this month, they take priority
          // We use simple average of manual rates for now
          rate = data.manualSum / data.manualCount;
      } else {
          rate = data.total > 0 ? (data.present / data.total) * 100 : 100;
      }
      return {
          name,
          presenceRate: Math.round(rate * 100) / 100
      };
  }).sort((a, b) => { // Sort by date MM/YYYY
      const [m1, y1] = a.name.split('/').map(Number);
      const [m2, y2] = b.name.split('/').map(Number);
      return y1 !== y2 ? y1 - y2 : m1 - m2;
  });

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
    attendanceTrend,
    riskLearners: riskData,
  });
}
