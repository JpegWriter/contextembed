/**
 * Workspace Bootstrap Service
 * 
 * Ensures every authenticated user has a workspace.
 * Called on first dashboard load and project creation.
 */

import { workspaceRepository, subscriptionRepository } from '@contextembed/db';

export interface WorkspaceBootstrapResult {
  workspaceId: string;
  isNew: boolean;
  plan: 'free' | 'pro' | 'agency';
  status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
}

/**
 * Ensure user has a workspace. If not, create one with free subscription.
 * Returns the user's primary (owned) workspace.
 */
export async function ensureWorkspaceForUser(userId: string): Promise<WorkspaceBootstrapResult> {
  // First, check if user already owns a workspace
  let workspace = await workspaceRepository.findByOwnerId(userId);
  
  if (workspace) {
    return {
      workspaceId: workspace.id,
      isNew: false,
      plan: (workspace.subscription?.plan as 'free' | 'pro' | 'agency') || 'free',
      status: (workspace.subscription?.status as WorkspaceBootstrapResult['status']) || 'inactive',
    };
  }
  
  // Check if user is member of any workspace (invited)
  const memberWorkspaces = await workspaceRepository.findByMemberId(userId);
  if (memberWorkspaces.length > 0) {
    // Return the first workspace they're a member of
    workspace = memberWorkspaces[0]!;
    return {
      workspaceId: workspace.id,
      isNew: false,
      plan: (workspace.subscription?.plan as 'free' | 'pro' | 'agency') || 'free',
      status: (workspace.subscription?.status as WorkspaceBootstrapResult['status']) || 'inactive',
    };
  }
  
  // Create new workspace with free subscription
  workspace = await workspaceRepository.create({
    ownerUserId: userId,
    name: 'My Workspace',
  });
  
  return {
    workspaceId: workspace.id,
    isNew: true,
    plan: 'free',
    status: 'inactive',
  };
}

/**
 * Get workspace ID for a user (does NOT create if missing).
 * Returns null if user has no workspace.
 */
export async function getWorkspaceForUser(userId: string): Promise<string | null> {
  // Check owned workspace first
  const owned = await workspaceRepository.findByOwnerId(userId);
  if (owned) return owned.id;
  
  // Check member workspaces
  const memberWorkspaces = await workspaceRepository.findByMemberId(userId);
  if (memberWorkspaces.length > 0) {
    return memberWorkspaces[0]!.id;
  }
  
  return null;
}

/**
 * Entitlements based on subscription plan.
 */
export interface WorkspaceEntitlements {
  isPaid: boolean;
  plan: 'free' | 'pro' | 'agency';
  status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  retentionHours: number;
  domainFreeLimit: number;
  maxProjects: number;
  maxAssetsPerProject: number;
  webPackEnabled: boolean;
  survivalLabEnabled: boolean;
  currentPeriodEnd: Date | null;
}

const PLAN_ENTITLEMENTS = {
  free: {
    retentionHours: 24,
    domainFreeLimit: 3,
    maxProjects: 3,
    maxAssetsPerProject: 25,
    webPackEnabled: false,
    survivalLabEnabled: true,
  },
  pro: {
    retentionHours: 7 * 24, // 7 days
    domainFreeLimit: Infinity,
    maxProjects: 25,
    maxAssetsPerProject: 200,
    webPackEnabled: true,
    survivalLabEnabled: true,
  },
  agency: {
    retentionHours: 14 * 24, // 14 days
    domainFreeLimit: Infinity,
    maxProjects: Infinity,
    maxAssetsPerProject: 500,
    webPackEnabled: true,
    survivalLabEnabled: true,
  },
};

/**
 * Get entitlements for a workspace based on subscription.
 */
export async function getWorkspaceEntitlements(workspaceId: string): Promise<WorkspaceEntitlements> {
  const subscription = await subscriptionRepository.findByWorkspaceId(workspaceId);
  
  const plan = (subscription?.plan as 'free' | 'pro' | 'agency') || 'free';
  const status = (subscription?.status as WorkspaceEntitlements['status']) || 'inactive';
  
  // Consider paid if active or trialing
  const isPaid = status === 'active' || status === 'trialing';
  
  // Get plan limits
  const limits = PLAN_ENTITLEMENTS[isPaid ? plan : 'free'];
  
  return {
    isPaid,
    plan: isPaid ? plan : 'free',
    status,
    retentionHours: limits.retentionHours,
    domainFreeLimit: isPaid ? Infinity : limits.domainFreeLimit,
    maxProjects: limits.maxProjects,
    maxAssetsPerProject: limits.maxAssetsPerProject,
    webPackEnabled: isPaid || limits.webPackEnabled,
    survivalLabEnabled: limits.survivalLabEnabled,
    currentPeriodEnd: subscription?.currentPeriodEnd || null,
  };
}

/**
 * Calculate retention policy based on entitlements.
 */
export function getRetentionPolicy(isPaid: boolean, plan: 'free' | 'pro' | 'agency'): {
  policy: 'free_24h' | 'pro_7d' | 'agency_14d' | 'unlimited';
  hours: number;
} {
  if (!isPaid) {
    return { policy: 'free_24h', hours: 24 };
  }
  
  switch (plan) {
    case 'agency':
      return { policy: 'agency_14d', hours: 14 * 24 };
    case 'pro':
      return { policy: 'pro_7d', hours: 7 * 24 };
    default:
      return { policy: 'free_24h', hours: 24 };
  }
}
