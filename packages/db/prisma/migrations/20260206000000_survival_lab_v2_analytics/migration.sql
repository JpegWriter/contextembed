-- Survival Lab v2: Add scoreV2 to comparisons + analytics tables
-- Migration: 20260206_survival_lab_v2_analytics

-- 1. Add v2 columns to survival_comparisons
ALTER TABLE "survival_comparisons"
  ADD COLUMN IF NOT EXISTS "scoreV2" INTEGER,
  ADD COLUMN IF NOT EXISTS "survivalClass" TEXT,
  ADD COLUMN IF NOT EXISTS "diffReport" JSONB;

-- 2. Create survival_platform_stats
CREATE TABLE IF NOT EXISTS "survival_platform_stats" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "platformId" TEXT NOT NULL,
  "totalRuns" INTEGER NOT NULL DEFAULT 0,
  "totalScenarios" INTEGER NOT NULL DEFAULT 0,
  "avgScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avgScoreV2" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bestScore" INTEGER NOT NULL DEFAULT 0,
  "worstScore" INTEGER NOT NULL DEFAULT 100,
  "exifRetention" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "xmpRetention" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "iptcRetention" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "creatorSurvived" INTEGER NOT NULL DEFAULT 0,
  "creatorTotal" INTEGER NOT NULL DEFAULT 0,
  "copyrightSurvived" INTEGER NOT NULL DEFAULT 0,
  "copyrightTotal" INTEGER NOT NULL DEFAULT 0,
  "creditSurvived" INTEGER NOT NULL DEFAULT 0,
  "creditTotal" INTEGER NOT NULL DEFAULT 0,
  "descSurvived" INTEGER NOT NULL DEFAULT 0,
  "descTotal" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survival_platform_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "survival_platform_stats_platformId_key"
  ON "survival_platform_stats"("platformId");

ALTER TABLE "survival_platform_stats"
  ADD CONSTRAINT "survival_platform_stats_platformId_fkey"
  FOREIGN KEY ("platformId") REFERENCES "survival_platforms"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Create survival_platform_trends
CREATE TABLE IF NOT EXISTS "survival_platform_trends" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "platformId" TEXT NOT NULL,
  "scenarioUploadId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "scoreV2" INTEGER,
  "survivalClass" TEXT,
  "scenario" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "survival_platform_trends_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "survival_platform_trends_platformId_createdAt_idx"
  ON "survival_platform_trends"("platformId", "createdAt");

ALTER TABLE "survival_platform_trends"
  ADD CONSTRAINT "survival_platform_trends_platformId_fkey"
  FOREIGN KEY ("platformId") REFERENCES "survival_platforms"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
