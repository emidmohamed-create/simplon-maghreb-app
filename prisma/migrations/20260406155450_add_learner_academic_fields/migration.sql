-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'LEARNER',
    "campus_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" DATETIME,
    CONSTRAINT "users_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "project_type" TEXT NOT NULL DEFAULT 'OWN',
    "partner_id" TEXT,
    "funding_source" TEXT,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "target_capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campuses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campus_id" TEXT NOT NULL,
    "project_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "programs_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "programs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "program_id" TEXT NOT NULL,
    "project_id" TEXT,
    "name" TEXT NOT NULL,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "trainer_id" TEXT,
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "cohorts_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cohorts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "cohorts_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "cin" TEXT,
    "birthdate" DATETIME,
    "campus_id" TEXT,
    "project_id" TEXT,
    "source_channel" TEXT,
    "current_stage" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidates_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "candidates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sourcing_evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidate_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "evaluation_date" DATETIME NOT NULL,
    "criteria_json" TEXT,
    "score" REAL,
    "recommendation" TEXT,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sourcing_evaluations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sourcing_evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "learner_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "candidate_id" TEXT,
    "cohort_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "cin" TEXT,
    "birthdate" DATETIME,
    "emergency_contact" TEXT,
    "gender" TEXT,
    "academic_level" TEXT,
    "academic_field" TEXT,
    "status_current" TEXT NOT NULL DEFAULT 'IN_TRAINING',
    "insertion_type" TEXT,
    "insertion_company" TEXT,
    "insertion_date" DATETIME,
    "insertion_proof" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "learner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "learner_profiles_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "learner_profiles_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "learner_status_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learner_profile_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "effective_date" DATETIME NOT NULL,
    "comment" TEXT,
    "changed_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "learner_status_history_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "learner_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learner_profile_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibility" TEXT NOT NULL DEFAULT 'STAFF',
    CONSTRAINT "documents_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "training_calendars" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Casablanca',
    "default_weekdays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "training_calendars_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "training_calendars_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "campuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendar_exceptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calendar_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "note" TEXT,
    CONSTRAINT "calendar_exceptions_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "training_calendars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohort_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "half_day" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_sessions_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attendance_session_id" TEXT NOT NULL,
    "learner_profile_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "late_minutes" INTEGER,
    "note" TEXT,
    "recorded_by" TEXT NOT NULL,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_records_attendance_session_id_fkey" FOREIGN KEY ("attendance_session_id") REFERENCES "attendance_sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "absence_justification_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learner_profile_id" TEXT NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "date_from" DATETIME NOT NULL,
    "half_day_from" TEXT NOT NULL,
    "date_to" DATETIME NOT NULL,
    "half_day_to" TEXT NOT NULL,
    "reason_type" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" DATETIME,
    "review_comment" TEXT,
    CONSTRAINT "absence_justification_requests_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "absence_justification_requests_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "absence_justification_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "justification_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "justification_request_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT,
    "size" INTEGER,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "justification_attachments_justification_request_id_fkey" FOREIGN KEY ("justification_request_id") REFERENCES "absence_justification_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "weekly_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohort_id" TEXT NOT NULL,
    "week_start_date" DATETIME NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT "weekly_plans_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "weekly_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "planned_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekly_plan_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "half_day" TEXT,
    "activity_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "modality" TEXT,
    "duration_minutes" INTEGER,
    "resources_links" TEXT,
    "expected_outcome" TEXT,
    CONSTRAINT "planned_activities_weekly_plan_id_fkey" FOREIGN KEY ("weekly_plan_id") REFERENCES "weekly_plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planned_activity_id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "learner_profile_id" TEXT,
    "group_id" TEXT,
    "due_date_time" DATETIME,
    "grading_mode" TEXT NOT NULL DEFAULT 'NONE',
    "max_score" REAL,
    CONSTRAINT "activity_assignments_planned_activity_id_fkey" FOREIGN KEY ("planned_activity_id") REFERENCES "planned_activities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "activity_assignments_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activity_assignment_id" TEXT NOT NULL,
    "learner_profile_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "score" REAL,
    "trainer_comment" TEXT,
    "observed_notes" TEXT,
    "evaluated_by" TEXT NOT NULL,
    "evaluated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_evaluations_activity_assignment_id_fkey" FOREIGN KEY ("activity_assignment_id") REFERENCES "activity_assignments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "activity_evaluations_learner_profile_id_fkey" FOREIGN KEY ("learner_profile_id") REFERENCES "learner_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "activity_evaluations_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "project_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "project_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "timeline_phases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_plan_id" TEXT NOT NULL,
    "parent_phase_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "phase_type" TEXT NOT NULL,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "color" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "owner_user_id" TEXT,
    "campus_id" TEXT,
    "cohort_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "timeline_phases_project_plan_id_fkey" FOREIGN KEY ("project_plan_id") REFERENCES "project_plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "timeline_phases_parent_phase_id_fkey" FOREIGN KEY ("parent_phase_id") REFERENCES "timeline_phases" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "timeline_phases_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "timeline_phases_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "timeline_phases_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "timeline_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phase_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "item_type" TEXT NOT NULL,
    "start_datetime" DATETIME NOT NULL,
    "end_datetime" DATETIME,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "modality" TEXT,
    "location" TEXT,
    "related_cohort_id" TEXT,
    "related_project_id" TEXT,
    "related_weekly_plan_id" TEXT,
    "related_activity_id" TEXT,
    "responsible_user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "timeline_items_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "timeline_phases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "timeline_items_related_cohort_id_fkey" FOREIGN KEY ("related_cohort_id") REFERENCES "cohorts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "timeline_items_related_weekly_plan_id_fkey" FOREIGN KEY ("related_weekly_plan_id") REFERENCES "weekly_plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "timeline_items_related_activity_id_fkey" FOREIGN KEY ("related_activity_id") REFERENCES "planned_activities" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "timeline_items_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "timeline_dependencies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "predecessor_item_id" TEXT NOT NULL,
    "successor_item_id" TEXT NOT NULL,
    "dependency_type" TEXT NOT NULL DEFAULT 'FINISH_TO_START',
    CONSTRAINT "timeline_dependencies_predecessor_item_id_fkey" FOREIGN KEY ("predecessor_item_id") REFERENCES "timeline_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "timeline_dependencies_successor_item_id_fkey" FOREIGN KEY ("successor_item_id") REFERENCES "timeline_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "timeline_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timeline_item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "timeline_comments_timeline_item_id_fkey" FOREIGN KEY ("timeline_item_id") REFERENCES "timeline_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "timeline_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "campuses_name_key" ON "campuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "learner_profiles_user_id_key" ON "learner_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "learner_profiles_candidate_id_key" ON "learner_profiles"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_cohort_id_date_half_day_key" ON "attendance_sessions"("cohort_id", "date", "half_day");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_attendance_session_id_learner_profile_id_key" ON "attendance_records"("attendance_session_id", "learner_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_dependencies_predecessor_item_id_successor_item_id_key" ON "timeline_dependencies"("predecessor_item_id", "successor_item_id");
