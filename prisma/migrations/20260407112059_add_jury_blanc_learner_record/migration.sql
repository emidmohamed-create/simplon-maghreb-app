-- CreateTable
CREATE TABLE "jury_blanc_learner_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "learner_profile_id" TEXT NOT NULL,
    "general_comment" TEXT,
    "jury_level" TEXT,
    "trainer_level" TEXT,
    "project_clarity" TEXT,
    "project_impl" TEXT,
    "project_explain" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "jury_blanc_learner_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "jury_blanc_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "jury_blanc_learner_records_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "jury_blanc_learner_records_session_id_learner_profile_id_key" ON "jury_blanc_learner_records"("session_id", "learner_profile_id");
