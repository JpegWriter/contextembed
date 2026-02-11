/**
 * Project routes
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { projectRepository, assetRepository, onboardingProfileRepository } from '@contextembed/db';
import { CreateProjectInputSchema } from '@contextembed/core';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';

export const projectsRouter: IRouter = Router();

/**
 * List user's projects
 */
projectsRouter.get('/', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const projects = await projectRepository.findByUserWithCover(userId);
  
  res.json({
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      goal: p.goal,
      onboardingCompleted: p.onboardingCompleted,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      coverAssetId: p.coverAssetId,
    })),
  });
}));

/**
 * Get single project
 */
projectsRouter.get('/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const project = await projectRepository.findByIdWithProfile(id);
  
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  // Get asset counts
  const assetCounts = await assetRepository.countByStatus(id);
  
  res.json({
    project: {
      id: project.id,
      name: project.name,
      goal: project.goal,
      onboardingCompleted: project.onboardingCompleted,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      onboardingProfile: project.onboardingProfile,
      assetCounts,
    },
  });
}));

/**
 * Create new project
 */
projectsRouter.post('/', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const input = CreateProjectInputSchema.parse(req.body);
  
  const project = await projectRepository.create({
    userId,
    name: input.name,
    goal: input.goal,
  });
  
  // Auto-create onboarding profile with initial data from project creation modal
  if (input.eventLocation || input.eventDate || input.galleryContext || input.description) {
    await onboardingProfileRepository.upsertInitial({
      projectId: project.id,
      projectName: input.name,
      primaryGoal: input.goal,
      confirmedContext: {
        brandName: input.name,
        eventLocation: input.eventLocation || '',
        eventDate: input.eventDate || '',
        galleryContext: input.galleryContext || '',
      },
    });
  }
  
  res.status(201).json({
    project: {
      id: project.id,
      name: project.name,
      description: input.description,
      goal: project.goal,
      onboardingCompleted: project.onboardingCompleted,
      createdAt: project.createdAt,
    },
  });
}));

/**
 * Update project
 */
projectsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const existing = await projectRepository.findById(id);
  
  if (!existing || existing.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  const UpdateSchema = z.object({
    name: z.string().min(1).max(256).optional(),
    goal: z.enum(['seo_aeo', 'archive', 'delivery', 'stock', 'social']).optional(),
    visualAuthenticityPolicy: z.enum(['conditional', 'deny_ai_proof', 'allow']).optional(),
  });
  
  const input = UpdateSchema.parse(req.body);
  
  // If startup mode is enabled, policy cannot be changed
  if (input.visualAuthenticityPolicy && existing.startupModeEnabled) {
    throw createApiError('Visual authenticity policy is locked in Startup Mode', 400);
  }
  
  const project = await projectRepository.update(id, input);
  
  res.json({
    project: {
      id: project.id,
      name: project.name,
      goal: project.goal,
      onboardingCompleted: project.onboardingCompleted,
      visualAuthenticityPolicy: project.visualAuthenticityPolicy ?? 'conditional',
      startupModeEnabled: project.startupModeEnabled,
      updatedAt: project.updatedAt,
    },
  });
}));

/**
 * Enable startup mode (locks policy to deny_ai_proof)
 */
projectsRouter.post('/:id/enable-startup-mode', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const existing = await projectRepository.findById(id);
  
  if (!existing || existing.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  const project = await projectRepository.enableStartupMode(id);
  
  res.json({
    project: {
      id: project.id,
      name: project.name,
      startupModeEnabled: project.startupModeEnabled,
      visualAuthenticityPolicy: project.visualAuthenticityPolicy,
    },
    message: 'Startup Mode enabled. Visual authenticity policy locked to "deny_ai_proof".',
  });
}));

/**
 * Delete project
 */
projectsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const existing = await projectRepository.findById(id);
  
  if (!existing || existing.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  await projectRepository.delete(id);
  
  res.status(204).send();
}));
