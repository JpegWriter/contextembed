/**
 * Job Runner Interface
 * Abstracts job queue processing (in-process, Redis, etc.)
 */

import { Job, JobStatus, JobType } from '../types/domain';

export interface JobRunnerConfig {
  concurrency: number;
  pollInterval: number;
  maxRetries: number;
  retryDelay: number;
}

export interface CreateJobRequest {
  projectId: string;
  assetId?: string;
  type: JobType;
  metadata?: Record<string, unknown>;
  priority?: number;
}

export interface CreateJobResponse {
  success: boolean;
  job?: Job;
  error?: string;
}

export interface JobProgress {
  jobId: string;
  progress: number;
  message?: string;
  stage?: string;
}

export type JobHandler = (job: Job) => Promise<JobResult>;

export interface JobResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface JobEvent {
  type: 'created' | 'started' | 'progress' | 'completed' | 'failed' | 'cancelled';
  job: Job;
  timestamp: Date;
  data?: unknown;
}

export type JobEventCallback = (event: JobEvent) => void;

/**
 * Job Runner interface
 * Implement for different queue backends
 */
export interface IJobRunner {
  readonly runnerId: string;
  
  /**
   * Register a handler for a job type
   */
  registerHandler(type: JobType, handler: JobHandler): void;
  
  /**
   * Create a new job
   */
  createJob(request: CreateJobRequest): Promise<CreateJobResponse>;
  
  /**
   * Create multiple jobs at once
   */
  createJobs(requests: CreateJobRequest[]): Promise<CreateJobResponse[]>;
  
  /**
   * Get a job by ID
   */
  getJob(jobId: string): Promise<Job | null>;
  
  /**
   * Get jobs for a project
   */
  getJobsByProject(projectId: string, status?: JobStatus): Promise<Job[]>;
  
  /**
   * Get jobs for an asset
   */
  getJobsByAsset(assetId: string): Promise<Job[]>;
  
  /**
   * Update job progress
   */
  updateProgress(progress: JobProgress): Promise<void>;
  
  /**
   * Cancel a job
   */
  cancelJob(jobId: string): Promise<boolean>;
  
  /**
   * Start processing jobs
   */
  start(): Promise<void>;
  
  /**
   * Stop processing jobs
   */
  stop(): Promise<void>;
  
  /**
   * Subscribe to job events
   */
  subscribe(callback: JobEventCallback): () => void;
  
  /**
   * Get runner status
   */
  getStatus(): { running: boolean; activeJobs: number; pendingJobs: number };
}

/**
 * Factory function type for creating job runners
 */
export type JobRunnerFactory = (config: JobRunnerConfig) => IJobRunner;
