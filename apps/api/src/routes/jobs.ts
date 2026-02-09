/**
 * Jobs routes
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { 
  projectRepository, 
  jobRepository,
  assetRepository,
  Prisma,
} from '@contextembed/db';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';

export const jobsRouter: IRouter = Router();

/**
 * List jobs for a project
 */
jobsRouter.get('/project/:projectId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  const { status } = req.query;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  const jobs = await jobRepository.findByProject(
    projectId,
    status as any
  );
  
  res.json({
    jobs: jobs.map(j => ({
      id: j.id,
      assetId: j.assetId,
      type: j.type,
      status: j.status,
      progress: j.progress,
      error: j.error,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      createdAt: j.createdAt,
    })),
  });
}));

/**
 * Get single job
 */
jobsRouter.get('/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const job = await jobRepository.findById(id);
  
  if (!job) {
    throw createApiError('Job not found', 404);
  }
  
  // Verify project ownership
  const project = await projectRepository.findById(job.projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Job not found', 404);
  }
  
  res.json({
    job: {
      id: job.id,
      projectId: job.projectId,
      assetId: job.assetId,
      type: job.type,
      status: job.status,
      progress: job.progress,
      error: job.error,
      metadata: job.metadata,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
    },
  });
}));

/**
 * Cancel a job
 */
jobsRouter.post('/:id/cancel', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const job = await jobRepository.findById(id);
  
  if (!job) {
    throw createApiError('Job not found', 404);
  }
  
  // Verify project ownership
  const project = await projectRepository.findById(job.projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Job not found', 404);
  }
  
  if (job.status !== 'pending' && job.status !== 'running') {
    throw createApiError('Job cannot be cancelled', 400);
  }
  
  await jobRepository.update(id, {
    status: 'cancelled',
    completedAt: new Date(),
  });
  
  res.json({ success: true });
}));

/**
 * Retry a failed job
 */
jobsRouter.post('/:id/retry', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const job = await jobRepository.findById(id);
  
  if (!job) {
    throw createApiError('Job not found', 404);
  }
  
  // Verify project ownership
  const project = await projectRepository.findById(job.projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Job not found', 404);
  }
  
  if (job.status !== 'failed') {
    throw createApiError('Only failed jobs can be retried', 400);
  }
  
  // Create a new job
  const newJob = await jobRepository.create({
    projectId: job.projectId,
    assetId: job.assetId || undefined,
    type: job.type,
    metadata: (job.metadata as Prisma.InputJsonValue) || undefined,
  });
  
  res.status(201).json({
    job: {
      id: newJob.id,
      assetId: newJob.assetId,
      type: newJob.type,
      status: newJob.status,
    },
  });
}));

/**
 * Get job stats for a project
 */
jobsRouter.get('/project/:projectId/stats', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  const [pending, running, completed, failed] = await Promise.all([
    jobRepository.findByProject(projectId, 'pending'),
    jobRepository.findByProject(projectId, 'running'),
    jobRepository.findByProject(projectId, 'completed'),
    jobRepository.findByProject(projectId, 'failed'),
  ]);
  
  res.json({
    stats: {
      pending: pending.length,
      running: running.length,
      completed: completed.length,
      failed: failed.length,
      total: pending.length + running.length + completed.length + failed.length,
    },
  });
}));
