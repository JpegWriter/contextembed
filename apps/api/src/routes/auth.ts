/**
 * Auth routes (Supabase handles actual auth, this is for user sync)
 */

import { Router, type IRouter } from 'express';
import { userRepository } from '@contextembed/db';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

export const authRouter: IRouter = Router();

/**
 * Get current user profile
 */
authRouter.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const user = await userRepository.findById(userId);
  
  if (!user) {
    throw createApiError('User not found', 404);
  }
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  });
}));

/**
 * Update user profile
 */
authRouter.patch('/me', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { name, avatarUrl } = req.body;
  
  const user = await userRepository.update(userId, {
    name,
    avatarUrl,
  });
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
}));
