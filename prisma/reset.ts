import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning database...');

  // Delete everything in correct order to respect constraints
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
  await prisma.sourcingEvaluation.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.program.deleteMany();
  await prisma.project.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.campus.deleteMany();

  console.log('✨ Database is empty.');

  // Create survival Super Admin
  const passwordHash = await hash('Simplon2025!', 12);
  await prisma.user.create({
    data: {
      email: 'admin@simplon.ma',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('👤 Super Admin created: admin@simplon.ma / Simplon2025!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
