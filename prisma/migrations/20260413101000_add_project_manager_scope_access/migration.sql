-- CreateTable
CREATE TABLE "user_project_accesses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_project_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cohort_accesses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_cohort_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_project_accesses_user_id_project_id_key" ON "user_project_accesses"("user_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_cohort_accesses_user_id_cohort_id_key" ON "user_cohort_accesses"("user_id", "cohort_id");

-- AddForeignKey
ALTER TABLE "user_project_accesses" ADD CONSTRAINT "user_project_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_project_accesses" ADD CONSTRAINT "user_project_accesses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cohort_accesses" ADD CONSTRAINT "user_cohort_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cohort_accesses" ADD CONSTRAINT "user_cohort_accesses_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
