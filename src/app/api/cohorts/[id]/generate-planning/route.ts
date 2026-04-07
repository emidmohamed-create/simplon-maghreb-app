import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  try {
    const cohort = await prisma.cohort.findUnique({
      where: { id: params.id },
      include: { phases: { select: { id: true } } },
    });

    if (!cohort) return NextResponse.json({ error: 'Cohorte non trouvée' }, { status: 404 });
    if (!cohort.startDate || !cohort.endDate) {
      return NextResponse.json({ error: 'La cohorte doit avoir des dates de début et de fin' }, { status: 400 });
    }
    if (cohort.phases.length > 0) {
      return NextResponse.json({ error: 'Un planning existe déjà pour cette cohorte', phases: cohort.phases.length }, { status: 409 });
    }

    // Resolve project — verify it actually exists in DB
    let projectId = cohort.projectId;
    if (projectId) {
      const existingProject = await prisma.project.findUnique({ where: { id: projectId } });
      if (!existingProject) {
        console.warn(`[GENERATE-PLANNING] Project ${projectId} not found in DB, creating new one`);
        projectId = null; // Will create below
      }
    }
    if (!projectId) {
      const newProject = await prisma.project.create({
        data: {
          name: `Projet - ${cohort.name}`,
          code: `PRJ-${Date.now().toString(36).toUpperCase()}`,
          projectType: 'OWN',
          startDate: cohort.startDate,
          endDate: cohort.endDate,
          status: 'ACTIVE',
        },
      });
      projectId = newProject.id;
      await prisma.cohort.update({ where: { id: cohort.id }, data: { projectId } });
      console.log(`[GENERATE-PLANNING] Created new project: ${projectId}`);
    }

    // Resolve creator — verify user exists too
    let creatorId = user?.id;
    if (creatorId) {
      const existingUser = await prisma.user.findUnique({ where: { id: creatorId } });
      if (!existingUser) creatorId = undefined;
    }
    if (!creatorId) {
      const fallback = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      creatorId = fallback?.id;
    }
    if (!creatorId) {
      // Last resort: any user
      const anyUser = await prisma.user.findFirst();
      creatorId = anyUser?.id;
    }
    if (!creatorId) return NextResponse.json({ error: 'Aucun utilisateur en base — veuillez lancer le seed' }, { status: 500 });

    // Create the project plan
    const projectPlan = await prisma.projectPlan.create({
      data: {
        projectId,
        name: `Planning - ${cohort.name}`,
        description: `Planning auto-généré pour la cohorte ${cohort.name}`,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        createdById: creatorId,
      },
    });

    const startMs = cohort.startDate.getTime();
    const endMs = cohort.endDate.getTime();
    const durationDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
    const isLong = durationDays > 150;

    console.log(`[GENERATE-PLANNING] cohort=${cohort.name}, duration=${durationDays}j, model=${isLong ? 'LONG' : 'SHORT'}`);

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
    const phases = [];

    for (let i = 0; i < template.length; i++) {
      const p = template[i];
      const phaseDuration = (p.weight / totalWeight) * (endMs - startMs);
      const phaseEnd = cursor + phaseDuration;

      const phase = await prisma.timelinePhase.create({
        data: {
          projectPlanId: projectPlan.id,
          title: p.title,
          phaseType: p.type,
          startDate: new Date(cursor),
          endDate: new Date(phaseEnd),
          orderIndex: i,
          cohortId: cohort.id,
          status: 'PLANNED',
          ownerUserId: creatorId,
        },
      });
      phases.push(phase);
      cursor = phaseEnd;
    }

    return NextResponse.json({ success: true, phasesCreated: phases.length, planId: projectPlan.id });
  } catch (err: any) {
    console.error('[GENERATE-PLANNING ERROR]', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
