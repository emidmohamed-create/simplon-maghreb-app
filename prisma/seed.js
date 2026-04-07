const { PrismaClient } = require('@prisma/client');
const { hashSync } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating base seed data...');
  const passwordHash = hashSync('password123', 12);

  // Campus
  const campusCasa = await prisma.campus.upsert({
    where: { name: 'Casablanca' },
    update: {},
    create: { name: 'Casablanca', city: 'Casablanca' },
  });
  const campusAgadir = await prisma.campus.upsert({
    where: { name: 'Agadir' },
    update: {},
    create: { name: 'Agadir', city: 'Agadir' },
  });
  const campusMarrakech = await prisma.campus.upsert({
    where: { name: 'Marrakech' },
    update: {},
    create: { name: 'Marrakech', city: 'Marrakech' },
  });
  console.log('✅ Campuses created');

  // Users
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@simplon.ma' },
    update: {},
    create: { email: 'admin@simplon.ma', passwordHash, firstName: 'Admin', lastName: 'Simplon', role: 'SUPER_ADMIN' },
  });
  const pm1 = await prisma.user.upsert({
    where: { email: 'pm@simplon.ma' },
    update: {},
    create: { email: 'pm@simplon.ma', passwordHash, firstName: 'Youssef', lastName: 'Bennani', role: 'PROJECT_MANAGER' },
  });
  const trainer1 = await prisma.user.upsert({
    where: { email: 'formateur1@simplon.ma' },
    update: {},
    create: { email: 'formateur1@simplon.ma', passwordHash, firstName: 'Karim', lastName: 'Alaoui', role: 'TRAINER', campusId: campusCasa.id },
  });
  const trainer2 = await prisma.user.upsert({
    where: { email: 'formateur2@simplon.ma' },
    update: {},
    create: { email: 'formateur2@simplon.ma', passwordHash, firstName: 'Sara', lastName: 'Idrissi', role: 'TRAINER', campusId: campusCasa.id },
  });
  console.log('✅ Users created (admin@simplon.ma / password123)');

  // Projects
  const project1 = await prisma.project.upsert({
    where: { code: 'DWFS-2025' },
    update: {},
    create: {
      name: 'Formation Dev Web FullStack 2025', code: 'DWFS-2025',
      projectType: 'FUNDED', startDate: new Date('2025-09-01'), endDate: new Date('2026-06-30'),
      targetCapacity: 60, status: 'ACTIVE',
    },
  });
  const project2 = await prisma.project.upsert({
    where: { code: 'DEVOPS-2025' },
    update: {},
    create: {
      name: 'Programme DevOps & Cloud 2025', code: 'DEVOPS-2025',
      projectType: 'PARTNERSHIP', startDate: new Date('2025-10-01'), endDate: new Date('2026-04-30'),
      targetCapacity: 30, status: 'ACTIVE',
    },
  });
  const project3 = await prisma.project.upsert({
    where: { code: 'DATA-IA-2026' },
    update: {},
    create: {
      name: 'Data & IA - Cohorte Pilote', code: 'DATA-IA-2026',
      projectType: 'OWN', startDate: new Date('2026-01-15'), endDate: new Date('2026-07-15'),
      targetCapacity: 25, status: 'DRAFT',
    },
  });
  console.log('✅ Projects created');

  // Programs
  const progDevWeb = await prisma.program.create({
    data: { campusId: campusCasa.id, projectId: project1.id, name: 'Développement Web FullStack', description: 'Formation intensive React, Node.js' },
  }).catch(() => prisma.program.findFirst({ where: { name: 'Développement Web FullStack', campusId: campusCasa.id } }));

  const progDevOps = await prisma.program.create({
    data: { campusId: campusCasa.id, projectId: project2.id, name: 'DevOps & Cloud', description: 'DevOps, CI/CD, Docker, Kubernetes' },
  }).catch(() => prisma.program.findFirst({ where: { name: 'DevOps & Cloud', campusId: campusCasa.id } }));

  const progDataIA = await prisma.program.create({
    data: { campusId: campusMarrakech.id, projectId: project3.id, name: 'Data & Intelligence Artificielle', description: 'Python, ML, Deep Learning' },
  }).catch(() => prisma.program.findFirst({ where: { name: 'Data & Intelligence Artificielle', campusId: campusMarrakech.id } }));

  console.log('✅ Programs created');

  // Cohorts
  const cohort1 = await prisma.cohort.create({
    data: { programId: progDevWeb.id, projectId: project1.id, name: 'DWFS-Casa-P1', startDate: new Date('2025-10-01'), endDate: new Date('2026-03-31'), trainerId: trainer1.id, capacity: 30 },
  }).catch(() => prisma.cohort.findFirst({ where: { name: 'DWFS-Casa-P1' } }));

  const cohort2 = await prisma.cohort.create({
    data: { programId: progDevWeb.id, projectId: project1.id, name: 'DWFS-Casa-P2', startDate: new Date('2026-01-15'), endDate: new Date('2026-06-30'), trainerId: trainer2.id, capacity: 30 },
  }).catch(() => prisma.cohort.findFirst({ where: { name: 'DWFS-Casa-P2' } }));

  const cohort3 = await prisma.cohort.create({
    data: { programId: progDevOps.id, projectId: project2.id, name: 'DevOps-Casa-01', startDate: new Date('2025-11-01'), endDate: new Date('2026-04-30'), trainerId: trainer2.id, capacity: 25 },
  }).catch(() => prisma.cohort.findFirst({ where: { name: 'DevOps-Casa-01' } }));

  console.log('✅ Cohorts created');

  // Learners with enriched data for insertion module
  const learnerData = [
    { firstName: 'Amine', lastName: 'Berrada', email: 'amine.b@seed.com', status: 'IN_TRAINING', gender: 'MALE', level: 'Bac+3', field: 'Informatique' },
    { firstName: 'Nadia', lastName: 'Mansouri', email: 'nadia.m@seed.com', status: 'INSERTED', insertionType: 'CDI', insertionCompany: 'TechCorp', insertionDate: new Date('2026-02-15'), gender: 'FEMALE', level: 'Bac+2', field: 'Informatique' },
    { firstName: 'Omar', lastName: 'Tahiri', email: 'omar.t@seed.com', status: 'IN_TRAINING', gender: 'MALE', level: 'Bac', field: 'Sciences' },
    { firstName: 'Salma', lastName: 'Chraibi', email: 'salma.c@seed.com', status: 'INSERTED', insertionType: 'CDD', insertionCompany: 'DigiAgency', insertionDate: new Date('2026-03-01'), gender: 'FEMALE', level: 'Bac+3', field: 'Mathématiques' },
    { firstName: 'Rachid', lastName: 'Zouhairi', email: 'rachid.z@seed.com', status: 'IN_TRAINING', gender: 'MALE', level: 'Bac+5', field: 'Informatique' },
    { firstName: 'Imane', lastName: 'Fassi', email: 'imane.f@seed.com', status: 'DROPPED', gender: 'FEMALE', level: 'Bac+2', field: 'Économie et Gestion' },
    { firstName: 'Hamza', lastName: 'El Khatib', email: 'hamza.k@seed.com', status: 'INSERTED', insertionType: 'FREELANCE', insertionCompany: 'Freelance', insertionDate: new Date('2026-01-20'), gender: 'MALE', level: 'Bac+3', field: 'Informatique' },
    { firstName: 'Kenza', lastName: 'Amrani', email: 'kenza.a@seed.com', status: 'IN_TRAINING', gender: 'FEMALE', level: 'Bac', field: 'Lettres' },
    { firstName: 'Mehdi', lastName: 'Ouazzani', email: 'mehdi.o@seed.com', status: 'INSERTED', insertionType: 'INTERNSHIP', insertionCompany: 'StartupMa', insertionDate: new Date('2026-02-10'), gender: 'MALE', level: 'Bac+2', field: 'Informatique' },
    { firstName: 'Fatima', lastName: 'Benlahbib', email: 'fz.b@seed.com', status: 'IN_TRAINING', gender: 'FEMALE', level: 'Bac+3', field: 'Mathématiques' },
  ];

  for (const l of learnerData) {
    await prisma.learnerProfile.create({
      data: {
        cohortId: cohort1.id,
        firstName: l.firstName, lastName: l.lastName, email: l.email,
        statusCurrent: l.status,
        gender: l.gender,
        academicLevel: l.level,
        academicField: l.field,
        insertionType: l.insertionType || null,
        insertionCompany: l.insertionCompany || null,
        insertionDate: l.insertionDate || null,
      },
    }).catch(() => console.log(`  Skipping ${l.email} (may exist)`));
  }
  console.log('✅ Learners created with academic data');

  console.log('\n🎉 Seed terminé!');
  console.log('   Login: admin@simplon.ma');
  console.log('   Password: password123');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
