-- Add interview committee support to sourcing sessions
ALTER TABLE "sourcing_session_juries" ADD COLUMN "committee_key" TEXT;

ALTER TABLE "sourcing_session_candidates" ADD COLUMN "interview_status" TEXT NOT NULL DEFAULT 'WAITING';
ALTER TABLE "sourcing_session_candidates" ADD COLUMN "interview_committee_key" TEXT;
ALTER TABLE "sourcing_session_candidates" ADD COLUMN "interview_started_by" TEXT;
ALTER TABLE "sourcing_session_candidates" ADD COLUMN "interview_started_at" TIMESTAMP(3);
ALTER TABLE "sourcing_session_candidates" ADD COLUMN "interview_ended_at" TIMESTAMP(3);

CREATE INDEX "sourcing_session_candidates_session_id_interview_status_idx" ON "sourcing_session_candidates"("session_id", "interview_status");

ALTER TABLE "sourcing_session_candidates" ADD CONSTRAINT "sourcing_session_candidates_interview_started_by_fkey" FOREIGN KEY ("interview_started_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
