-- CreateTable
CREATE TABLE "sourcing_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "campus_id" TEXT,
    "project_id" TEXT,
    "cohort_id" TEXT,
    "created_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sourcing_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sourcing_session_candidates" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "check_in_status" TEXT NOT NULL DEFAULT 'INVITED',
    "time_slot" TEXT,
    "group_name" TEXT,
    "final_score" DOUBLE PRECISION,
    "final_decision" TEXT,
    "final_comment" TEXT,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sourcing_session_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sourcing_session_juries" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'JURY',
    "can_finalize" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sourcing_session_juries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sourcing_section_evaluations" (
    "id" TEXT NOT NULL,
    "session_candidate_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "score" DOUBLE PRECISION,
    "recommendation" TEXT,
    "comment" TEXT,
    "strengths" TEXT,
    "risks" TEXT,
    "needs_follow_up" TEXT,
    "criteria_json" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sourcing_section_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sourcing_session_candidates_session_id_candidate_id_key" ON "sourcing_session_candidates"("session_id", "candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "sourcing_session_juries_session_id_user_id_section_key" ON "sourcing_session_juries"("session_id", "user_id", "section");

-- CreateIndex
CREATE UNIQUE INDEX "sourcing_section_evaluations_session_candidate_id_evaluator_id_section_key" ON "sourcing_section_evaluations"("session_candidate_id", "evaluator_id", "section");

-- AddForeignKey
ALTER TABLE "sourcing_sessions" ADD CONSTRAINT "sourcing_sessions_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_sessions" ADD CONSTRAINT "sourcing_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_sessions" ADD CONSTRAINT "sourcing_sessions_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_sessions" ADD CONSTRAINT "sourcing_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_session_candidates" ADD CONSTRAINT "sourcing_session_candidates_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sourcing_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_session_candidates" ADD CONSTRAINT "sourcing_session_candidates_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_session_candidates" ADD CONSTRAINT "sourcing_session_candidates_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_session_juries" ADD CONSTRAINT "sourcing_session_juries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sourcing_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_session_juries" ADD CONSTRAINT "sourcing_session_juries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_section_evaluations" ADD CONSTRAINT "sourcing_section_evaluations_session_candidate_id_fkey" FOREIGN KEY ("session_candidate_id") REFERENCES "sourcing_session_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_section_evaluations" ADD CONSTRAINT "sourcing_section_evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
