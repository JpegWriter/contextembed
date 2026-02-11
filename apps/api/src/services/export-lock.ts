/**
 * Export Lock & Utilities
 * 
 * Provides:
 * - Global concurrency lock (1 export at a time per instance)
 * - Memory logging helper
 * - Temp file cleanup utilities
 * - Per-user rate limiting
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Global Export Lock ──────────────────────────────────────────────────────
// Only ONE export can run at a time per Render instance to prevent OOM crashes.

let exportLock = false;
let lockAcquiredAt: number | null = null;
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes safety timeout

export interface LockResult {
  acquired: boolean;
  reason?: string;
}

/**
 * Try to acquire the export lock. Returns { acquired: true } or { acquired: false, reason }.
 */
export function acquireExportLock(): LockResult {
  // Check for stale lock (safety timeout)
  if (exportLock && lockAcquiredAt) {
    const elapsed = Date.now() - lockAcquiredAt;
    if (elapsed > LOCK_TIMEOUT_MS) {
      console.warn(`⚠️ Export lock was stale (held for ${Math.round(elapsed / 1000)}s), releasing`);
      exportLock = false;
      lockAcquiredAt = null;
    }
  }

  if (exportLock) {
    return { acquired: false, reason: 'An export is already running. Please try again in a moment.' };
  }

  exportLock = true;
  lockAcquiredAt = Date.now();
  return { acquired: true };
}

/**
 * Release the export lock.
 */
export function releaseExportLock(): void {
  exportLock = false;
  lockAcquiredAt = null;
}

/**
 * Check if export lock is currently held.
 */
export function isExportLocked(): boolean {
  return exportLock;
}

// ── Per-User Rate Limiting (lightweight, per-instance) ─────────────────────

const userLastExport = new Map<string, number>();
const USER_EXPORT_COOLDOWN_MS = 10_000; // 10 seconds between exports per user

export function checkUserRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const lastExport = userLastExport.get(userId);
  if (lastExport) {
    const elapsed = Date.now() - lastExport;
    if (elapsed < USER_EXPORT_COOLDOWN_MS) {
      return { allowed: false, retryAfterMs: USER_EXPORT_COOLDOWN_MS - elapsed };
    }
  }
  return { allowed: true };
}

export function recordUserExport(userId: string): void {
  userLastExport.set(userId, Date.now());
}

// ── Memory Logging ──────────────────────────────────────────────────────────

export interface MemorySnapshot {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
}

export function getMemorySnapshot(): MemorySnapshot {
  const mem = process.memoryUsage();
  return {
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10,
    rssMB: Math.round(mem.rss / 1024 / 1024 * 10) / 10,
    externalMB: Math.round(mem.external / 1024 / 1024 * 10) / 10,
  };
}

export function logMemory(context: string, extra?: Record<string, unknown>): void {
  const mem = getMemorySnapshot();
  console.log(JSON.stringify({
    event: 'memory',
    context,
    mem,
    ...extra,
  }));
}

// ── Temp File Cleanup ───────────────────────────────────────────────────────

/**
 * Safely delete a file, ignoring errors if it doesn't exist.
 */
export async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to delete ${filePath}:`, err.message);
    }
  }
}

/**
 * Safely remove a directory recursively, ignoring errors if it doesn't exist.
 */
export async function safeRmDir(dirPath: string): Promise<void> {
  try {
    await fs.promises.rm(dirPath, { recursive: true, force: true });
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to remove directory ${dirPath}:`, err.message);
    }
  }
}

/**
 * Clean up all temp files in a list, logging any failures.
 */
export async function cleanupTempFiles(paths: string[]): Promise<void> {
  for (const p of paths) {
    await safeUnlink(p);
  }
}

// ── Export Limits ───────────────────────────────────────────────────────────

export const EXPORT_LIMITS = {
  MAX_ASSETS: 200,
  MAX_TOTAL_SIZE_BYTES: 2 * 1024 * 1024 * 1024, // 2GB
} as const;

export function checkExportLimits(assetCount: number): { allowed: boolean; reason?: string } {
  if (assetCount > EXPORT_LIMITS.MAX_ASSETS) {
    return { 
      allowed: false, 
      reason: `Export limited to ${EXPORT_LIMITS.MAX_ASSETS} assets at a time. Please select fewer images.` 
    };
  }
  return { allowed: true };
}
