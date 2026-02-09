/**
 * Pipeline types for the embedding workflow
 */

import { Asset, VisionAnalysis, SynthesizedMetadata, VisionResult, MetadataResult, EmbedResult } from './domain';
import { OnboardingProfile } from './onboarding';

// Pipeline input
export interface PipelineInput {
  asset: Asset;
  onboardingProfile: OnboardingProfile;
  userComment?: string;
  options?: PipelineOptions;
}

export interface PipelineOptions {
  skipPreprocess?: boolean;
  skipVision?: boolean;
  skipEmbed?: boolean;
  forceRerun?: boolean;
  dryRun?: boolean;
}

// Pipeline output
export interface PipelineOutput {
  success: boolean;
  asset: Asset;
  visionResult?: VisionResult;
  metadataResult?: MetadataResult;
  embedResult?: EmbedResult;
  error?: PipelineError;
  timing: PipelineTiming;
}

export interface PipelineError {
  stage: PipelineStage;
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}

export interface PipelineTiming {
  totalMs: number;
  preprocessMs?: number;
  visionMs?: number;
  synthesisMs?: number;
  embedMs?: number;
  verifyMs?: number;
}

export type PipelineStage = 
  | 'preprocess'
  | 'vision'
  | 'synthesis'
  | 'embed'
  | 'verify';

// Preprocessing
export interface PreprocessResult {
  success: boolean;
  asset: Asset;
  thumbnailPath?: string;
  previewPath?: string;
  analysisPath?: string;
  hash: string;
  dimensions?: {
    width: number;
    height: number;
  };
  error?: string;
}

export interface PreprocessOptions {
  thumbnailSize: number;
  previewSize: number;
  analysisSize: number;
  quality: number;
}

// Vision analysis
export interface VisionInput {
  imagePath: string;
  imageUrl?: string;
  imageBase64?: string;
  options?: VisionOptions;
}

export interface VisionOptions {
  maxTokens?: number;
  temperature?: number;
  detailLevel?: 'low' | 'high' | 'auto';
}

export interface VisionOutput {
  success: boolean;
  analysis?: VisionAnalysis;
  modelId: string;
  promptVersion: string;
  tokensUsed: number;
  processingTimeMs: number;
  error?: string;
}

// Metadata synthesis
export interface SynthesisInput {
  visionAnalysis: VisionAnalysis;
  onboardingProfile: OnboardingProfile;
  userComment?: string;
  existingMetadata?: Partial<SynthesizedMetadata>;
}

export interface SynthesisOptions {
  maxTokens?: number;
  temperature?: number;
  enforceLengths?: boolean;
}

export interface SynthesisOutput {
  success: boolean;
  metadata?: SynthesizedMetadata;
  modelId: string;
  promptVersion: string;
  tokensUsed: number;
  processingTimeMs: number;
  error?: string;
}

// Embedding
export interface EmbedInput {
  sourcePath: string;
  outputPath: string;
  metadata: SynthesizedMetadata;
  options?: EmbedOptions;
}

export interface EmbedOptions {
  preserveOriginal?: boolean;
  overwrite?: boolean;
  includeXmp?: boolean;
  includeIptc?: boolean;
  includeExif?: boolean;
}

export interface EmbedOutput {
  success: boolean;
  outputPath?: string;
  fieldsWritten: string[];
  logs: string;
  error?: string;
}

// Verification
export interface VerifyInput {
  filePath: string;
  expectedMetadata: SynthesizedMetadata;
}

export interface VerifyOutput {
  success: boolean;
  verified: boolean;
  fieldsVerified: FieldVerification[];
  missingFields: string[];
  mismatchedFields: FieldMismatch[];
}

export interface FieldVerification {
  field: string;
  expected: string;
  actual: string;
  matches: boolean;
}

export interface FieldMismatch {
  field: string;
  expected: string;
  actual: string;
  reason?: string;
}

// Manifest for auditability
export interface EmbedManifest {
  id: string;
  assetId: string;
  timestamp: Date;
  inputHash: string;
  outputHash: string;
  visionModelId: string;
  visionPromptVersion: string;
  llmModelId: string;
  llmPromptVersion: string;
  onboardingProfileVersion: number;
  fieldsWritten: string[];
  verified: boolean;
  reproduceCommand?: string;
}
