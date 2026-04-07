-- CreateTable
CREATE TABLE "jury_blanc_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohort_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATETIME,
    "description" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "jury_blanc_sessions_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jury_blanc_competencies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'TECHNIQUE',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "jury_blanc_competencies_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "jury_blanc_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jury_blanc_evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "learner_profile_id" TEXT NOT NULL,
    "competency_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "project_title" TEXT,
    "evaluated_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "jury_blanc_evaluations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "jury_blanc_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "jury_blanc_evaluations_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "jury_blanc_evaluations_competency_id_fkey" FOREIGN KEY ("competency_id") REFERENCES "jury_blanc_competencies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "jury_blanc_evaluations_session_id_learner_profile_id_competency_id_key" ON "jury_blanc_evaluations"("session_id", "learner_profile_id", "competency_id");
