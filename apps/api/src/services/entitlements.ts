/**
 * Entitlement Gating Middleware
 * 
 * Gates RUN_CE and EXPORT actions based on workspace subscription.
 * Free tier: 3 successful exports per registrable domain.
 */

import { createHash } from 'crypto';
import { normalizeDomain } from '@contextembed/core';
import { domainUsageRepository, usageEventRepository, projectRepository, userProfileRepository } from '@contextembed/db';
import { getWorkspaceEntitlements, ensureWorkspaceForUser } from './workspace';
import { createApiError } from '../middleware/error-handler';

export type GatedAction = 'run_ce' | 'export' | 'web_pack' | 'survival';

export interface GatingContext {
  userId: string;
  workspaceId?: string;
  projectId?: string;
  action: GatedAction;
  ipAddress?: string;
  deviceId?: string;
}

export interface GatingResult {
  allowed: boolean;
  workspaceId: string;
  domain: string | null;
  isPaid: boolean;
  usageEventId?: string;
  error?: {
    code: string;
    message: string;
    domain?: string;
    used?: number;
    limit?: number;
  };
}

/**
 * Hash IP address for privacy-preserving storage.
 */
function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'ce-default-salt';
  return createHash('sha256').update(ip + salt).digest('hex').substring(0, 32);
}

/**
 * Resolve domain for a project from multiple sources.
 * Priority: project.primaryDomain > user website > last used domain
 */
export async function resolveDomain(
  projectId: string,
  userId: string,
  workspaceId: string
): Promise<string | null> {
  // 1. Try project's primary domain
  const project = await projectRepository.findById(projectId);
  if (project?.primaryDomain) {
    return normalizeDomain(project.primaryDomain);
  }
  
  // 2. Try user profile website
  const userProfile = await userProfileRepository.findByUserId(userId);
  if (userProfile?.website) {
    return normalizeDomain(userProfile.website);
  }
  
  // 3. Try last used domain for workspace
  const domainUsages = await domainUsageRepository.findByWorkspace(workspaceId);
  if (domainUsages.length > 0) {
    return domainUsages[0]!.registrableDomain;
  }
  
  return null;
}

/**
 * Assert that user is entitled to perform an action.
 * Throws ApiError if not allowed.
 */
export async function assertEntitledOrThrow(context: GatingContext): Promise<GatingResult> {
  const { userId, action, projectId, ipAddress, deviceId } = context;
  
  // Ensure workspace exists
  let workspaceId = context.workspaceId;
  if (!workspaceId) {
    const ws = await ensureWorkspaceForUser(userId);
    workspaceId = ws.workspaceId;
  }
  
  // Get entitlements
  const entitlements = await getWorkspaceEntitlements(workspaceId);
  
  // Resolve domain (required for run_ce and export on free tier)
  let domain: string | null = null;
  if (projectId && (action === 'run_ce' || action === 'export')) {
    domain = await resolveDomain(projectId, userId, workspaceId);
  }
  
  // Create usage event (will mark success later)
  const usageEvent = await usageEventRepository.create({
    workspaceId,
    userId,
    projectId,
    action,
    registrableDomain: domain || undefined,
    success: false,
  });
  
  // If paid, allow immediately
  if (entitlements.isPaid) {
    return {
      allowed: true,
      workspaceId,
      domain,
      isPaid: true,
      usageEventId: usageEvent.id,
    };
  }
  
  // Free tier checks for run_ce and export
  if (action === 'run_ce' || action === 'export') {
    // Domain is required for free tier
    if (!domain) {
      throw createApiError(
        'Domain required for free tier. Set a primary domain in project settings.',
        400,
        'DOMAIN_REQUIRED'
      );
    }
    
    // Get or create domain usage record
    await domainUsageRepository.upsert(workspaceId, userId, domain);
    const domainUsage = await domainUsageRepository.findByWorkspaceAndDomain(workspaceId, domain);
    
    if (!domainUsage) {
      // Should not happen, but safety
      throw createApiError('Failed to track domain usage', 500);
    }
    
    // Check if domain is blocked
    if (domainUsage.status === 'blocked') {
      throw createApiError(
        `Domain ${domain} has been blocked: ${domainUsage.blockReason || 'abuse detected'}`,
        403,
        'DOMAIN_BLOCKED'
      );
    }
    
    // Check free tier limit (3 per domain)
    if (domainUsage.freeUsesConsumed >= entitlements.domainFreeLimit) {
      const error = createApiError(
        `Free limit reached for ${domain}. Upgrade to continue.`,
        402,
        'UPGRADE_REQUIRED'
      );
      // Add extra data for frontend
      (error as any).data = {
        domain,
        used: domainUsage.freeUsesConsumed,
        limit: entitlements.domainFreeLimit,
      };
      throw error;
    }
  }
  
  // Web Pack requires paid (unless free tier gets it later)
  if (action === 'web_pack' && !entitlements.webPackEnabled) {
    throw createApiError(
      'Web Preview Pack requires a Pro or Agency subscription.',
      402,
      'UPGRADE_REQUIRED'
    );
  }
  
  return {
    allowed: true,
    workspaceId,
    domain,
    isPaid: false,
    usageEventId: usageEvent.id,
  };
}

/**
 * Record successful action (increment domain usage for free tier).
 * Call this after export completes successfully.
 */
export async function recordSuccessfulAction(
  workspaceId: string,
  domain: string | null,
  usageEventId: string,
  options?: {
    ipAddress?: string;
    deviceId?: string;
    imagesCount?: number;
    bytesTotal?: bigint;
  }
): Promise<void> {
  // Mark usage event as successful
  await usageEventRepository.markSuccess(usageEventId);
  
  // Get entitlements to check if we need to increment
  const entitlements = await getWorkspaceEntitlements(workspaceId);
  
  // Only increment for free tier
  if (!entitlements.isPaid && domain) {
    await domainUsageRepository.incrementUsage(workspaceId, domain, {
      lastIpHash: options?.ipAddress ? hashIp(options.ipAddress) : undefined,
      lastDeviceId: options?.deviceId,
    });
  }
}

/**
 * Get usage stats for display.
 */
export async function getUsageStats(workspaceId: string, domain?: string): Promise<{
  domainUsed: number;
  domainLimit: number;
  domains: Array<{
    domain: string;
    used: number;
    status: string;
  }>;
}> {
  const entitlements = await getWorkspaceEntitlements(workspaceId);
  const domainUsages = await domainUsageRepository.findByWorkspace(workspaceId);
  
  let domainUsed = 0;
  if (domain) {
    const usage = domainUsages.find(d => d.registrableDomain === domain);
    domainUsed = usage?.freeUsesConsumed || 0;
  }
  
  return {
    domainUsed,
    domainLimit: entitlements.isPaid ? Infinity : entitlements.domainFreeLimit,
    domains: domainUsages.map(d => ({
      domain: d.registrableDomain,
      used: d.freeUsesConsumed,
      status: d.status,
    })),
  };
}
