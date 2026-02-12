/**
 * Verification Token Service
 * 
 * Provides crypto-safe token generation for forensic-grade public verification.
 * Tokens are UUIDv4, non-enumerable, and stored only when verification is enabled.
 * 
 * Security Notes:
 * - Tokens should NEVER appear in client-side code or public responses
 * - Tokens are only revealed in:
 *   1. Authenticated dashboard UI (copy button)
 *   2. Exported files (XMP metadata) when user opts in
 */

import { randomUUID, createHash } from 'crypto';

export interface VerificationTokenResult {
  token: string;
  createdAt: Date;
}

export interface VerificationEnabledState {
  enabled: boolean;
  token: string | null;
  createdAt: Date | null;
  revokedAt: Date | null;
  lastCheckedAt: Date | null;
}

/**
 * Generate a new crypto-safe verification token (UUIDv4)
 */
export function generateVerificationToken(): VerificationTokenResult {
  return {
    token: randomUUID(),
    createdAt: new Date(),
  };
}

/**
 * Hash an IP address for storage (never store raw IPs)
 * Uses SHA-256 with a salt prefix to prevent rainbow table attacks
 */
export function hashIP(ip: string, salt: string = 'ce-verify-v1'): string {
  return createHash('sha256')
    .update(`${salt}:${ip}`)
    .digest('hex');
}

/**
 * Truncate user agent to safe length for storage
 */
export function sanitizeUserAgent(userAgent: string | undefined): string | null {
  if (!userAgent) return null;
  return userAgent.slice(0, 300);
}

/**
 * Build the public verification URL for a token
 */
export function buildVerificationUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.PUBLIC_VERIFICATION_URL || 'https://contextembed.com';
  return `${base}/verify/${token}`;
}

/**
 * Verification response types (for public endpoint)
 */
export type VerificationResult = 'verified' | 'revoked' | 'not_found' | 'rate_limited';

/**
 * Minimal public verification response shape
 */
export interface PublicVerificationResponse {
  status: VerificationResult;
  assetId?: string;
  embeddedBy?: string;          // Business name only, if user opted in
  aiGenerated?: boolean | null; // true/false/null (unknown)
  governanceStatus?: string;    // approved/blocked/warning/pending
  embeddedOn?: string;          // ISO date string
  integrity: 'checksum_match_confirmed' | 'record_confirmed';
}

/**
 * Error response shape (consistent for all error types)
 */
export interface PublicVerificationErrorResponse {
  status: 'not_found' | 'revoked' | 'rate_limited';
  message: string;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxPerIP: number;       // Max requests per IP hash in window
  maxPerToken: number;    // Max requests per token in window
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxPerIP: 30,             // 30 requests per IP per 10 min
  maxPerToken: 60,          // 60 requests per token per 10 min
};
