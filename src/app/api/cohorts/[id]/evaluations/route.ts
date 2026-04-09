import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

// GET — Fetch all sprint evaluations for a cohort
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  const cohortId = params.id;

  // Get learners of this cohort
  const learners = await prisma.learnerProfile.findMany({
    where: { cohortId },
    orderBy: { lastName: 'asc' },
    select: {
      id: true, firstName: true, lastName: true, statusCurrent: true,
    },
  });

  // Get sprint phases for this cohort (TRAINING type phases)
  const sprints = await prisma.timelinePhase.findMany({
    where: { cohortId, phaseType: 'TRAINING' },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true, title: true, orderIndex: true,
      startDate: true, endDate: true, status: true,
      criteriaJson: true,
    },
  });

  // Get all evaluations for these learners + sprints
  const sprintIds = sprints.map(s => s.id);
  const learnerIds = learners.map(l => l.id);

  const evaluations = await prisma.sprintEvaluation.findMany({
    where: {
      learnerProfileId: { in: learnerIds },
      sprintPhaseId: { in: sprintIds },
    },
    select: {
      id: true,
      learnerProfileId: true,
      sprintPhaseId: true,
      masteryLevel: true,
      comment: true,
      evaluatedAt: true,
    },
  });

  // Build lookup: { learnerId_sprintId: evaluation }
  const evalMap: Record<string, any> = {};
  for (const e of evaluations) {
    evalMap[`${e.learnerProfileId}_${e.sprintPhaseId}`] = e;
  }

  // Compute stats per sprint
  const LEVELS = ['DEBUTANT', 'OPERATIONNEL', 'AUTONOME', 'MOTEUR'];
  const statsPerSprint: Record<string, Record<string, number>> = {};
  for (const sprint of sprints) {
    const counts: Record<string, number> = { DEBUTANT: 0, OPERATIONNEL: 0, AUTONOME: 0, MOTEUR: 0, NON_EVALUE: 0 };
    for (const learner of learners) {
      const ev = evalMap[`${learner.id}_${sprint.id}`];
      if (!ev) counts['NON_EVALUE']++;
      else counts[LEVELS[ev.masteryLevel - 1]]++;
    }
    statsPerSprint[sprint.id] = counts;
  }

  // Global stats (latest sprint with evaluations)
  const globalCounts: Record<string, number> = { DEBUTANT: 0, OPERATIONNEL: 0, AUTONOME: 0, MOTEUR: 0, NON_EVALUE: 0 };
  for (const learner of learners) {
    // Find the latest evaluated sprint for this learner
    let latestEval = null;
    for (let i = sprints.length - 1; i >= 0; i--) {
      const ev = evalMap[`${learner.id}_${sprints[i].id}`];
      if (ev) { latestEval = ev; break; }
    }
    if (!latestEval) globalCounts['NON_EVALUE']++;
    else globalCounts[LEVELS[latestEval.masteryLevel - 1]]++;
  }

  return NextResponse.json({
    learners,
    sprints,
    evaluations,
    evalMap,
    statsPerSprint,
    globalCounts,
  });
}

// POST — Create or Update a sprint evaluation
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  try {
    const body = await req.json();
    const { learnerProfileId, sprintPhaseId, masteryLevel, comment } = body;

    if (!learnerProfileId || !sprintPhaseId || !masteryLevel) {
      return NextResponse.json({ error: 'learnerProfileId, sprintPhaseId et masteryLevel requis' }, { status: 400 });
    }

    if (masteryLevel < 1 || masteryLevel > 4) {
      return NextResponse.json({ error: 'masteryLevel doit être entre 1 et 4' }, { status: 400 });
    }

    // Resolve evaluator
    let evaluatorId = user?.id;
    if (!evaluatorId) {
      const fallback = await prisma.user.findFirst();
      evaluatorId = fallback?.id || '';
    }
    if (!evaluatorId) return NextResponse.json({ error: 'Aucun utilisateur trouvé' }, { status: 500 });

    // Upsert (unique constraint on learnerProfileId + sprintPhaseId)
    const evaluation = await prisma.sprintEvaluation.upsert({
      where: {
        learnerProfileId_sprintPhaseId: {
          learnerProfileId,
          sprintPhaseId,
        },
      },
      update: {
        masteryLevel,
        comment: comment || null,
        evaluatedById: evaluatorId,
      },
      create: {
        learnerProfileId,
        sprintPhaseId,
        masteryLevel,
        comment: comment || null,
        evaluatedById: evaluatorId,
      },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (err: any) {
    console.error('[SPRINT EVAL ERROR]', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
