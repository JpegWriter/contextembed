/**
 * Hash utilities for asset fingerprinting and reproducibility
 */

import { createHash } from 'crypto';

/**
 * Compute SHA-256 hash of a buffer
 */
export function computeHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compute hash of a string
 */
export function computeStringHash(str: string): string {
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

/**
 * Compute hash of an object (for input tracking)
 */
export async function computeInputHash(input: unknown): Promise<string> {
  const serialized = JSON.stringify(input, Object.keys(input as object).sort());
  return computeStringHash(serialized);
}

/**
 * Generate a short hash (8 characters) for display
 */
export function shortHash(fullHash: string): string {
  return fullHash.substring(0, 8);
}

/**
 * Verify that a buffer matches an expected hash
 */
export function verifyHash(buffer: Buffer, expectedHash: string): boolean {
  const actualHash = computeHash(buffer);
  return actualHash === expectedHash;
}
