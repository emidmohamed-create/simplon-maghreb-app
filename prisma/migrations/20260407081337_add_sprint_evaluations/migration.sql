-- CreateTable
CREATE TABLE "sprint_evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learner_profile_id" TEXT NOT NULL,
    "sprint_phase_id" TEXT NOT NULL,
    "mastery_level" INTEGER NOT NULL,
    "comment" TEXT,
    "evaluated_by" TEXT NOT NULL,
    "evaluated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sprint_evaluations_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sprint_evaluations_sprint_phase_id_fkey" FOREIGN KEY ("sprint_phase_id") REFERENCES "timeline_phases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sprint_evaluations_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "sprint_evaluations_learner_profile_id_sprint_phase_id_key" ON "sprint_evaluations"("learner_profile_id", "sprint_phase_id");
