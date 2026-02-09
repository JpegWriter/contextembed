/**
 * Auth middleware using Supabase JWT
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { userRepository } from '@contextembed/db';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    
    // Ensure user exists in our database (use email as the unique identifier)
    let dbUser = await userRepository.findByEmail(user.email!);
    
    if (!dbUser) {
      // Create user on first access
      try {
        dbUser = await userRepository.create({
          email: user.email!,
          name: user.user_metadata?.full_name,
          avatarUrl: user.user_metadata?.avatar_url,
        });
      } catch (createError) {
        // User might have been created by another request, try fetching again
        dbUser = await userRepository.findByEmail(user.email!);
        if (!dbUser) {
          throw createError;
        }
      }
    }
    
    // Attach user info to request
    (req as AuthenticatedRequest).userId = dbUser.id;
    (req as AuthenticatedRequest).userEmail = dbUser.email;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional auth - attaches user if token present, but doesn't require it
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  
  await authMiddleware(req, res, next);
}
