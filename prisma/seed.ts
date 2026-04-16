import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.timelineComment.deleteMany();
  await prisma.timelineDependency.deleteMany();
  await prisma.timelineItem.deleteMany();
  await prisma.timelinePhase.deleteMany();
  await prisma.projectPlan.deleteMany();
  await prisma.activityEvaluation.deleteMany();
  await prisma.activityAssignment.deleteMany();
  await prisma.plannedActivity.deleteMany();
  await prisma.weeklyPlan.deleteMany();
  await prisma.justificationAttachment.deleteMany();
  await prisma.absenceJustificationRequest.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.calendarException.deleteMany();
  await prisma.trainingCalendar.deleteMany();
  await prisma.document.deleteMany();
  await prisma.learnerStatusHistory.deleteMany();
  await prisma.learnerProfile.deleteMany();
  await prisma.sourcingSectionEvaluation.deleteMany();
  await prisma.sourcingSessionJury.deleteMany();
  await prisma.sourcingSessionCandidate.deleteMany();
  await prisma.sourcingSession.deleteMany();
  await prisma.sourcingEvaluation.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.program.deleteMany();
  await prisma.project.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.campus.deleteMany();

  const passwordHash = await hash('password123', 12);

  // ============================================================
  // CAMPUSES
  // ============================================================
  const campusCasa = await prisma.campus.create({
    data: { name: 'Casablanca', city: 'Casablanca' },
  });
  const campusAgadir = await prisma.campus.create({
    data: { name: 'Agadir', city: 'Agadir' },
  });
  const campusMarrakech = await prisma.campus.create({
    data: { name: 'Marrakech', city: 'Marrakech' },
  });

  // ============================================================
  // USERS
  // ============================================================
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@simplon.ma',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Simplon',
      role: 'SUPER_ADMIN',
    },
  });

  const adminCasa = await prisma.user.create({
    data: {
      email: 'admin.casa@simplon.ma',
      passwordHash,
      firstName: 'Fatima',
      lastName: 'El Amrani',
      role: 'ADMIN_CAMPUS',
      campusId: campusCasa.id,
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      email: 'pm@simplon.ma',
      passwordHash,
      firstName: 'Youssef',
      lastName: 'Bennani',
      role: 'PROJECT_MANAGER',
    },
  });

  const trainer1 = await prisma.user.create({
    data: {
      email: 'formateur1@simplon.ma',
      passwordHash,
      firstName: 'Karim',
      lastName: 'Alaoui',
      role: 'TRAINER',
      campusId: campusCasa.id,
    },
  });

  const trainer2 = await prisma.user.create({
    data: {
      email: 'formateur2@simplon.ma',
      passwordHash,
      firstName: 'Sara',
      lastName: 'Idrissi',
      role: 'TRAINER',
      campusId: campusCasa.id,
    },
  });

  const trainer3 = await prisma.user.create({
    data: {
      email: 'formateur3@simplon.ma',
      passwordHash,
      firstName: 'Hassan',
      lastName: 'Mouline',
      role: 'TRAINER',
      campusId: campusAgadir.id,
    },
  });

  // ============================================================
  // PARTNERS
  // ============================================================
  const partner1 = await prisma.partner.create({
    data: {
      name: 'Fondation XYZ',
      type: 'FUNDER',
      contactName: 'Ahmed Tazi',
      contactEmail: 'ahmed@fondationxyz.ma',
      notes: 'Partenaire principal pour le développement web',
    },
  });

  const partner2 = await prisma.partner.create({
    data: {
      name: 'TechPartner Maroc',
      type: 'PARTNER',
      contactName: 'Leila Benhaddou',
      contactEmail: 'leila@techpartner.ma',
    },
  });

  // ============================================================
  // PROJECTS
  // ============================================================
  const project1 = await prisma.project.create({
    data: {
      name: 'Formation Développement Web FullStack 2025',
      code: 'DWFS-2025',
      description: 'Programme intensif de formation en développement web fullstack, financé par la Fondation XYZ.',
      projectType: 'FUNDED',
      partnerId: partner1.id,
      fundingSource: 'Fondation XYZ',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      targetCapacity: 60,
      status: 'ACTIVE',
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Programme DevOps & Cloud 2025',
      code: 'DEVOPS-2025',
      description: 'Formation DevOps et Cloud en partenariat avec TechPartner Maroc.',
      projectType: 'PARTNERSHIP',
      partnerId: partner2.id,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2026-04-30'),
      targetCapacity: 30,
      status: 'ACTIVE',
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Data & IA - Cohorte Pilote',
      code: 'DATA-IA-2026',
      description: 'Projet pilote de formation en Data Science et Intelligence Artificielle.',
      projectType: 'OWN',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-07-15'),
      targetCapacity: 25,
      status: 'DRAFT',
    },
  });

  // ============================================================
  // PROGRAMS
  // ============================================================
  const progDevWeb = await prisma.program.create({
    data: {
      projectId: project1.id,
      name: 'Développement Web FullStack',
      description: 'Formation intensive en développement web (React, Node.js, bases de données)',
    },
  });

  const progDevOps = await prisma.program.create({
    data: {
      projectId: project2.id,
      name: 'DevOps & Cloud',
      description: 'DevOps, CI/CD, Docker, Kubernetes, Cloud Azure/AWS',
    },
  });

  const progDevWebAgadir = await prisma.program.create({
    data: {
      projectId: project1.id,
      name: 'Développement Web FullStack',
      description: 'Formation intensive en développement web (React, Node.js)',
    },
  });

  const progDataIA = await prisma.program.create({
    data: {
      projectId: project3.id,
      name: 'Data & Intelligence Artificielle',
      description: 'Python, Machine Learning, Deep Learning, NLP',
    },
  });

  // ============================================================
  // COHORTS
  // ============================================================
  const cohort1 = await prisma.cohort.create({
    data: {
      programId: progDevWeb.id,
      projectId: project1.id,
      name: 'DWFS-Casa-P1',
      startDate: new Date('2025-10-01'),
      endDate: new Date('2026-03-31'),
      trainerId: trainer1.id,
      capacity: 30,
    },
  });

  const cohort2 = await prisma.cohort.create({
    data: {
      programId: progDevWeb.id,
      projectId: project1.id,
      name: 'DWFS-Casa-P2',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-06-30'),
      trainerId: trainer2.id,
      capacity: 30,
    },
  });

  const cohort3 = await prisma.cohort.create({
    data: {
      programId: progDevOps.id,
      projectId: project2.id,
      name: 'DevOps-Casa-01',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-04-30'),
      trainerId: trainer2.id,
      capacity: 25,
    },
  });

  const cohort4 = await prisma.cohort.create({
    data: {
      programId: progDevWebAgadir.id,
      projectId: project1.id,
      name: 'DWFS-Agadir-P1',
      startDate: new Date('2025-10-15'),
      endDate: new Date('2026-04-15'),
      trainerId: trainer3.id,
      capacity: 25,
    },
  });

  const cohort5 = await prisma.cohort.create({
    data: {
      programId: progDataIA.id,
      projectId: project3.id,
      name: 'DataIA-Marrakech-01',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-07-15'),
      trainerId: null,
      capacity: 25,
      isActive: true,
    },
  });

  // ============================================================
  // CANDIDATES
  // ============================================================
  const candidateNames = [
    { firstName: 'Amine', lastName: 'Berrada', email: 'amine.b@email.com', stage: 'CONVERTED' },
    { firstName: 'Nadia', lastName: 'Mansouri', email: 'nadia.m@email.com', stage: 'CONVERTED' },
    { firstName: 'Omar', lastName: 'Tahiri', email: 'omar.t@email.com', stage: 'CONVERTED' },
    { firstName: 'Salma', lastName: 'Chraibi', email: 'salma.c@email.com', stage: 'CONVERTED' },
    { firstName: 'Rachid', lastName: 'Zouhairi', email: 'rachid.z@email.com', stage: 'CONVERTED' },
    { firstName: 'Imane', lastName: 'Fassi', email: 'imane.f@email.com', stage: 'CONVERTED' },
    { firstName: 'Hamza', lastName: 'El Khatib', email: 'hamza.k@email.com', stage: 'CONVERTED' },
    { firstName: 'Kenza', lastName: 'Amrani', email: 'kenza.a@email.com', stage: 'CONVERTED' },
    { firstName: 'Mehdi', lastName: 'Ouazzani', email: 'mehdi.o@email.com', stage: 'CONVERTED' },
    { firstName: 'Fatima Zahra', lastName: 'Benlahbib', email: 'fz.b@email.com', stage: 'CONVERTED' },
    { firstName: 'Youssef', lastName: 'Lahlou', email: 'youssef.l@email.com', stage: 'CONVERTED' },
    { firstName: 'Ghita', lastName: 'Saidi', email: 'ghita.s@email.com', stage: 'CONVERTED' },
    { firstName: 'Adil', lastName: 'Benkirane', email: 'adil.b@email.com', stage: 'CONVERTED' },
    { firstName: 'Zineb', lastName: 'Mahjoub', email: 'zineb.m@email.com', stage: 'CONVERTED' },
    { firstName: 'Mounir', lastName: 'Ait Lhaj', email: 'mounir.a@email.com', stage: 'CONVERTED' },
    { firstName: 'Soukaina', lastName: 'Harrak', email: 'soukaina.h@email.com', stage: 'QUALIFIED' },
    { firstName: 'Taha', lastName: 'Kettani', email: 'taha.k@email.com', stage: 'QUALIFIED' },
    { firstName: 'Houda', lastName: 'Chami', email: 'houda.c@email.com', stage: 'EVALUATED' },
    { firstName: 'Khalid', lastName: 'Lagrini', email: 'khalid.l@email.com', stage: 'EVALUATED' },
    { firstName: 'Sanaa', lastName: 'Bennis', email: 'sanaa.b@email.com', stage: 'CONTACTED' },
    { firstName: 'Othmane', lastName: 'Raji', email: 'othmane.r@email.com', stage: 'NEW' },
    { firstName: 'Meriem', lastName: 'Teffahi', email: 'meriem.t@email.com', stage: 'REJECTED' },
  ];

  const candidates = [];
  for (const c of candidateNames) {
    const candidate = await prisma.candidate.create({
      data: {
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: `+212 6${Math.floor(10000000 + Math.random() * 90000000)}`,
        campusId: campusCasa.id,
        projectId: project1.id,
        sourceChannel: ['Site web', 'Facebook', 'Partenaire', 'Bouche-à-oreille', 'LinkedIn'][Math.floor(Math.random() * 5)],
        currentStage: c.stage,
        createdAt: new Date('2025-08-15'),
      },
    });
    candidates.push(candidate);
  }

  // ============================================================
  // LEARNER PROFILES (from converted candidates)
  // ============================================================
  const convertedCandidates = candidates.filter((_, i) => candidateNames[i].stage === 'CONVERTED');
  const learnerStatuses = [
    'IN_TRAINING', 'IN_TRAINING', 'IN_TRAINING', 'IN_TRAINING', 'IN_TRAINING',
    'IN_TRAINING', 'IN_TRAINING', 'IN_TRAINING', 'IN_TRAINING', 'DROPPED',
    'IN_TRAINING', 'INSERTED', 'INSERTED', 'IN_TRAINING', 'EXCLUDED',
  ];
  const insertionData: Array<{ type?: string; company?: string; date?: Date }> = [
    {}, {}, {}, {}, {}, {}, {}, {}, {},
    {}, {},
    { type: 'CDI', company: 'TechCorp Maroc', date: new Date('2026-02-15') },
    { type: 'INTERNSHIP', company: 'DigiAgency', date: new Date('2026-03-01') },
    {}, {},
  ];

  const learners = [];
  for (let i = 0; i < convertedCandidates.length; i++) {
    const c = convertedCandidates[i];
    const status = learnerStatuses[i];
    const ins = insertionData[i];

    // Create user account for learner
    const learnerUser = await prisma.user.create({
      data: {
        email: candidateNames[i].email,
        passwordHash,
        firstName: candidateNames[i].firstName,
        lastName: candidateNames[i].lastName,
        role: 'LEARNER',
        campusId: campusCasa.id,
      },
    });

    const cohortAssignment = i < 8 ? cohort1 : i < 12 ? cohort2 : cohort3;

    const learner = await prisma.learnerProfile.create({
      data: {
        userId: learnerUser.id,
        candidateId: c.id,
        cohortId: cohortAssignment.id,
        firstName: candidateNames[i].firstName,
        lastName: candidateNames[i].lastName,
        email: candidateNames[i].email,
        phone: c.phone,
        statusCurrent: status,
        insertionType: ins.type || null,
        insertionCompany: ins.company || null,
        insertionDate: ins.date || null,
      },
    });

    // Add status history
    await prisma.learnerStatusHistory.create({
      data: {
        learnerProfileId: learner.id,
        fromStatus: null,
        toStatus: 'IN_TRAINING',
        effectiveDate: cohortAssignment.startDate || new Date('2025-10-01'),
        comment: 'Intégration dans la cohorte',
        changedById: superAdmin.id,
      },
    });

    if (status !== 'IN_TRAINING') {
      await prisma.learnerStatusHistory.create({
        data: {
          learnerProfileId: learner.id,
          fromStatus: 'IN_TRAINING',
          toStatus: status,
          effectiveDate: new Date('2026-02-01'),
          comment: status === 'DROPPED' ? 'Abandon volontaire' : status === 'INSERTED' ? 'Insertion professionnelle' : 'Exclusion pour absences excessives',
          changedById: pm1.id,
        },
      });
    }

    learners.push(learner);
  }

  // ============================================================
  // ATTENDANCE DATA (for cohort1, last 8 weeks)
  // ============================================================
  const cohort1Learners = learners.filter((_, i) => i < 8);
  const attendanceDates: Date[] = [];
  const startAttendance = new Date('2026-01-05');
  for (let w = 0; w < 8; w++) {
    for (let d = 0; d < 5; d++) {
      const date = new Date(startAttendance);
      date.setDate(date.getDate() + w * 7 + d);
      attendanceDates.push(date);
    }
  }

  for (const date of attendanceDates) {
    for (const halfDay of ['AM', 'PM'] as const) {
      const session = await prisma.attendanceSession.create({
        data: {
          cohortId: cohort1.id,
          date,
          halfDay,
          createdById: trainer1.id,
        },
      });

      for (const learner of cohort1Learners) {
        const rand = Math.random();
        let status = 'PRESENT';
        let lateMinutes = null;

        if (rand > 0.92) {
          status = 'ABSENT';
        } else if (rand > 0.88) {
          status = 'JUSTIFIED_ABSENT';
        } else if (rand > 0.82) {
          status = 'LATE';
          lateMinutes = Math.floor(Math.random() * 25) + 5;
        }

        await prisma.attendanceRecord.create({
          data: {
            attendanceSessionId: session.id,
            learnerProfileId: learner.id,
            status,
            lateMinutes,
            recordedById: trainer1.id,
          },
        });
      }
    }
  }

  // ============================================================
  // PROJECT PLAN & TIMELINE (for project1)
  // ============================================================
  const plan1 = await prisma.projectPlan.create({
    data: {
      projectId: project1.id,
      name: 'Plan principal DWFS 2025-2026',
      description: 'Planning global du projet de formation Développement Web FullStack',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2026-06-30'),
      status: 'ACTIVE',
      createdById: pm1.id,
    },
  });

  const phases = [
    { title: 'Campagne de communication', type: 'COMMUNICATION', start: '2025-07-01', end: '2025-08-31', color: '#3b82f6', status: 'DONE' },
    { title: 'Sourcing des candidats', type: 'SOURCING', start: '2025-08-01', end: '2025-09-15', color: '#8b5cf6', status: 'DONE' },
    { title: 'Évaluation et sélection', type: 'SELECTION', start: '2025-09-01', end: '2025-09-25', color: '#f59e0b', status: 'DONE' },
    { title: 'Warm-up', type: 'WARMUP', start: '2025-09-25', end: '2025-10-01', color: '#06b6d4', status: 'DONE' },
    { title: 'Formation - Promotion 1', type: 'TRAINING', start: '2025-10-01', end: '2026-03-31', color: '#22c55e', status: 'IN_PROGRESS' },
    { title: 'Ateliers CV & TRE', type: 'WORKSHOP', start: '2026-01-15', end: '2026-03-15', color: '#ec4899', status: 'IN_PROGRESS' },
    { title: 'Projet fil rouge', type: 'FIL_ROUGE', start: '2026-02-01', end: '2026-03-20', color: '#f97316', status: 'IN_PROGRESS' },
    { title: 'Évaluations intermédiaires', type: 'EVALUATION', start: '2025-12-15', end: '2026-01-15', color: '#eab308', status: 'DONE' },
    { title: 'Certification finale P1', type: 'CERTIFICATION', start: '2026-03-25', end: '2026-03-31', color: '#14b8a6', status: 'PLANNED' },
    { title: 'Formation - Promotion 2', type: 'TRAINING', start: '2026-01-15', end: '2026-06-30', color: '#22c55e', status: 'IN_PROGRESS' },
    { title: 'Suivi insertion', type: 'INSERTION', start: '2026-04-01', end: '2026-06-30', color: '#6366f1', status: 'PLANNED' },
  ];

  const createdPhases = [];
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const phase = await prisma.timelinePhase.create({
      data: {
        projectPlanId: plan1.id,
        title: p.title,
        phaseType: p.type,
        startDate: new Date(p.start),
        endDate: new Date(p.end),
        color: p.color,
        orderIndex: i,
        status: p.status,
        ownerUserId: pm1.id,
      },
    });
    createdPhases.push(phase);
  }

  // Timeline items for some phases
  const timelineItems = [
    { phaseIdx: 0, title: 'Lancement campagne réseaux sociaux', type: 'EVENT', start: '2025-07-01', status: 'DONE', priority: 'HIGH' },
    { phaseIdx: 1, title: 'Ouverture des candidatures', type: 'MILESTONE', start: '2025-08-01', status: 'DONE', priority: 'CRITICAL' },
    { phaseIdx: 1, title: 'Clôture des candidatures', type: 'DEADLINE', start: '2025-09-10', status: 'DONE', priority: 'CRITICAL' },
    { phaseIdx: 2, title: 'Sessions d\'entretiens individuels', type: 'ACTIVITY', start: '2025-09-05', end: '2025-09-20', status: 'DONE', priority: 'HIGH' },
    { phaseIdx: 3, title: 'Journée d\'intégration', type: 'EVENT', start: '2025-09-25', status: 'DONE', priority: 'HIGH' },
    { phaseIdx: 4, title: 'Sprint 1 - Fondamentaux Web', type: 'ACTIVITY', start: '2025-10-01', end: '2025-10-31', status: 'DONE', priority: 'MEDIUM' },
    { phaseIdx: 4, title: 'Sprint 2 - JavaScript avancé', type: 'ACTIVITY', start: '2025-11-01', end: '2025-11-30', status: 'DONE', priority: 'MEDIUM' },
    { phaseIdx: 4, title: 'Sprint 3 - React & Frontend', type: 'ACTIVITY', start: '2025-12-01', end: '2025-12-31', status: 'DONE', priority: 'MEDIUM' },
    { phaseIdx: 4, title: 'Sprint 4 - Backend Node.js', type: 'ACTIVITY', start: '2026-01-01', end: '2026-01-31', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { phaseIdx: 5, title: 'Atelier CV', type: 'WORKSHOP', start: '2026-01-20', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { phaseIdx: 5, title: 'Simulation entretien', type: 'WORKSHOP', start: '2026-02-15', status: 'PLANNED', priority: 'MEDIUM' },
    { phaseIdx: 5, title: 'Atelier TRE', type: 'WORKSHOP', start: '2026-03-01', status: 'PLANNED', priority: 'MEDIUM' },
    { phaseIdx: 6, title: 'Lancement projet fil rouge', type: 'MILESTONE', start: '2026-02-01', status: 'IN_PROGRESS', priority: 'CRITICAL' },
    { phaseIdx: 6, title: 'Point de suivi #1', type: 'REVIEW_POINT', start: '2026-02-15', status: 'PLANNED', priority: 'HIGH' },
    { phaseIdx: 6, title: 'Point de suivi #2', type: 'REVIEW_POINT', start: '2026-03-01', status: 'PLANNED', priority: 'HIGH' },
    { phaseIdx: 6, title: 'Date limite dépôt livrables', type: 'DEADLINE', start: '2026-03-15', status: 'PLANNED', priority: 'CRITICAL' },
    { phaseIdx: 8, title: 'Jury blanc', type: 'EVENT', start: '2026-03-25', status: 'PLANNED', priority: 'HIGH' },
    { phaseIdx: 8, title: 'Soutenance finale', type: 'EVENT', start: '2026-03-28', status: 'PLANNED', priority: 'CRITICAL' },
  ];

  for (const item of timelineItems) {
    await prisma.timelineItem.create({
      data: {
        phaseId: createdPhases[item.phaseIdx].id,
        title: item.title,
        itemType: item.type,
        startDatetime: new Date(item.start),
        endDatetime: item.end ? new Date(item.end) : null,
        allDay: true,
        status: item.status,
        priority: item.priority,
        responsibleUserId: pm1.id,
      },
    });
  }

  // ============================================================
  // SOURCING EVALUATIONS
  // ============================================================
  for (const candidate of candidates.slice(0, 16)) {
    await prisma.sourcingEvaluation.create({
      data: {
        candidateId: candidate.id,
        evaluatorId: pm1.id,
        evaluationDate: new Date('2025-09-10'),
        score: Math.random() * 40 + 60,
        recommendation: candidateNames[candidates.indexOf(candidate)].stage === 'REJECTED' ? 'REJECTED' : 'QUALIFIED',
        comment: 'Évaluation réalisée lors de la session de sélection',
        criteriaJson: JSON.stringify({
          motivation: Math.floor(Math.random() * 3) + 3,
          technique: Math.floor(Math.random() * 3) + 2,
          communication: Math.floor(Math.random() * 3) + 3,
          projetPro: Math.floor(Math.random() * 3) + 2,
        }),
      },
    });
  }

  console.log('✅ Seed completed!');
  console.log(`   - ${3} campuses`);
  console.log(`   - ${6} users (admin: admin@simplon.ma / password123)`);
  console.log(`   - ${2} partners`);
  console.log(`   - ${3} projects`);
  console.log(`   - ${4} programs`);
  console.log(`   - ${5} cohorts`);
  console.log(`   - ${candidates.length} candidates`);
  console.log(`   - ${learners.length} learners`);
  console.log(`   - ${attendanceDates.length * 2} attendance sessions`);
  console.log(`   - ${phases.length} timeline phases`);
  console.log(`   - ${timelineItems.length} timeline items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
