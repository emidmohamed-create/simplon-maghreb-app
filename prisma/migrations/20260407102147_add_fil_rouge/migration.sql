-- CreateTable
CREATE TABLE "fil_rouge_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohort_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assigned_at" DATETIME,
    "defense_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "fil_rouge_projects_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fil_rouge_phases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fil_rouge_project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deadline" DATETIME,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fil_rouge_phases_fil_rouge_project_id_fkey" FOREIGN KEY ("fil_rouge_project_id") REFERENCES "fil_rouge_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fil_rouge_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learner_profile_id" TEXT NOT NULL,
    "phase_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "start_date" DATETIME,
    "end_date" DATETIME,
    "deliverable_url" TEXT,
    "learner_note" TEXT,
    "trainer_validated" BOOLEAN NOT NULL DEFAULT false,
    "trainer_comment" TEXT,
    "validated_by" TEXT,
    "submitted_at" DATETIME,
    "validated_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "fil_rouge_submissions_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fil_rouge_submissions_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "fil_rouge_phases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fil_rouge_submissions_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "fil_rouge_projects_cohort_id_key" ON "fil_rouge_projects"("cohort_id");

-- CreateIndex
CREATE UNIQUE INDEX "fil_rouge_submissions_learner_profile_id_phase_id_key" ON "fil_rouge_submissions"("learner_profile_id", "phase_id");
