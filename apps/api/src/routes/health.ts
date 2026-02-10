/**
 * Health check routes
 */

import { Router, type IRouter } from 'express';
import { prisma } from '@contextembed/db';
import { getDefaultExifToolWriter } from '@contextembed/metadata';
import { createVisionProvider, getDefaultProviderConfig } from '@contextembed/providers';
import { getJobRunnerStatus } from '../services/job-runner';

export const healthRouter: IRouter = Router();

healthRouter.get('/', async (req, res) => {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};
  
  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (error) {
    checks.database = { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Database connection failed' 
    };
  }
  
  // ExifTool check
  try {
    const writer = getDefaultExifToolWriter();
    const health = await writer.healthCheck();
    checks.exiftool = health.healthy 
      ? { status: 'ok', message: `v${health.version}` }
      : { status: 'error', message: health.error };
  } catch (error) {
    checks.exiftool = { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'ExifTool not available' 
    };
  }
  
  // OpenAI check
  try {
    const config = getDefaultProviderConfig();
    const provider = createVisionProvider(config);
    const health = await provider.healthCheck();
    checks.openai = health.healthy 
      ? { status: 'ok' }
      : { status: 'error', message: health.error };
  } catch (error) {
    checks.openai = { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'OpenAI not configured' 
    };
  }
  
  const allHealthy = Object.values(checks).every(c => c.status === 'ok');
  
  // Environment variable presence check (values redacted)
  const envStatus = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    SUPABASE_URL: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    CORS_ORIGIN: process.env.CORS_ORIGIN || '(not set, using localhost:3000)',
  };

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    env: envStatus,
  });
});

/**
 * Queue status endpoint
 */
healthRouter.get('/queue', async (req, res) => {
  try {
    const status = await getJobRunnerStatus();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      queue: status,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get queue status',
    });
  }
});
