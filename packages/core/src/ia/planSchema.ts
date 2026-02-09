/**
 * IA Plan Schema - Zod validation for Information Architecture plans
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Page Role Enum
// ─────────────────────────────────────────────────────────────────────────────

export const PageRoleSchema = z.enum([
  'money',
  'pillar',
  'support',
  'trust',
  'caseStudy',
  'release',
]);

export type PageRole = z.infer<typeof PageRoleSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Content Calendar Item Types
// ─────────────────────────────────────────────────────────────────────────────

export const CalendarItemTypeSchema = z.enum([
  'money',
  'support',
  'trust',
  'trust_or_release',
  'caseStudy',
  'release',
]);

export type CalendarItemType = z.infer<typeof CalendarItemTypeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Mentions Schema
// ─────────────────────────────────────────────────────────────────────────────

export const MentionsSchema = z.object({
  adobe: z.boolean(),
  note: z.string().optional(),
});

export type Mentions = z.infer<typeof MentionsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Item Schema
// ─────────────────────────────────────────────────────────────────────────────

export const CalendarItemSchema = z.object({
  week: z.number().min(1).max(5),
  type: CalendarItemTypeSchema,
  title: z.string().min(1).max(200),
  slug: z.string().min(1).startsWith('/'),
  primaryLinks: z.array(z.string()).min(1).max(5),
  mentions: MentionsSchema,
});

export type CalendarItem = z.infer<typeof CalendarItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Month Schema
// ─────────────────────────────────────────────────────────────────────────────

export const CalendarMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM format
  theme: z.string().min(1).max(100),
  items: z.array(CalendarItemSchema).min(1).max(10),
});

export type CalendarMonth = z.infer<typeof CalendarMonthSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Content Calendar Schema
// ─────────────────────────────────────────────────────────────────────────────

export const ContentCalendarSchema = z.object({
  timezone: z.string(),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/),
  cadence: z.object({
    postsPerMonth: z.number().min(1).max(20),
    weeklyPattern: z.array(z.string()),
    monthlyReleaseNote: z.boolean(),
  }),
  months: z.array(CalendarMonthSchema),
});

export type ContentCalendar = z.infer<typeof ContentCalendarSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Money Page Schema
// ─────────────────────────────────────────────────────────────────────────────

export const MoneyPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).startsWith('/').or(z.literal('/')),
  primaryIntent: z.enum(['convert', 'buy', 'activate', 'retain']),
  cta: z.string().min(1).max(50),
  internalLinksOut: z.array(z.string()),
});

export type MoneyPage = z.infer<typeof MoneyPageSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Pillar Page Schema
// ─────────────────────────────────────────────────────────────────────────────

export const PillarPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).startsWith('/'),
  role: z.literal('pillar'),
  goal: z.string().min(1).max(500),
  supportingTopics: z.array(z.string()).min(1),
  moneyLinkTarget: z.string().min(1),
});

export type PillarPage = z.infer<typeof PillarPageSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Trust Page Schema
// ─────────────────────────────────────────────────────────────────────────────

export const TrustPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).startsWith('/'),
  role: z.literal('trust'),
  internalLinksOut: z.array(z.string()),
});

export type TrustPage = z.infer<typeof TrustPageSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Support Page Schema
// ─────────────────────────────────────────────────────────────────────────────

export const SupportPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).startsWith('/'),
  role: z.literal('support'),
  internalLinksOut: z.array(z.string()),
});

export type SupportPage = z.infer<typeof SupportPageSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Case Study Schema
// ─────────────────────────────────────────────────────────────────────────────

export const CaseStudySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).startsWith('/'),
  role: z.literal('caseStudy'),
  internalLinksOut: z.array(z.string()),
});

export type CaseStudy = z.infer<typeof CaseStudySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Release Notes Schema
// ─────────────────────────────────────────────────────────────────────────────

export const ReleaseNoteSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).startsWith('/'),
  role: z.literal('release'),
  internalLinksOut: z.array(z.string()),
});

export type ReleaseNote = z.infer<typeof ReleaseNoteSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Site Map Schema
// ─────────────────────────────────────────────────────────────────────────────

export const SiteMapSchema = z.object({
  moneyPages: z.array(MoneyPageSchema),
  pillars: z.array(PillarPageSchema),
  trustPages: z.array(TrustPageSchema),
  supportPages: z.array(SupportPageSchema),
  caseStudies: z.array(CaseStudySchema),
  releaseNotes: z.array(ReleaseNoteSchema),
});

export type SiteMap = z.infer<typeof SiteMapSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// IA Structure Schema
// ─────────────────────────────────────────────────────────────────────────────

export const IAStructureSchema = z.object({
  cadence: z.object({
    moneyPagesPerMonth: z.number().min(0).max(10),
    supportPostsPerMonth: z.number().min(0).max(20),
    trustPostsPerMonth: z.number().min(0).max(10),
    caseStudyPerQuarter: z.number().min(0).max(10),
    releaseNotesPerMonth: z.number().min(0).max(10),
  }),
  roleDefinitions: z.record(z.string(), z.string()),
});

export type IAStructure = z.infer<typeof IAStructureSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Brand Mention Strategy Schema
// ─────────────────────────────────────────────────────────────────────────────

export const BrandMentionStrategySchema = z.object({
  goal: z.string().min(1),
  rules: z.array(z.string()),
  allowedMentions: z.array(z.string()),
});

export type BrandMentionStrategy = z.infer<typeof BrandMentionStrategySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Product Positioning Schema
// ─────────────────────────────────────────────────────────────────────────────

export const ProductPositioningSchema = z.object({
  oneLiner: z.string().min(1).max(300),
  corePromise: z.string().min(1).max(200),
  differentiators: z.array(z.string()).min(1),
  guardrails: z.array(z.string()),
});

export type ProductPositioning = z.infer<typeof ProductPositioningSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Product Schema
// ─────────────────────────────────────────────────────────────────────────────

export const ProductSchema = z.object({
  name: z.string().min(1).max(100),
  positioning: ProductPositioningSchema,
});

export type Product = z.infer<typeof ProductSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Full IA Plan Schema
// ─────────────────────────────────────────────────────────────────────────────

export const IAPlanSchema = z.object({
  planVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  product: ProductSchema,
  iaStructure: IAStructureSchema,
  siteMap: SiteMapSchema,
  brandMentionStrategy: BrandMentionStrategySchema,
  contentCalendar: ContentCalendarSchema,
});

export type IAPlan = z.infer<typeof IAPlanSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Validation Result Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IAValidationError {
  path: string;
  message: string;
  code: string;
}

export interface IAValidationWarning {
  type: 'broken_slug' | 'missing_link' | 'adobe_violation' | 'low_coverage';
  message: string;
  details?: Record<string, unknown>;
}

export interface IAValidationResult {
  valid: boolean;
  errors: IAValidationError[];
  warnings: IAValidationWarning[];
  stats: IAStats;
  coverageScore: number;
  suggestions: IASuggestion[];
}

export interface IAStats {
  moneyPagesCount: number;
  pillarsCount: number;
  trustPagesCount: number;
  supportPagesCount: number;
  caseStudiesCount: number;
  releaseNotesCount: number;
  calendarItemsCount: number;
  totalMonths: number;
  adobeMentionsPerMonth: Record<string, number>;
}

export interface IASuggestion {
  type: 'add_support' | 'add_link' | 'fix_slug' | 'reduce_mentions';
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate an IA plan against the schema
 */
export function validateIAPlan(data: unknown): IAValidationResult {
  const errors: IAValidationError[] = [];
  const warnings: IAValidationWarning[] = [];
  const suggestions: IASuggestion[] = [];

  // Schema validation
  const parseResult = IAPlanSchema.safeParse(data);

  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      });
    }

    return {
      valid: false,
      errors,
      warnings,
      stats: getEmptyStats(),
      coverageScore: 0,
      suggestions,
    };
  }

  const plan = parseResult.data;

  // Collect all page IDs
  const allPageIds = new Set<string>();
  const allSlugs = new Set<string>();

  plan.siteMap.moneyPages.forEach(p => {
    allPageIds.add(p.id);
    allSlugs.add(p.slug);
  });
  plan.siteMap.pillars.forEach(p => {
    allPageIds.add(p.id);
    allSlugs.add(p.slug);
  });
  plan.siteMap.trustPages.forEach(p => {
    allPageIds.add(p.id);
    allSlugs.add(p.slug);
  });
  plan.siteMap.supportPages.forEach(p => {
    allPageIds.add(p.id);
    allSlugs.add(p.slug);
  });
  plan.siteMap.caseStudies.forEach(p => {
    allPageIds.add(p.id);
    allSlugs.add(p.slug);
  });
  plan.siteMap.releaseNotes.forEach(p => {
    allPageIds.add(p.id);
    allSlugs.add(p.slug);
  });

  // Check for broken internal links
  const checkLinks = (pageId: string, links: string[]) => {
    for (const link of links) {
      if (!allPageIds.has(link)) {
        warnings.push({
          type: 'broken_slug',
          message: `Page "${pageId}" links to unknown page "${link}"`,
          details: { pageId, targetId: link },
        });
      }
    }
  };

  plan.siteMap.moneyPages.forEach(p => checkLinks(p.id, p.internalLinksOut));
  plan.siteMap.trustPages.forEach(p => checkLinks(p.id, p.internalLinksOut));
  plan.siteMap.supportPages.forEach(p => checkLinks(p.id, p.internalLinksOut));
  plan.siteMap.caseStudies.forEach(p => checkLinks(p.id, p.internalLinksOut));
  plan.siteMap.releaseNotes.forEach(p => checkLinks(p.id, p.internalLinksOut));

  // Check pillar moneyLinkTarget
  plan.siteMap.pillars.forEach(p => {
    if (!allPageIds.has(p.moneyLinkTarget)) {
      warnings.push({
        type: 'broken_slug',
        message: `Pillar "${p.id}" links to unknown money page "${p.moneyLinkTarget}"`,
        details: { pillarId: p.id, targetId: p.moneyLinkTarget },
      });
    }
  });

  // Check calendar primaryLinks
  plan.contentCalendar.months.forEach(month => {
    month.items.forEach(item => {
      for (const link of item.primaryLinks) {
        if (!allPageIds.has(link)) {
          warnings.push({
            type: 'broken_slug',
            message: `Calendar item "${item.title}" links to unknown page "${link}"`,
            details: { month: month.month, itemSlug: item.slug, targetId: link },
          });
        }
      }
    });
  });

  // Check Adobe mention violations (max 1 per month in titles)
  const adobeMentionsPerMonth: Record<string, number> = {};
  const adobeTitleMentionsPerMonth: Record<string, number> = {};

  plan.contentCalendar.months.forEach(month => {
    adobeMentionsPerMonth[month.month] = 0;
    adobeTitleMentionsPerMonth[month.month] = 0;

    month.items.forEach(item => {
      if (item.mentions.adobe) {
        adobeMentionsPerMonth[month.month]++;
      }
      // Check title for Adobe mention
      if (item.title.toLowerCase().includes('adobe')) {
        adobeTitleMentionsPerMonth[month.month]++;
      }
    });

    if (adobeTitleMentionsPerMonth[month.month] > 1) {
      warnings.push({
        type: 'adobe_violation',
        message: `Month ${month.month} has ${adobeTitleMentionsPerMonth[month.month]} titles mentioning Adobe (max 1 allowed)`,
        details: { month: month.month, count: adobeTitleMentionsPerMonth[month.month] },
      });
    }
  });

  // Check pillars have enough supporting topics
  plan.siteMap.pillars.forEach(pillar => {
    if (pillar.supportingTopics.length < 5) {
      warnings.push({
        type: 'low_coverage',
        message: `Pillar "${pillar.title}" has only ${pillar.supportingTopics.length} supporting topics (recommend 5+)`,
        details: { pillarId: pillar.id, topicCount: pillar.supportingTopics.length },
      });

      suggestions.push({
        type: 'add_support',
        priority: 'medium',
        message: `Add more supporting topics to pillar "${pillar.title}"`,
        action: `Add ${5 - pillar.supportingTopics.length} more topics`,
      });
    }
  });

  // Check money pages have enough inbound links planned
  const moneyPageInboundCounts: Record<string, number> = {};
  plan.siteMap.moneyPages.forEach(mp => {
    moneyPageInboundCounts[mp.id] = 0;
  });

  plan.contentCalendar.months.forEach(month => {
    month.items.forEach(item => {
      for (const link of item.primaryLinks) {
        if (moneyPageInboundCounts[link] !== undefined) {
          moneyPageInboundCounts[link]++;
        }
      }
    });
  });

  for (const [pageId, count] of Object.entries(moneyPageInboundCounts)) {
    if (count < 3) {
      const page = plan.siteMap.moneyPages.find(p => p.id === pageId);
      suggestions.push({
        type: 'add_link',
        priority: count === 0 ? 'high' : 'medium',
        message: `Money page "${page?.title || pageId}" has only ${count} planned inbound links`,
        action: 'Add support articles that link to this page',
      });
    }
  }

  // Calculate stats
  const stats: IAStats = {
    moneyPagesCount: plan.siteMap.moneyPages.length,
    pillarsCount: plan.siteMap.pillars.length,
    trustPagesCount: plan.siteMap.trustPages.length,
    supportPagesCount: plan.siteMap.supportPages.length,
    caseStudiesCount: plan.siteMap.caseStudies.length,
    releaseNotesCount: plan.siteMap.releaseNotes.length,
    calendarItemsCount: plan.contentCalendar.months.reduce((sum, m) => sum + m.items.length, 0),
    totalMonths: plan.contentCalendar.months.length,
    adobeMentionsPerMonth,
  };

  // Calculate coverage score (0-100)
  const coverageScore = calculateCoverageScore(plan, stats, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
    coverageScore,
    suggestions,
  };
}

function calculateCoverageScore(plan: IAPlan, stats: IAStats, warnings: IAValidationWarning[]): number {
  let score = 0;
  const maxScore = 100;

  // Pillars exist (20 points for 3+)
  score += Math.min(20, (stats.pillarsCount / 3) * 20);

  // Each pillar has 5+ supporting topics (20 points)
  const avgTopics = plan.siteMap.pillars.reduce((sum, p) => sum + p.supportingTopics.length, 0) / Math.max(1, stats.pillarsCount);
  score += Math.min(20, (avgTopics / 5) * 20);

  // Calendar has 12 months (20 points)
  score += Math.min(20, (stats.totalMonths / 12) * 20);

  // Internal links coverage (20 points - deduct for warnings)
  const linkWarnings = warnings.filter(w => w.type === 'broken_slug' || w.type === 'missing_link').length;
  score += Math.max(0, 20 - linkWarnings * 2);

  // Trust pages present and linked (10 points)
  score += Math.min(10, (stats.trustPagesCount / 3) * 10);

  // No Adobe violations (10 points)
  const adobeViolations = warnings.filter(w => w.type === 'adobe_violation').length;
  score += adobeViolations === 0 ? 10 : Math.max(0, 10 - adobeViolations * 5);

  return Math.round(Math.min(maxScore, score));
}

function getEmptyStats(): IAStats {
  return {
    moneyPagesCount: 0,
    pillarsCount: 0,
    trustPagesCount: 0,
    supportPagesCount: 0,
    caseStudiesCount: 0,
    releaseNotesCount: 0,
    calendarItemsCount: 0,
    totalMonths: 0,
    adobeMentionsPerMonth: {},
  };
}

/**
 * Parse and validate an IA plan from JSON string
 */
export function parseIAPlan(jsonString: string): { plan: IAPlan | null; validation: IAValidationResult } {
  try {
    const data = JSON.parse(jsonString);
    const validation = validateIAPlan(data);
    return {
      plan: validation.valid ? (data as IAPlan) : null,
      validation,
    };
  } catch (error) {
    return {
      plan: null,
      validation: {
        valid: false,
        errors: [
          {
            path: 'root',
            message: error instanceof Error ? error.message : 'Invalid JSON',
            code: 'invalid_json',
          },
        ],
        warnings: [],
        stats: getEmptyStats(),
        coverageScore: 0,
        suggestions: [],
      },
    };
  }
}
