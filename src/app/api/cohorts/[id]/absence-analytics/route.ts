import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

function getWeekKey(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 10000) / 100;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  const cohort = await prisma.cohort.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      learnerProfiles: {
        select: { id: true, firstName: true, lastName: true, statusCurrent: true },
      },
      attendanceSessions: {
        orderBy: [{ date: 'asc' }, { halfDay: 'asc' }],
        select: {
          id: true,
          date: true,
          halfDay: true,
          records: {
            select: {
              learnerProfileId: true,
              status: true,
              lateMinutes: true,
            },
          },
        },
      },
    },
  });

  if (!cohort) {
    return NextResponse.json({ error: 'Cohorte introuvable' }, { status: 404 });
  }

  const learnerStats = new Map<string, {
    learnerId: string;
    name: string;
    statusCurrent: string;
    counted: number;
    absent: number;
    justified: number;
    unjustified: number;
    late: number;
    na: number;
    lateMinutes: number;
    consecutiveAbsences: number;
  }>();

  cohort.learnerProfiles.forEach(l => {
    learnerStats.set(l.id, {
      learnerId: l.id,
      name: `${l.firstName} ${l.lastName}`,
      statusCurrent: l.statusCurrent,
      counted: 0,
      absent: 0,
      justified: 0,
      unjustified: 0,
      late: 0,
      na: 0,
      lateMinutes: 0,
      consecutiveAbsences: 0,
    });
  });

  let totalRecords = 0;
  let countedRecords = 0;
  let naRecords = 0;
  let absentRecords = 0;
  let justifiedRecords = 0;
  let unjustifiedRecords = 0;
  let lateRecords = 0;
  let totalLateMinutes = 0;

  const weekly = new Map<string, { key: string; sessions: number; counted: number; absent: number; unjustified: number; justified: number; late: number; na: number }>();

  for (const s of cohort.attendanceSessions) {
    const weekKey = getWeekKey(new Date(s.date));
    if (!weekly.has(weekKey)) {
      weekly.set(weekKey, { key: weekKey, sessions: 0, counted: 0, absent: 0, unjustified: 0, justified: 0, late: 0, na: 0 });
    }
    weekly.get(weekKey)!.sessions += 1;

    for (const r of s.records) {
      totalRecords += 1;
      const l = learnerStats.get(r.learnerProfileId);
      if (!l) continue;

      if (r.status === 'NOT_APPLICABLE') {
        naRecords += 1;
        l.na += 1;
        weekly.get(weekKey)!.na += 1;
        continue;
      }

      countedRecords += 1;
      l.counted += 1;
      weekly.get(weekKey)!.counted += 1;

      if (r.status === 'ABSENT') {
        absentRecords += 1;
        unjustifiedRecords += 1;
        l.absent += 1;
        l.unjustified += 1;
        weekly.get(weekKey)!.absent += 1;
        weekly.get(weekKey)!.unjustified += 1;
      } else if (r.status === 'JUSTIFIED_ABSENT') {
        absentRecords += 1;
        justifiedRecords += 1;
        l.absent += 1;
        l.justified += 1;
        weekly.get(weekKey)!.absent += 1;
        weekly.get(weekKey)!.justified += 1;
      } else if (r.status === 'LATE') {
        lateRecords += 1;
        l.late += 1;
        weekly.get(weekKey)!.late += 1;
      }

      totalLateMinutes += r.lateMinutes || 0;
      l.lateMinutes += r.lateMinutes || 0;
    }
  }

  // Consecutive absences from most recent sessions (ignores N/A).
  const reversedSessions = [...cohort.attendanceSessions].reverse();
  for (const [learnerId, stat] of Array.from(learnerStats.entries())) {
    let streak = 0;
    for (const s of reversedSessions) {
      const rec = s.records.find(r => r.learnerProfileId === learnerId);
      if (!rec || rec.status === 'NOT_APPLICABLE') continue;
      if (rec.status === 'ABSENT' || rec.status === 'JUSTIFIED_ABSENT') {
        streak += 1;
      } else {
        break;
      }
    }
    stat.consecutiveAbsences = streak;
  }

  const learners = Array.from(learnerStats.values()).map((l) => {
    const absenceRate = pct(l.absent, l.counted);
    const unjustifiedRate = pct(l.unjustified, l.counted);
    const riskScore = (absenceRate * 0.7) + (l.consecutiveAbsences * 8) + (unjustifiedRate * 0.3);
    let risk: 'low' | 'medium' | 'high' = 'low';
    if (absenceRate >= 20 || l.consecutiveAbsences >= 3) risk = 'high';
    else if (absenceRate >= 10 || l.consecutiveAbsences >= 2) risk = 'medium';
    return { ...l, absenceRate, unjustifiedRate, riskScore: Math.round(riskScore * 100) / 100, risk };
  }).sort((a, b) => b.riskScore - a.riskScore);

  const alerts: Array<{ level: 'high' | 'medium'; scope: 'cohort' | 'learner'; title: string; detail: string; learnerId?: string }> = [];
  const cohortAbsenceRate = pct(absentRecords, countedRecords);
  const cohortUnjustifiedRate = pct(unjustifiedRecords, countedRecords);

  if (cohortAbsenceRate >= 15) {
    alerts.push({
      level: cohortAbsenceRate >= 25 ? 'high' : 'medium',
      scope: 'cohort',
      title: 'Taux d absence eleve',
      detail: `${cohortAbsenceRate}% des presences comptabilisees sont en absence.`,
    });
  }

  if (cohortUnjustifiedRate >= 8) {
    alerts.push({
      level: cohortUnjustifiedRate >= 15 ? 'high' : 'medium',
      scope: 'cohort',
      title: 'Absences non justifiees a surveiller',
      detail: `${cohortUnjustifiedRate}% des presences comptabilisees sont des absences non justifiees.`,
    });
  }

  learners.slice(0, 20).forEach((l) => {
    if (l.consecutiveAbsences >= 3) {
      alerts.push({
        level: 'high',
        scope: 'learner',
        learnerId: l.learnerId,
        title: `${l.name}: absences consecutives`,
        detail: `${l.consecutiveAbsences} demi-journees consecutives en absence.`,
      });
      return;
    }
    if (l.absenceRate >= 20 && l.counted >= 4) {
      alerts.push({
        level: 'medium',
        scope: 'learner',
        learnerId: l.learnerId,
        title: `${l.name}: risque absence`,
        detail: `${l.absenceRate}% d'absence sur ${l.counted} pointages.`,
      });
    }
  });

  const weeklyTrend = Array.from(weekly.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12)
    .map(w => ({
      ...w,
      absenceRate: pct(w.absent, w.counted),
      unjustifiedRate: pct(w.unjustified, w.counted),
      lateRate: pct(w.late, w.counted),
    }));

  return NextResponse.json({
    cohort: { id: cohort.id, name: cohort.name },
    summary: {
      sessions: cohort.attendanceSessions.length,
      learners: cohort.learnerProfiles.length,
      records: totalRecords,
      countedRecords,
      naRecords,
      absentRecords,
      justifiedRecords,
      unjustifiedRecords,
      lateRecords,
      totalLateMinutes,
      absenceRate: cohortAbsenceRate,
      unjustifiedRate: cohortUnjustifiedRate,
      lateRate: pct(lateRecords, countedRecords),
      naRate: pct(naRecords, totalRecords),
    },
    alerts: alerts.sort((a, b) => (a.level === 'high' ? -1 : 1) - (b.level === 'high' ? -1 : 1)),
    learners,
    topRiskLearners: learners.slice(0, 10),
    weeklyTrend,
  });
}
