/**
 * BullMQ Queue Service
 * Redis-backed job queue for production-grade processing
 * 
 * Handles:
 * - Rate limiting against OpenAI API
 * - Retry with exponential backoff
 * - Concurrent job limits
 * - Job prioritization
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

// Redis connection
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });
    
    redisConnection.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    redisConnection.on('connect', () => {
      console.log('🔗 Redis connected');
    });
  }
  return redisConnection;
}

// Job types
export interface ProcessJobData {
  jobId: string;
  assetId: string;
  projectId: string;
  type: 'full_pipeline' | 'vision_analysis' | 'metadata_synthesis' | 'embed';
  priority?: number; // Lower = higher priority
  userId?: string;
}

export interface ExportJobData {
  exportId: string;
  projectId: string;
  assetIds: string[];
  preset?: string;
  userId?: string;
}

// Queue names
export const QUEUES = {
  PROCESS: 'contextembed:process',
  EXPORT: 'contextembed:export',
} as const;

// Queue configuration
const QUEUE_CONFIG = {
  // OpenAI Tier 4: 10,000 RPM, 2M TPM
  // Each image = ~3 API calls, ~3000 tokens
  // Safe limit: 200 images/min = 600 RPM, 600k TPM (plenty of headroom)
  
  process: {
    concurrency: 10, // 10 concurrent AI jobs
    limiter: {
      max: 200, // 200 jobs per minute
      duration: 60_000,
    },
  },
  export: {
    concurrency: 5, // 5 concurrent exports
    limiter: {
      max: 50,
      duration: 60_000,
    },
  },
};

// Queues
let processQueue: Queue<ProcessJobData> | null = null;
let exportQueue: Queue<ExportJobData> | null = null;

// Workers
let processWorker: Worker<ProcessJobData> | null = null;
let exportWorker: Worker<ExportJobData> | null = null;

// Queue events
let processQueueEvents: QueueEvents | null = null;

/**
 * Initialize queues
 */
export async function initQueues(): Promise<void> {
  const connection = getRedisConnection();
  
  processQueue = new Queue(QUEUES.PROCESS, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 10s, 20s
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000,
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    },
  });
  
  exportQueue = new Queue(QUEUES.EXPORT, {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 10000,
      },
      removeOnComplete: {
        age: 7200,
        count: 500,
      },
      removeOnFail: {
        age: 86400,
      },
    },
  });
  
  processQueueEvents = new QueueEvents(QUEUES.PROCESS, { connection });
  
  console.log('📨 Queues initialized');
}

/**
 * Start queue workers
 */
export async function startWorkers(
  processHandler: (job: Job<ProcessJobData>) => Promise<void>,
  exportHandler: (job: Job<ExportJobData>) => Promise<void>
): Promise<void> {
  const connection = getRedisConnection();
  
  processWorker = new Worker(
    QUEUES.PROCESS,
    processHandler,
    {
      connection,
      concurrency: QUEUE_CONFIG.process.concurrency,
      limiter: QUEUE_CONFIG.process.limiter,
    }
  );
  
  processWorker.on('completed', (job) => {
    console.log(`✅ Process job ${job.id} completed`);
  });
  
  processWorker.on('failed', (job, err) => {
    console.error(`❌ Process job ${job?.id} failed:`, err.message);
  });
  
  processWorker.on('error', (err) => {
    console.error('Process worker error:', err);
  });
  
  exportWorker = new Worker(
    QUEUES.EXPORT,
    exportHandler,
    {
      connection,
      concurrency: QUEUE_CONFIG.export.concurrency,
      limiter: QUEUE_CONFIG.export.limiter,
    }
  );
  
  exportWorker.on('completed', (job) => {
    console.log(`✅ Export job ${job.id} completed`);
  });
  
  exportWorker.on('failed', (job, err) => {
    console.error(`❌ Export job ${job?.id} failed:`, err.message);
  });
  
  console.log('👷 Workers started');
}

/**
 * Stop workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  const closePromises: Promise<void>[] = [];
  
  if (processWorker) {
    closePromises.push(processWorker.close());
  }
  if (exportWorker) {
    closePromises.push(exportWorker.close());
  }
  if (processQueueEvents) {
    closePromises.push(processQueueEvents.close());
  }
  if (processQueue) {
    closePromises.push(processQueue.close());
  }
  if (exportQueue) {
    closePromises.push(exportQueue.close());
  }
  if (redisConnection) {
    closePromises.push(Promise.resolve(redisConnection.disconnect()));
  }
  
  await Promise.all(closePromises);
  console.log('👷 Workers stopped');
}

/**
 * Add a process job to the queue
 */
export async function addProcessJob(data: ProcessJobData): Promise<Job<ProcessJobData>> {
  if (!processQueue) {
    throw new Error('Process queue not initialized');
  }
  
  const job = await processQueue.add(
    data.type,
    data,
    {
      priority: data.priority || 10, // Default priority
      jobId: `process:${data.jobId}`, // Prevent duplicates
    }
  );
  
  console.log(`📥 Process job ${job.id} queued (${data.type})`);
  return job;
}

/**
 * Add an export job to the queue
 */
export async function addExportJob(data: ExportJobData): Promise<Job<ExportJobData>> {
  if (!exportQueue) {
    throw new Error('Export queue not initialized');
  }
  
  const job = await exportQueue.add(
    'export',
    data,
    {
      priority: 5, // Exports are high priority
      jobId: `export:${data.exportId}`,
    }
  );
  
  console.log(`📥 Export job ${job.id} queued`);
  return job;
}

/**
 * Get queue stats
 */
export async function getQueueStats(): Promise<{
  process: { waiting: number; active: number; completed: number; failed: number };
  export: { waiting: number; active: number; completed: number; failed: number };
}> {
  if (!processQueue || !exportQueue) {
    throw new Error('Queues not initialized');
  }
  
  const [processStats, exportStats] = await Promise.all([
    Promise.all([
      processQueue.getWaitingCount(),
      processQueue.getActiveCount(),
      processQueue.getCompletedCount(),
      processQueue.getFailedCount(),
    ]),
    Promise.all([
      exportQueue.getWaitingCount(),
      exportQueue.getActiveCount(),
      exportQueue.getCompletedCount(),
      exportQueue.getFailedCount(),
    ]),
  ]);
  
  return {
    process: {
      waiting: processStats[0],
      active: processStats[1],
      completed: processStats[2],
      failed: processStats[3],
    },
    export: {
      waiting: exportStats[0],
      active: exportStats[1],
      completed: exportStats[2],
      failed: exportStats[3],
    },
  };
}

/**
 * Wait for a job to complete
 */
export async function waitForJob(jobId: string, timeout = 300_000): Promise<void> {
  if (!processQueueEvents) {
    throw new Error('Queue events not initialized');
  }
  
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Job timed out'));
    }, timeout);
    
    processQueueEvents!.on('completed', ({ jobId: completedId }) => {
      if (completedId === `process:${jobId}`) {
        clearTimeout(timer);
        resolve();
      }
    });
    
    processQueueEvents!.on('failed', ({ jobId: failedId, failedReason }) => {
      if (failedId === `process:${jobId}`) {
        clearTimeout(timer);
        reject(new Error(failedReason));
      }
    });
  });
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisConnection !== null && redisConnection.status === 'ready';
}

/**
 * Graceful shutdown handler
 */
export async function gracefulShutdown(): Promise<void> {
  console.log('🛑 Graceful shutdown initiated...');
  
  // Stop accepting new jobs
  if (processWorker) {
    await processWorker.pause();
  }
  if (exportWorker) {
    await exportWorker.pause();
  }
  
  // Wait for active jobs to complete (max 30s)
  const timeout = 30_000;
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const stats = await getQueueStats();
    if (stats.process.active === 0 && stats.export.active === 0) {
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  await stopWorkers();
}
