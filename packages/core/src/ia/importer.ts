/**
 * IA Plan Importer - Reads JSON plan and upserts to database
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  IAPlan,
  parseIAPlan,
  IAValidationResult,
  MoneyPage,
  PillarPage,
  TrustPage,
  SupportPage,
  CaseStudy,
  ReleaseNote,
  CalendarItem,
  CalendarMonth,
} from './planSchema';

// ─────────────────────────────────────────────────────────────────────────────
// Types for database records
// ─────────────────────────────────────────────────────────────────────────────

export interface IAPageRecord {
  id: string;
  planId: string;
  pageId: string;
  role: string;
  title: string;
  slug: string;
  primaryIntent?: string | null;
  cta?: string | null;
  goal?: string | null;
  supportingTopics?: string[];
  moneyLinkTarget?: string | null;
  internalLinksOut: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IACalendarItemRecord {
  id: string;
  planId: string;
  month: string;
  theme: string;
  week: number;
  type: string;
  title: string;
  slug: string;
  primaryLinks: string[];
  adobeMention: boolean;
  mentionNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAPlanRecord {
  id: string;
  version: string;
  productName: string;
  oneLiner: string;
  corePromise: string;
  differentiators: string[];
  guardrails: string[];
  cadenceConfig: Record<string, number>;
  roleDefinitions: Record<string, string>;
  brandMentionGoal: string;
  brandMentionRules: string[];
  allowedMentions: string[];
  timezone: string;
  startMonth: string;
  coverageScore: number;
  importedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAInternalLinkRule {
  id: string;
  planId: string;
  ruleType: 'global' | 'page_specific';
  sourcePageId?: string | null;
  targetPageId?: string | null;
  required: boolean;
  minLinks: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAMentionsPolicy {
  id: string;
  planId: string;
  brand: string;
  maxPerMonth: number;
  allowedContexts: string[];
  rules: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Importer Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load IA plan from JSON file
 */
export function loadPlanFromFile(filePath: string): { plan: IAPlan | null; validation: IAValidationResult } {
  if (!existsSync(filePath)) {
    return {
      plan: null,
      validation: {
        valid: false,
        errors: [{ path: 'file', message: `File not found: ${filePath}`, code: 'file_not_found' }],
        warnings: [],
        stats: {
          moneyPagesCount: 0,
          pillarsCount: 0,
          trustPagesCount: 0,
          supportPagesCount: 0,
          caseStudiesCount: 0,
          releaseNotesCount: 0,
          calendarItemsCount: 0,
          totalMonths: 0,
          adobeMentionsPerMonth: {},
        },
        coverageScore: 0,
        suggestions: [],
      },
    };
  }

  const content = readFileSync(filePath, 'utf-8');
  return parseIAPlan(content);
}

/**
 * Get default IA plan file path
 */
export function getDefaultPlanPath(rootDir: string): string {
  return join(rootDir, 'data', 'ia', 'contextembed_ia_plan_v1.json');
}

/**
 * Transform plan to database records
 */
export function planToRecords(plan: IAPlan, planId: string): {
  planRecord: Omit<IAPlanRecord, 'id' | 'createdAt' | 'updatedAt'>;
  pageRecords: Omit<IAPageRecord, 'id' | 'createdAt' | 'updatedAt'>[];
  calendarRecords: Omit<IACalendarItemRecord, 'id' | 'createdAt' | 'updatedAt'>[];
  linkRules: Omit<IAInternalLinkRule, 'id' | 'createdAt' | 'updatedAt'>[];
  mentionsPolicies: Omit<IAMentionsPolicy, 'id' | 'createdAt' | 'updatedAt'>[];
} {
  const now = new Date();

  // Plan record
  const planRecord: Omit<IAPlanRecord, 'id' | 'createdAt' | 'updatedAt'> = {
    version: plan.planVersion,
    productName: plan.product.name,
    oneLiner: plan.product.positioning.oneLiner,
    corePromise: plan.product.positioning.corePromise,
    differentiators: plan.product.positioning.differentiators,
    guardrails: plan.product.positioning.guardrails,
    cadenceConfig: plan.iaStructure.cadence as unknown as Record<string, number>,
    roleDefinitions: plan.iaStructure.roleDefinitions,
    brandMentionGoal: plan.brandMentionStrategy.goal,
    brandMentionRules: plan.brandMentionStrategy.rules,
    allowedMentions: plan.brandMentionStrategy.allowedMentions,
    timezone: plan.contentCalendar.timezone,
    startMonth: plan.contentCalendar.startMonth,
    coverageScore: 0, // Will be calculated
    importedAt: now,
  };

  // Page records
  const pageRecords: Omit<IAPageRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  // Money pages
  for (const page of plan.siteMap.moneyPages) {
    pageRecords.push({
      planId,
      pageId: page.id,
      role: 'money',
      title: page.title,
      slug: page.slug,
      primaryIntent: page.primaryIntent,
      cta: page.cta,
      goal: null,
      supportingTopics: [],
      moneyLinkTarget: null,
      internalLinksOut: page.internalLinksOut,
    });
  }

  // Pillars
  for (const page of plan.siteMap.pillars) {
    pageRecords.push({
      planId,
      pageId: page.id,
      role: 'pillar',
      title: page.title,
      slug: page.slug,
      primaryIntent: null,
      cta: null,
      goal: page.goal,
      supportingTopics: page.supportingTopics,
      moneyLinkTarget: page.moneyLinkTarget,
      internalLinksOut: [],
    });
  }

  // Trust pages
  for (const page of plan.siteMap.trustPages) {
    pageRecords.push({
      planId,
      pageId: page.id,
      role: 'trust',
      title: page.title,
      slug: page.slug,
      primaryIntent: null,
      cta: null,
      goal: null,
      supportingTopics: [],
      moneyLinkTarget: null,
      internalLinksOut: page.internalLinksOut,
    });
  }

  // Support pages
  for (const page of plan.siteMap.supportPages) {
    pageRecords.push({
      planId,
      pageId: page.id,
      role: 'support',
      title: page.title,
      slug: page.slug,
      primaryIntent: null,
      cta: null,
      goal: null,
      supportingTopics: [],
      moneyLinkTarget: null,
      internalLinksOut: page.internalLinksOut,
    });
  }

  // Case studies
  for (const page of plan.siteMap.caseStudies) {
    pageRecords.push({
      planId,
      pageId: page.id,
      role: 'caseStudy',
      title: page.title,
      slug: page.slug,
      primaryIntent: null,
      cta: null,
      goal: null,
      supportingTopics: [],
      moneyLinkTarget: null,
      internalLinksOut: page.internalLinksOut,
    });
  }

  // Release notes
  for (const page of plan.siteMap.releaseNotes) {
    pageRecords.push({
      planId,
      pageId: page.id,
      role: 'release',
      title: page.title,
      slug: page.slug,
      primaryIntent: null,
      cta: null,
      goal: null,
      supportingTopics: [],
      moneyLinkTarget: null,
      internalLinksOut: page.internalLinksOut,
    });
  }

  // Calendar records
  const calendarRecords: Omit<IACalendarItemRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  for (const month of plan.contentCalendar.months) {
    for (const item of month.items) {
      calendarRecords.push({
        planId,
        month: month.month,
        theme: month.theme,
        week: item.week,
        type: item.type,
        title: item.title,
        slug: item.slug,
        primaryLinks: item.primaryLinks,
        adobeMention: item.mentions.adobe,
        mentionNote: item.mentions.note || null,
      });
    }
  }

  // Generate internal link rules from plan structure
  const linkRules: Omit<IAInternalLinkRule, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  // Global rule: Every pillar must link to a money page
  linkRules.push({
    planId,
    ruleType: 'global',
    sourcePageId: null,
    targetPageId: null,
    required: true,
    minLinks: 1,
    description: 'Every pillar must have a moneyLinkTarget',
  });

  // Global rule: Every content item must have 2-3 primary links
  linkRules.push({
    planId,
    ruleType: 'global',
    sourcePageId: null,
    targetPageId: null,
    required: true,
    minLinks: 2,
    description: 'Every content calendar item must have 2-3 primary links',
  });

  // Per-pillar rules
  for (const pillar of plan.siteMap.pillars) {
    linkRules.push({
      planId,
      ruleType: 'page_specific',
      sourcePageId: pillar.id,
      targetPageId: pillar.moneyLinkTarget,
      required: true,
      minLinks: 1,
      description: `Pillar "${pillar.title}" must link to ${pillar.moneyLinkTarget}`,
    });
  }

  // Mentions policies
  const mentionsPolicies: Omit<IAMentionsPolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  mentionsPolicies.push({
    planId,
    brand: 'Adobe',
    maxPerMonth: 1,
    allowedContexts: plan.brandMentionStrategy.allowedMentions,
    rules: plan.brandMentionStrategy.rules,
  });

  return {
    planRecord,
    pageRecords,
    calendarRecords,
    linkRules,
    mentionsPolicies,
  };
}

/**
 * Get all page IDs from a plan
 */
export function getAllPageIds(plan: IAPlan): string[] {
  const ids: string[] = [];

  plan.siteMap.moneyPages.forEach(p => ids.push(p.id));
  plan.siteMap.pillars.forEach(p => ids.push(p.id));
  plan.siteMap.trustPages.forEach(p => ids.push(p.id));
  plan.siteMap.supportPages.forEach(p => ids.push(p.id));
  plan.siteMap.caseStudies.forEach(p => ids.push(p.id));
  plan.siteMap.releaseNotes.forEach(p => ids.push(p.id));

  return ids;
}

/**
 * Get all pages from a plan as a flat array
 */
export function getAllPages(plan: IAPlan): Array<{
  id: string;
  title: string;
  slug: string;
  role: string;
  internalLinksOut: string[];
}> {
  const pages: Array<{
    id: string;
    title: string;
    slug: string;
    role: string;
    internalLinksOut: string[];
  }> = [];

  plan.siteMap.moneyPages.forEach(p => pages.push({
    id: p.id,
    title: p.title,
    slug: p.slug,
    role: 'money',
    internalLinksOut: p.internalLinksOut,
  }));

  plan.siteMap.pillars.forEach(p => pages.push({
    id: p.id,
    title: p.title,
    slug: p.slug,
    role: 'pillar',
    internalLinksOut: [],
  }));

  plan.siteMap.trustPages.forEach(p => pages.push({
    id: p.id,
    title: p.title,
    slug: p.slug,
    role: 'trust',
    internalLinksOut: p.internalLinksOut,
  }));

  plan.siteMap.supportPages.forEach(p => pages.push({
    id: p.id,
    title: p.title,
    slug: p.slug,
    role: 'support',
    internalLinksOut: p.internalLinksOut,
  }));

  plan.siteMap.caseStudies.forEach(p => pages.push({
    id: p.id,
    title: p.title,
    slug: p.slug,
    role: 'caseStudy',
    internalLinksOut: p.internalLinksOut,
  }));

  plan.siteMap.releaseNotes.forEach(p => pages.push({
    id: p.id,
    title: p.title,
    slug: p.slug,
    role: 'release',
    internalLinksOut: p.internalLinksOut,
  }));

  return pages;
}
