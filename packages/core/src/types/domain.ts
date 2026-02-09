/**
 * Core domain types for ContextEmbed
 */

import { z } from 'zod';
import { SynthesizedMetadataSchema } from '../schemas/metadata';

export type ProjectGoal = 'seo_aeo' | 'archive' | 'delivery' | 'stock' | 'social';

export type AssetStatus = 
  | 'pending'
  | 'preprocessing'
  | 'analyzing'
  | 'synthesizing'
  | 'embedding'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'approved';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type JobType = 
  | 'preprocess'
  | 'vision_analysis'
  | 'metadata_synthesis'
  | 'embed'
  | 'verify'
  | 'full_pipeline'
  | 'url_audit'
  | 'export';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  goal: ProjectGoal;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  projectId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  hash: string;
  storagePath: string;
  thumbnailPath?: string;
  previewPath?: string;
  analysisPath?: string;
  originalType: string;
  proxyType?: string;
  width?: number;
  height?: number;
  status: AssetStatus;
  userComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  projectId: string;
  assetId?: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  error?: string;
  metadata?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VisionResult {
  id: string;
  assetId: string;
  modelId: string;
  promptVersion: string;
  inputHash: string;
  result: VisionAnalysis;
  tokensUsed: number;
  processingTimeMs: number;
  createdAt: Date;
}

export interface MetadataResult {
  id: string;
  assetId: string;
  visionResultId: string;
  onboardingProfileId: string;
  modelId: string;
  promptVersion: string;
  inputHash: string;
  result: SynthesizedMetadata;
  tokensUsed: number;
  processingTimeMs: number;
  createdAt: Date;
}

export interface EmbedResult {
  id: string;
  assetId: string;
  metadataResultId: string;
  embeddedPath: string;
  fieldsWritten: string[];
  exiftoolLogs: string;
  verified: boolean;
  verificationDetails?: Record<string, unknown>;
  createdAt: Date;
}

export interface Export {
  id: string;
  projectId: string;
  assetIds: string[];
  destinationType: 'download' | 'folder' | 'cloud';
  destinationConfig?: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputPath?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Vision analysis structure
export interface VisionAnalysis {
  subjects: SubjectInfo[];
  scene: SceneInfo;
  emotions: string[];
  styleCues: string[];
  locationCues: LocationCues;
  notableObjects: string[];
  textFound: TextInfo[];
  qualityIssues: string[];
  colorPalette: string[];
  composition: string;
  rawDescription: string;
}

export interface SubjectInfo {
  type: 'person' | 'animal' | 'object' | 'building' | 'vehicle' | 'nature' | 'food' | 'other';
  description: string;
  prominence: 'primary' | 'secondary' | 'background';
  count?: number;
}

export interface SceneInfo {
  type: 'indoor' | 'outdoor' | 'studio' | 'mixed' | 'abstract';
  setting: string;
  timeOfDay?: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'unknown';
  weather?: string;
}

export interface LocationCues {
  possibleType?: 'urban' | 'rural' | 'suburban' | 'natural' | 'industrial' | 'commercial' | 'unknown';
  landmarks?: string[];
  hints: string[];
  confidence: 'none' | 'low' | 'medium' | 'high';
}

export interface TextInfo {
  text: string;
  type: 'sign' | 'label' | 'overlay' | 'watermark' | 'other';
  language?: string;
}

// Synthesized metadata structure - derived from Zod schema for type safety
export type SynthesizedMetadata = z.infer<typeof SynthesizedMetadataSchema>;

// Re-export confidence and reasoning interfaces for backwards compatibility
export interface MetadataConfidence {
  overall: number;
  headline: number;
  description: number;
  keywords: number;
  location: number;
}

export interface MetadataReasoning {
  headline: string;
  description: string;
  keywords: string;
  location?: string | null;
  general: string;
}
