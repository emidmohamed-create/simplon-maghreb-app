-- CreateTable
CREATE TABLE "learner_meetings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learner_profile_id" TEXT NOT NULL,
    "organized_by_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SUIVI',
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "outcome" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "learner_meetings_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "learner_meetings_organized_by_id_fkey" FOREIGN KEY ("organized_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
