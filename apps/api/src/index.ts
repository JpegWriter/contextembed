/**
 * ContextEmbed API Server
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { projectsRouter } from './routes/projects';
import { onboardingRouter } from './routes/onboarding';
import { assetsRouter } from './routes/assets';
import { jobsRouter } from './routes/jobs';
import { exportsRouter } from './routes/exports';
import { healthRouter } from './routes/health';
import { growthRouter } from './routes/growth';
import { userProfileRouter } from './routes/user-profile';
import { authorshipRouter } from './routes/authorship';
import { wordpressRouter } from './routes/wordpress';
import { altTextRouter } from './routes/alt-text';
import iaRouter from './routes/ia';
import copilotRouter from './routes/copilot';
import { operatorRouter } from './routes/operator';
import { billingRouter, handleStripeWebhook } from './routes/billing';
import { verificationRouter } from './routes/verification';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { startJobRunner, stopJobRunner } from './services/job-runner';
import { initStorage, stopCleanupScheduler } from './services/storage';
import { closeDefaultExifToolWriter } from '@contextembed/metadata';
import survivalLabRouter from './routes/survival-lab';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

// Stripe webhook needs raw body (before JSON parsing)
app.post('/billing/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (no auth)
app.use('/health', healthRouter);

// Auth routes
app.use('/auth', authRouter);

// Public file serving (thumbnails only, no auth required)
// This is safe because thumbnails are low-res and asset IDs are unguessable
import { assetRepository } from '@contextembed/db';
import pathModule from 'path';

app.get('/files/:assetId/thumbnail', async (req, res) => {
  try {
    const asset = await assetRepository.findById(req.params.assetId);
    if (!asset || !asset.thumbnailPath) {
      res.status(404).send('Not found');
      return;
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // If thumbnailPath is a URL (Supabase Storage), redirect to it
    if (asset.thumbnailPath.startsWith('http://') || asset.thumbnailPath.startsWith('https://')) {
      res.redirect(asset.thumbnailPath);
      return;
    }
    
    res.sendFile(pathModule.resolve(asset.thumbnailPath));
  } catch (err) {
    res.status(500).send('Error');
  }
});

// Protected routes
app.use('/user-profile', authMiddleware, userProfileRouter);
app.use('/projects', authMiddleware, projectsRouter);
app.use('/onboarding', authMiddleware, onboardingRouter);
app.use('/assets', authMiddleware, assetsRouter);
app.use('/jobs', authMiddleware, jobsRouter);
app.use('/exports', optionalAuthMiddleware, exportsRouter); // Optional auth for download with token
app.use('/growth', authMiddleware, growthRouter); // Growth image governance
app.use('/authorship', authMiddleware, authorshipRouter); // Authorship Integrity Engine
app.use('/wordpress', authMiddleware, wordpressRouter); // WordPress alt text injection
app.use('/alt-text', authMiddleware, altTextRouter);    // Alt Text Engine
app.use('/copilot', copilotRouter); // Copilot AI assistant (has own auth)
app.use('/survival', authMiddleware, survivalLabRouter); // Survival Lab - Metadata Study
app.use('/operator', authMiddleware, operatorRouter); // CE Support Operator v1
app.use('/billing', authMiddleware, billingRouter); // Stripe billing (checkout, portal, status)

// Verification routes (mixed auth: some public, some authenticated)
app.use('/verification', verificationRouter); // Authenticated asset/project verification management
app.use('/verify', verificationRouter); // Public verification endpoint (no auth, rate limited)

// Admin routes (consider adding admin auth middleware)
app.use('/admin/ia', iaRouter);

// Error handling
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 ContextEmbed API running on http://localhost:${PORT}`);
  
  // Initialize storage
  await initStorage();
  
  // Start job runner (async - supports BullMQ)
  await startJobRunner();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  stopCleanupScheduler();
  await stopJobRunner();
  await closeDefaultExifToolWriter();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  stopCleanupScheduler();
  await stopJobRunner();
  await closeDefaultExifToolWriter();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
