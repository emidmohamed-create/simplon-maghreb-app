import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES, getProjectManagerScope } from '@/lib/rbac';

export async function GET(req: Request) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const programId = searchParams.get('programId');
  const projectId = searchParams.get('projectId');

  const where: any = {};
  if (programId) where.programId = programId;
  if (projectId) where.projectId = projectId;

  if (user?.role === 'PROJECT_MANAGER') {
    const scope = await getProjectManagerScope(user.id);
    if (scope.projectIds.length === 0 && scope.cohortIds.length === 0) {
      return NextResponse.json([]);
    }
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          ...(scope.projectIds.length > 0 ? [{ projectId: { in: scope.projectIds } }] : []),
          ...(scope.cohortIds.length > 0 ? [{ id: { in: scope.cohortIds } }] : []),
        ],
      },
    ];
  }

  const cohorts = await prisma.cohort.findMany({
    where,
    orderBy: { startDate: 'desc' },
    include: {
      program: { select: { name: true } },
      campus: { select: { id: true, name: true } },
      project: { select: { name: true, code: true } },
      trainer: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { learnerProfiles: true } },
    },
  });

  return NextResponse.json(cohorts);
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth(['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER']);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, programId, projectId, startDate, endDate, trainerId, capacity } = body;

    if (!name || !programId) {
      return NextResponse.json({ error: 'Nom et programme requis' }, { status: 400 });
    }

    // 1. Resolve or create a project
    let finalProjectId = projectId || null;
    if (!finalProjectId) {
      const program = await prisma.program.findUnique({ where: { id: programId } });
      if (program?.projectId) {
        finalProjectId = program.projectId;
      }
    }
    if (!finalProjectId) {
      const newProject = await prisma.project.create({
        data: {
          name: `Projet - ${name}`,
          code: `PRJ-${Date.now().toString(36).toUpperCase()}`,
          projectType: 'OWN',
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          status: 'ACTIVE',
        },
      });
      finalProjectId = newProject.id;
    }

    if (user?.role === 'PROJECT_MANAGER') {
      const scope = await getProjectManagerScope(user.id);
      if (!scope.projectIds.includes(finalProjectId)) {
        return NextResponse.json({ error: 'Acces refuse: ce projet n est pas dans votre perimetre' }, { status: 403 });
      }
    }

    // 2. Create the cohort
    const cohort = await prisma.cohort.create({
      data: {
        name,
        programId,
        projectId: finalProjectId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        trainerId: trainerId || null,
        capacity: capacity ? parseInt(capacity) : null,
      },
    });

    // 3. Auto-generate planning if dates are available
    console.log('[PLANNING] startDate:', startDate, '| endDate:', endDate, '| user:', user?.id);
    if (startDate && endDate) {
      try {
        // Use a fallback user if session user is missing
        let planCreatorId = user?.id;
        if (!planCreatorId) {
          const fallbackUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
          planCreatorId = fallbackUser?.id || '';
        }
        if (!planCreatorId) {
          console.warn('[PLANNING] No user found to create plan, skipping planning generation');
        } else {
          console.log('[PLANNING] Creating ProjectPlan for project:', finalProjectId);
          const projectPlan = await prisma.projectPlan.create({
            data: {
              projectId: finalProjectId,
              name: `Planning - ${name}`,
              description: `Planning auto-généré pour la cohorte ${name}`,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              createdById: planCreatorId,
            },
          });
          console.log('[PLANNING] ProjectPlan created:', projectPlan.id);

          const startMs = new Date(startDate).getTime();
          const endMs = new Date(endDate).getTime();
          const durationDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
          console.log('[PLANNING] Duration:', durationDays, 'days');

          const isLong = durationDays > 150;
          const template = isLong
            ? [
                { title: 'Sourcing', type: 'SOURCING', weight: 14 },
                { title: 'Warmup', type: 'WARMUP', weight: 5 },
                { title: 'SAS (Sélection & Accueil)', type: 'SELECTION', weight: 5 },
                { title: 'Sprint 1', type: 'TRAINING', weight: 14 },
                { title: 'Sprint 2', type: 'TRAINING', weight: 14 },
                { title: 'Sprint 3', type: 'TRAINING', weight: 14 },
                { title: 'Sprint 4', type: 'TRAINING', weight: 14 },
                { title: 'Évaluation intermédiaire', type: 'EVALUATION', weight: 2 },
                { title: 'Jury Blanc 1', type: 'EVALUATION', weight: 2 },
                { title: 'Sprint 5', type: 'TRAINING', weight: 14 },
                { title: 'Sprint 6', type: 'TRAINING', weight: 14 },
                { title: 'Sprint 7', type: 'TRAINING', weight: 14 },
                { title: 'Sprint 8', type: 'TRAINING', weight: 14 },
                { title: 'Jury Blanc 2', type: 'EVALUATION', weight: 2 },
                { title: 'Atelier Suivi CV', type: 'WORKSHOP', weight: 3 },
                { title: 'Atelier TRE', type: 'WORKSHOP', weight: 3 },
                { title: 'Projet Fil Rouge', type: 'FIL_ROUGE', weight: 21 },
                { title: 'Certification / Soutenance', type: 'CERTIFICATION', weight: 3 },
              ]
            : [
                { title: 'Sourcing', type: 'SOURCING', weight: 14 },
                { title: 'Warmup', type: 'WARMUP', weight: 5 },
                { title: 'SAS (Sélection & Accueil)', type: 'SELECTION', weight: 5 },
                { title: 'Sprint 1', type: 'TRAINING', weight: 14 },
                { title: 'Sprint 2', type: 'TRAINING', weight: 14 },
                { title: 'Sprint 3', type: 'TRAINING', weight: 14 },
                { title: 'Évaluation intermédiaire', type: 'EVALUATION', weight: 2 },
                { title: 'Jury Blanc', type: 'EVALUATION', weight: 2 },
                { title: 'Sprint 4', type: 'TRAINING', weight: 14 },
                { title: 'Sprint 5', type: 'TRAINING', weight: 14 },
                { title: 'Atelier Suivi CV', type: 'WORKSHOP', weight: 3 },
                { title: 'Atelier TRE', type: 'WORKSHOP', weight: 3 },
                { title: 'Projet Fil Rouge', type: 'FIL_ROUGE', weight: 14 },
                { title: 'Certification / Soutenance', type: 'CERTIFICATION', weight: 3 },
              ];

          const totalWeight = template.reduce((s, p) => s + p.weight, 0);
          let cursor = startMs;

          for (let i = 0; i < template.length; i++) {
            const p = template[i];
            const phaseDuration = (p.weight / totalWeight) * (endMs - startMs);
            const phaseEnd = cursor + phaseDuration;

            await prisma.timelinePhase.create({
              data: {
                projectPlanId: projectPlan.id,
                title: p.title,
                phaseType: p.type,
                startDate: new Date(cursor),
                endDate: new Date(phaseEnd),
                orderIndex: i,
                cohortId: cohort.id,
                status: 'PLANNED',
                ownerUserId: planCreatorId,
              },
            });
            cursor = phaseEnd;
          }
          console.log('[PLANNING] Generated', template.length, 'phases successfully');
        }
      } catch (planErr: any) {
        // Log but don't fail cohort creation if planning fails
        console.error('[PLANNING ERROR]', planErr.message, planErr);
      }
    } else {
      console.warn('[PLANNING] No dates provided — skipping planning generation');
    }

    // 4. Return cohort with generated phases
    const result = await prisma.cohort.findUnique({
      where: { id: cohort.id },
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        project: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('Erreur création cohorte:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
