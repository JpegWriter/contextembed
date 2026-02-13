-- CreateTable: survival_study_sessions (Guided Study Mode)
CREATE TABLE "survival_study_sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Foundation Study',
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStep" TEXT NOT NULL DEFAULT 'BASELINE_LOCK',
    "baselineIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platformSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survival_study_sessions_pkey" PRIMARY KEY ("id")
);

-- AddColumns: survival_test_runs
ALTER TABLE "survival_test_runs" ADD COLUMN "studySessionId" TEXT;

-- AddColumns: survival_scenario_uploads
ALTER TABLE "survival_scenario_uploads" ADD COLUMN "scenarioType" TEXT;
ALTER TABLE "survival_scenario_uploads" ADD COLUMN "studySessionId" TEXT;

-- CreateIndex
CREATE INDEX "survival_study_sessions_userId_idx" ON "survival_study_sessions"("userId");
CREATE INDEX "survival_study_sessions_status_idx" ON "survival_study_sessions"("status");
CREATE INDEX "survival_study_sessions_createdAt_idx" ON "survival_study_sessions"("createdAt");
CREATE INDEX "survival_test_runs_studySessionId_idx" ON "survival_test_runs"("studySessionId");
CREATE INDEX "survival_scenario_uploads_studySessionId_idx" ON "survival_scenario_uploads"("studySessionId");

-- AddForeignKey: survival_test_runs → survival_study_sessions (SET NULL)
ALTER TABLE "survival_test_runs" ADD CONSTRAINT "survival_test_runs_studySessionId_fkey"
    FOREIGN KEY ("studySessionId") REFERENCES "survival_study_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: survival_scenario_uploads → survival_study_sessions (SET NULL)
ALTER TABLE "survival_scenario_uploads" ADD CONSTRAINT "survival_scenario_uploads_studySessionId_fkey"
    FOREIGN KEY ("studySessionId") REFERENCES "survival_study_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
