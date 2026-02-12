-- Migration: Add Public Verification System
-- Date: 2026-02-11
-- Description: Adds quiet, dispute-only verification tokens for forensic-grade proof

-- ============================================
-- STEP 1: Add fields to projects table
-- ============================================

ALTER TABLE "projects" 
ADD COLUMN "publicVerificationDefaultEnabled" BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- STEP 2: Add fields to growth_images table
-- ============================================

ALTER TABLE "growth_images"
ADD COLUMN "publicVerificationEnabled" BOOLEAN,
ADD COLUMN "verificationToken" UUID UNIQUE,
ADD COLUMN "verificationCreatedAt" TIMESTAMPTZ,
ADD COLUMN "verificationRevokedAt" TIMESTAMPTZ,
ADD COLUMN "verificationLastCheckedAt" TIMESTAMPTZ;

-- Create index for token lookups (public endpoint)
CREATE UNIQUE INDEX "growth_images_verificationToken_key" 
ON "growth_images" ("verificationToken") 
WHERE "verificationToken" IS NOT NULL;

-- ============================================
-- STEP 3: Create verification_logs table
-- ============================================

CREATE TABLE "verification_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "verificationToken" UUID NOT NULL,
  "assetId" TEXT NOT NULL,
  "projectId" UUID,
  "checkedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ipHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "result" TEXT NOT NULL,
  "checksumProvided" BOOLEAN DEFAULT false,
  "checksumMatched" BOOLEAN
);

-- Indexes for rate limiting and audit queries
CREATE INDEX "verification_logs_token_checkedAt_idx" 
ON "verification_logs" ("verificationToken", "checkedAt");

CREATE INDEX "verification_logs_assetId_idx" 
ON "verification_logs" ("assetId");

CREATE INDEX "verification_logs_ipHash_checkedAt_idx" 
ON "verification_logs" ("ipHash", "checkedAt");

-- ============================================
-- STEP 4: RLS Policies (Supabase)
-- ============================================

-- Enable RLS on verification_logs
ALTER TABLE "verification_logs" ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (API server)
CREATE POLICY "verification_logs_insert_service_only" 
ON "verification_logs" 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- No public reads on verification_logs
CREATE POLICY "verification_logs_no_public_read" 
ON "verification_logs" 
FOR SELECT 
TO anon, authenticated 
USING (false);

-- Service role can read for analytics
CREATE POLICY "verification_logs_service_read" 
ON "verification_logs" 
FOR SELECT 
TO service_role 
USING (true);

-- ============================================
-- STEP 5: Add export setting for verification link embedding
-- ============================================

ALTER TABLE "projects"
ADD COLUMN "embedVerificationLink" BOOLEAN NOT NULL DEFAULT false;
