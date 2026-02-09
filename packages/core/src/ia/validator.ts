/**
 * IA Validator - Additional validation logic beyond Zod schema
 */

import {
  IAPlan,
  IAValidationResult,
  IAValidationWarning,
  IASuggestion,
  IAStats,
  validateIAPlan,
} from './planSchema';

// ─────────────────────────────────────────────────────────────────────────────
// Extended Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtendedValidationOptions {
  checkAdobeMentions: boolean;
  checkInternalLinkCoverage: boolean;
  checkPillarTopics: boolean;
  checkCalendarCadence: boolean;
  minPillars: number;
  minTopicsPerPillar: number;
  minMoneyPageInboundLinks: number;
}

export const defaultValidationOptions: ExtendedValidationOptions = {
  checkAdobeMentions: true,
  checkInternalLinkCoverage: true,
  checkPillarTopics: true,
  checkCalendarCadence: true,
  minPillars: 3,
  minTopicsPerPillar: 5,
  minMoneyPageInboundLinks: 3,
};

/**
 * Run extended validation with configurable options
 */
export function runExtendedValidation(
  plan: IAPlan,
  options: Partial<ExtendedValidationOptions> = {}
): IAValidationResult {
  const opts = { ...defaultValidationOptions, ...options };
  const baseResult = validateIAPlan(plan);

  const warnings = [...baseResult.warnings];
  const suggestions = [...baseResult.suggestions];

  // Check pillar count
  if (opts.checkPillarTopics && plan.siteMap.pillars.length < opts.minPillars) {
    warnings.push({
      type: 'low_coverage',
      message: `Only ${plan.siteMap.pillars.length} pillars defined (recommend ${opts.minPillars}+)`,
      details: { count: plan.siteMap.pillars.length, recommended: opts.minPillars },
    });

    suggestions.push({
      type: 'add_support',
      priority: 'high',
      message: `Add ${opts.minPillars - plan.siteMap.pillars.length} more pillar pages`,
    });
  }

  // Check calendar cadence matches config
  if (opts.checkCalendarCadence) {
    const expectedPerMonth = plan.contentCalendar.cadence.postsPerMonth;
    for (const month of plan.contentCalendar.months) {
      if (month.items.length !== expectedPerMonth) {
        warnings.push({
          type: 'low_coverage',
          message: `Month ${month.month} has ${month.items.length} items (expected ${expectedPerMonth})`,
          details: { month: month.month, actual: month.items.length, expected: expectedPerMonth },
        });
      }
    }
  }

  // Check that money pages are properly distributed across calendar
  if (opts.checkInternalLinkCoverage) {
    const moneyPageRefs = new Map<string, number>();
    plan.siteMap.moneyPages.forEach(mp => moneyPageRefs.set(mp.id, 0));

    for (const month of plan.contentCalendar.months) {
      for (const item of month.items) {
        for (const link of item.primaryLinks) {
          if (moneyPageRefs.has(link)) {
            moneyPageRefs.set(link, (moneyPageRefs.get(link) || 0) + 1);
          }
        }
      }
    }

    for (const [pageId, count] of moneyPageRefs) {
      if (count < opts.minMoneyPageInboundLinks) {
        const page = plan.siteMap.moneyPages.find(p => p.id === pageId);
        if (count === 0) {
          warnings.push({
            type: 'missing_link',
            message: `Money page "${page?.title || pageId}" has no planned inbound links from calendar`,
            details: { pageId, inboundCount: count },
          });
        }
      }
    }
  }

  // Check Adobe mention distribution
  if (opts.checkAdobeMentions) {
    const monthlyAdobeCount = new Map<string, { content: number; titles: number }>();

    for (const month of plan.contentCalendar.months) {
      const counts = { content: 0, titles: 0 };
      for (const item of month.items) {
        if (item.mentions.adobe) {
          counts.content++;
        }
        if (item.title.toLowerCase().includes('adobe')) {
          counts.titles++;
        }
      }
      monthlyAdobeCount.set(month.month, counts);
    }

    for (const [month, counts] of monthlyAdobeCount) {
      // Check if more than 2 content mentions per month
      if (counts.content > 2) {
        warnings.push({
          type: 'adobe_violation',
          message: `Month ${month} has ${counts.content} Adobe content mentions (recommend max 2)`,
          details: { month, contentMentions: counts.content },
        });
      }
    }
  }

  return {
    ...baseResult,
    warnings,
    suggestions,
  };
}

/**
 * Get link graph analysis
 */
export function analyzeLinkGraph(plan: IAPlan): {
  inboundCounts: Map<string, number>;
  outboundCounts: Map<string, number>;
  orphanedPages: string[];
  highlyLinkedPages: Array<{ id: string; count: number }>;
} {
  const inboundCounts = new Map<string, number>();
  const outboundCounts = new Map<string, number>();

  // Initialize all pages
  const allPages = [
    ...plan.siteMap.moneyPages,
    ...plan.siteMap.pillars,
    ...plan.siteMap.trustPages,
    ...plan.siteMap.supportPages,
    ...plan.siteMap.caseStudies,
    ...plan.siteMap.releaseNotes,
  ];

  for (const page of allPages) {
    inboundCounts.set(page.id, 0);
    outboundCounts.set(page.id, 0);
  }

  // Count outbound links from pages
  const countLinks = (pageId: string, links: string[]) => {
    outboundCounts.set(pageId, links.length);
    for (const link of links) {
      if (inboundCounts.has(link)) {
        inboundCounts.set(link, (inboundCounts.get(link) || 0) + 1);
      }
    }
  };

  plan.siteMap.moneyPages.forEach(p => countLinks(p.id, p.internalLinksOut));
  plan.siteMap.trustPages.forEach(p => countLinks(p.id, p.internalLinksOut));
  plan.siteMap.supportPages.forEach(p => countLinks(p.id, p.internalLinksOut));
  plan.siteMap.caseStudies.forEach(p => countLinks(p.id, p.internalLinksOut));
  plan.siteMap.releaseNotes.forEach(p => countLinks(p.id, p.internalLinksOut));

  // Pillars link to money pages
  plan.siteMap.pillars.forEach(p => {
    outboundCounts.set(p.id, 1);
    if (inboundCounts.has(p.moneyLinkTarget)) {
      inboundCounts.set(p.moneyLinkTarget, (inboundCounts.get(p.moneyLinkTarget) || 0) + 1);
    }
  });

  // Count from calendar
  for (const month of plan.contentCalendar.months) {
    for (const item of month.items) {
      for (const link of item.primaryLinks) {
        if (inboundCounts.has(link)) {
          inboundCounts.set(link, (inboundCounts.get(link) || 0) + 1);
        }
      }
    }
  }

  // Find orphaned pages (no inbound links except homepage)
  const orphanedPages: string[] = [];
  for (const [pageId, count] of inboundCounts) {
    if (count === 0 && pageId !== 'mp_home') {
      orphanedPages.push(pageId);
    }
  }

  // Find highly linked pages
  const highlyLinkedPages = Array.from(inboundCounts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    inboundCounts,
    outboundCounts,
    orphanedPages,
    highlyLinkedPages,
  };
}

/**
 * Generate next actions based on plan analysis
 */
export function generateNextActions(plan: IAPlan): IASuggestion[] {
  const suggestions: IASuggestion[] = [];
  const linkAnalysis = analyzeLinkGraph(plan);

  // Check for orphaned pages
  for (const pageId of linkAnalysis.orphanedPages) {
    suggestions.push({
      type: 'add_link',
      priority: 'high',
      message: `Page "${pageId}" has no inbound links`,
      action: 'Add a support article or calendar item linking to this page',
    });
  }

  // Check pillars with few supporting topics
  for (const pillar of plan.siteMap.pillars) {
    if (pillar.supportingTopics.length < 10) {
      suggestions.push({
        type: 'add_support',
        priority: 'medium',
        message: `Pillar "${pillar.title}" has ${pillar.supportingTopics.length} topics (recommend 10+)`,
        action: `Add ${10 - pillar.supportingTopics.length} more supporting topic ideas`,
      });
    }
  }

  // Check for money pages with low planned links
  const moneyPagePlannedLinks = new Map<string, number>();
  plan.siteMap.moneyPages.forEach(mp => moneyPagePlannedLinks.set(mp.id, 0));

  for (const month of plan.contentCalendar.months) {
    for (const item of month.items) {
      for (const link of item.primaryLinks) {
        if (moneyPagePlannedLinks.has(link)) {
          moneyPagePlannedLinks.set(link, (moneyPagePlannedLinks.get(link) || 0) + 1);
        }
      }
    }
  }

  for (const [pageId, count] of moneyPagePlannedLinks) {
    if (count < 3) {
      const page = plan.siteMap.moneyPages.find(p => p.id === pageId);
      suggestions.push({
        type: 'add_link',
        priority: count === 0 ? 'high' : 'medium',
        message: `Money page "${page?.title || pageId}" only has ${count} planned calendar links`,
        action: 'Add 1-2 support articles in the next quarter that link here',
      });
    }
  }

  return suggestions;
}
