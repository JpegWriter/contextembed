-- Migration: Add Survival Lab Tables
-- Date: 2026-02-12
-- Description: Creates all tables for the CE Metadata Survival Study

-- ============================================
-- STEP 1: survival_platforms
-- ============================================

CREATE TABLE "survival_platforms" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "freeTier" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survival_platforms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "survival_platforms_slug_key" ON "survival_platforms"("slug");

-- ============================================
-- STEP 2: survival_baseline_images
-- ============================================

CREATE TABLE "survival_baseline_images" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "bytes" BIGINT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survival_baseline_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "survival_baseline_images_userId_idx" ON "survival_baseline_images"("userId");

-- ============================================
-- STEP 3: survival_test_runs
-- ============================================

CREATE TABLE "survival_test_runs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platformId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "accountType" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survival_test_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "survival_test_runs_userId_idx" ON "survival_test_runs"("userId");
CREATE INDEX "survival_test_runs_platformId_idx" ON "survival_test_runs"("platformId");

ALTER TABLE "survival_test_runs"
  ADD CONSTRAINT "survival_test_runs_platformId_fkey"
  FOREIGN KEY ("platformId") REFERENCES "survival_platforms"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- STEP 4: survival_test_run_assets
-- ============================================

CREATE TABLE "survival_test_run_assets" (
  "id" TEXT NOT NULL,
  "testRunId" TEXT NOT NULL,
  "baselineImageId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survival_test_run_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "survival_test_run_assets_testRunId_baselineImageId_key"
  ON "survival_test_run_assets"("testRunId", "baselineImageId");
CREATE INDEX "survival_test_run_assets_testRunId_idx" ON "survival_test_run_assets"("testRunId");
CREATE INDEX "survival_test_run_assets_baselineImageId_idx" ON "survival_test_run_assets"("baselineImageId");

ALTER TABLE "survival_test_run_assets"
  ADD CONSTRAINT "survival_test_run_assets_testRunId_fkey"
  FOREIGN KEY ("testRunId") REFERENCES "survival_test_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "survival_test_run_assets"
  ADD CONSTRAINT "survival_test_run_assets_baselineImageId_fkey"
  FOREIGN KEY ("baselineImageId") REFERENCES "survival_baseline_images"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- STEP 5: survival_scenario_uploads
-- ============================================

CREATE TABLE "survival_scenario_uploads" (
  "id" TEXT NOT NULL,
  "testRunId" TEXT NOT NULL,
  "baselineImageId" TEXT NOT NULL,
  "scenario" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "bytes" BIGINT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survival_scenario_uploads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "survival_scenario_uploads_testRunId_idx" ON "survival_scenario_uploads"("testRunId");
CREATE INDEX "survival_scenario_uploads_baselineImageId_idx" ON "survival_scenario_uploads"("baselineImageId");

ALTER TABLE "survival_scenario_uploads"
  ADD CONSTRAINT "survival_scenario_uploads_testRunId_fkey"
  FOREIGN KEY ("testRunId") REFERENCES "survival_test_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "survival_scenario_uploads"
  ADD CONSTRAINT "survival_scenario_uploads_baselineImageId_fkey"
  FOREIGN KEY ("baselineImageId") REFERENCES "survival_baseline_images"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- STEP 6: survival_metadata_reports
-- ============================================

CREATE TABLE "survival_metadata_reports" (
  "id" TEXT NOT NULL,
  "fileKind" TEXT NOT NULL,
  "baselineImageId" TEXT NOT NULL,
  "scenarioUploadId" TEXT,
  "exifPresent" BOOLEAN NOT NULL,
  "xmpPresent" BOOLEAN NOT NULL,
  "iptcPresent" BOOLEAN NOT NULL,
  "creatorValue" TEXT,
  "rightsValue" TEXT,
  "creditValue" TEXT,
  "descriptionValue" TEXT,
  "encodingOk" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "rawJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survival_metadata_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "survival_metadata_reports_baselineImageId_idx" ON "survival_metadata_reports"("baselineImageId");
CREATE INDEX "survival_metadata_reports_scenarioUploadId_idx" ON "survival_metadata_reports"("scenarioUploadId");

ALTER TABLE "survival_metadata_reports"
  ADD CONSTRAINT "survival_metadata_reports_baselineImageId_fkey"
  FOREIGN KEY ("baselineImageId") REFERENCES "survival_baseline_images"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "survival_metadata_reports"
  ADD CONSTRAINT "survival_metadata_reports_scenarioUploadId_fkey"
  FOREIGN KEY ("scenarioUploadId") REFERENCES "survival_scenario_uploads"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- STEP 7: survival_comparisons
-- ============================================

CREATE TABLE "survival_comparisons" (
  "id" TEXT NOT NULL,
  "baselineImageId" TEXT NOT NULL,
  "scenarioUploadId" TEXT NOT NULL,
  "survivalScore" INTEGER NOT NULL,
  "creatorOk" BOOLEAN NOT NULL,
  "rightsOk" BOOLEAN NOT NULL,
  "creditOk" BOOLEAN NOT NULL,
  "descriptionOk" BOOLEAN NOT NULL,
  "dimsChanged" BOOLEAN NOT NULL,
  "filenameChanged" BOOLEAN NOT NULL,
  "fieldsMissing" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survival_comparisons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "survival_comparisons_scenarioUploadId_key" ON "survival_comparisons"("scenarioUploadId");
CREATE INDEX "survival_comparisons_baselineImageId_idx" ON "survival_comparisons"("baselineImageId");

ALTER TABLE "survival_comparisons"
  ADD CONSTRAINT "survival_comparisons_baselineImageId_fkey"
  FOREIGN KEY ("baselineImageId") REFERENCES "survival_baseline_images"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "survival_comparisons"
  ADD CONSTRAINT "survival_comparisons_scenarioUploadId_fkey"
  FOREIGN KEY ("scenarioUploadId") REFERENCES "survival_scenario_uploads"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
