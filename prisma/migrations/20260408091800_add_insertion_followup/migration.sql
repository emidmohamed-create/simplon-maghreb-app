-- CreateTable
CREATE TABLE "insertion_follow_ups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learner_profile_id" TEXT NOT NULL,
    "organized_by_id" TEXT,
    "planned_date" DATETIME NOT NULL,
    "date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "modality" TEXT NOT NULL DEFAULT 'CALL',
    "notes" TEXT,
    "outcome" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "insertion_follow_ups_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "insertion_follow_ups_organized_by_id_fkey" FOREIGN KEY ("organized_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
