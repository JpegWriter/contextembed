import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { growthImageRepository, projectRepository } from '@contextembed/db';
import { asyncHandler, createApiError } from '../middleware/error-handler.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const growthRouter: IRouter = Router();

/**
 * Get all growth images for a project
 */
growthRouter.get('/projects/:projectId/images', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  
  const project = await projectRepository.findById(projectId);
  
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  const images = await growthImageRepository.findByProject(projectId);
  
  res.json({
    images: images.map(img => ({
      id: img.id,
      filename: img.filename,
      role: img.role,
      aiGenerated: img.aiGenerated,
      aiConfidence: img.aiConfidence,
      governanceStatus: img.governanceStatus,
      governanceReason: img.governanceReason,
      createdAt: img.createdAt,
      updatedAt: img.updatedAt,
    })),
  });
}));

/**
 * Get a single growth image
 */
growthRouter.get('/images/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const image = await growthImageRepository.findById(id);
  
  if (!image) {
    throw createApiError('Image not found', 404);
  }
  
  const project = await projectRepository.findById(image.projectId);
  
  if (!project || project.userId !== userId) {
    throw createApiError('Image not found', 404);
  }
  
  res.json({
    image: {
      id: image.id,
      filename: image.filename,
      storagePath: image.storagePath,
      role: image.role,
      aiGenerated: image.aiGenerated,
      aiConfidence: image.aiConfidence,
      governanceStatus: image.governanceStatus,
      governanceReason: image.governanceReason,
      decisionLog: image.decisionLog,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    },
  });
}));

/**
 * Update growth image role (retry flow)
 * This allows re-running governance without re-uploading the image
 */
growthRouter.patch('/images/:id/role', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const RoleUpdateSchema = z.object({
    role: z.enum(['proof', 'hero', 'decorative', 'stock']),
    reason: z.string().min(1).max(500).optional(),
  });
  
  const { role, reason } = RoleUpdateSchema.parse(req.body);
  
  const image = await growthImageRepository.findById(id);
  
  if (!image) {
    throw createApiError('Image not found', 404);
  }
  
  const project = await projectRepository.findById(image.projectId);
  
  if (!project || project.userId !== userId) {
    throw createApiError('Image not found', 404);
  }
  
  // Get effective policy
  const effectivePolicy = await projectRepository.getEffectivePolicy(image.projectId);
  
  // Determine new governance status based on role change and policy
  let newGovernanceStatus: 'pending' | 'approved' | 'blocked' | 'warning' = 'pending';
  let newGovernanceReason: string | null = null;
  
  if (image.aiGenerated) {
    switch (effectivePolicy) {
      case 'deny_ai_proof':
        if (role === 'proof') {
          newGovernanceStatus = 'blocked';
          newGovernanceReason = 'AI-generated images cannot be used as proof in deny_ai_proof policy';
        } else if (role === 'decorative' || role === 'stock') {
          // Decorative/stock is allowed for AI images
          newGovernanceStatus = 'approved';
          newGovernanceReason = 'AI-generated image approved as decorative/stock';
        } else if (role === 'hero') {
          newGovernanceStatus = 'warning';
          newGovernanceReason = 'AI-generated hero image - verify brand guidelines';
        }
        break;
        
      case 'conditional':
        if (role === 'proof') {
          newGovernanceStatus = 'warning';
          newGovernanceReason = 'AI-generated proof image requires manual review';
        } else {
          newGovernanceStatus = 'approved';
          newGovernanceReason = 'AI-generated image approved for non-proof use';
        }
        break;
        
      case 'allow':
        newGovernanceStatus = 'approved';
        newGovernanceReason = 'All AI content allowed per project policy';
        break;
    }
  } else {
    // Non-AI images are generally approved
    newGovernanceStatus = 'approved';
    newGovernanceReason = 'Authentic image approved';
  }
  
  // Update role (this appends to decision log)
  const updatedImage = await growthImageRepository.updateRole(
    id,
    role,
    reason || `Role changed to ${role}`
  );
  
  // Update governance status
  const finalImage = await growthImageRepository.updateGovernance(id, {
    governanceStatus: newGovernanceStatus,
    governanceReason: newGovernanceReason || undefined,
  });
  
  res.json({
    image: {
      id: finalImage.id,
      filename: finalImage.filename,
      role: finalImage.role,
      aiGenerated: finalImage.aiGenerated,
      governanceStatus: finalImage.governanceStatus,
      governanceReason: finalImage.governanceReason,
      decisionLog: finalImage.decisionLog,
      updatedAt: finalImage.updatedAt,
    },
    message: `Image role updated to "${role}". Governance status: ${finalImage.governanceStatus}`,
  });
}));

/**
 * Re-run governance check without changing role
 */
growthRouter.post('/images/:id/recheck-governance', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const image = await growthImageRepository.findById(id);
  
  if (!image) {
    throw createApiError('Image not found', 404);
  }
  
  const project = await projectRepository.findById(image.projectId);
  
  if (!project || project.userId !== userId) {
    throw createApiError('Image not found', 404);
  }
  
  const effectivePolicy = await projectRepository.getEffectivePolicy(image.projectId);
  
  // Re-evaluate governance
  let newGovernanceStatus: 'pending' | 'approved' | 'blocked' | 'warning' = 'approved';
  let newGovernanceReason: string | null = 'Governance rechecked';
  
  if (image.aiGenerated) {
    switch (effectivePolicy) {
      case 'deny_ai_proof':
        if (image.role === 'proof') {
          newGovernanceStatus = 'blocked';
          newGovernanceReason = 'AI-generated images cannot be used as proof';
        } else if (image.role === 'hero') {
          newGovernanceStatus = 'warning';
          newGovernanceReason = 'AI-generated hero image - review recommended';
        } else {
          newGovernanceStatus = 'approved';
          newGovernanceReason = 'AI-generated decorative/stock image approved';
        }
        break;
        
      case 'conditional':
        if (image.role === 'proof') {
          newGovernanceStatus = 'warning';
          newGovernanceReason = 'AI-generated proof requires manual review';
        } else {
          newGovernanceStatus = 'approved';
          newGovernanceReason = 'AI-generated image conditionally approved';
        }
        break;
        
      case 'allow':
        newGovernanceStatus = 'approved';
        newGovernanceReason = 'All AI content allowed per policy';
        break;
    }
  }
  
  const updatedImage = await growthImageRepository.updateGovernance(id, {
    governanceStatus: newGovernanceStatus,
    governanceReason: newGovernanceReason || undefined,
  });
  
  res.json({
    image: {
      id: updatedImage.id,
      filename: updatedImage.filename,
      role: updatedImage.role,
      governanceStatus: updatedImage.governanceStatus,
      governanceReason: updatedImage.governanceReason,
      decisionLog: updatedImage.decisionLog,
    },
    effectivePolicy,
  });
}));

/**
 * Delete a growth image
 */
growthRouter.delete('/images/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const image = await growthImageRepository.findById(id);
  
  if (!image) {
    throw createApiError('Image not found', 404);
  }
  
  const project = await projectRepository.findById(image.projectId);
  
  if (!project || project.userId !== userId) {
    throw createApiError('Image not found', 404);
  }
  
  await growthImageRepository.delete(id);
  
  res.json({ success: true });
}));
