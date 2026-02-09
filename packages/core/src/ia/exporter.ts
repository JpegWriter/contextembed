/**
 * IA Exporter - Export IA data to CSV and other formats
 */

import { IAPlan, CalendarItem, CalendarMonth } from './planSchema';
import { getAllPages } from './importer';

// ─────────────────────────────────────────────────────────────────────────────
// CSV Export Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CSVExportOptions {
  delimiter: string;
  includeHeader: boolean;
  dateFormat: 'ISO' | 'US' | 'EU';
}

export const defaultCSVOptions: CSVExportOptions = {
  delimiter: ',',
  includeHeader: true,
  dateFormat: 'ISO',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCSV(arr: string[]): string {
  return arr.join('; ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Export
// ─────────────────────────────────────────────────────────────────────────────

export interface CalendarExportRow {
  month: string;
  theme: string;
  week: number;
  type: string;
  title: string;
  slug: string;
  primaryLinks: string;
  adobeMention: boolean;
  mentionNote: string;
}

/**
 * Export content calendar to CSV format
 */
export function exportCalendarToCSV(
  plan: IAPlan,
  options: Partial<CSVExportOptions> = {}
): string {
  const opts = { ...defaultCSVOptions, ...options };
  const rows: string[] = [];

  // Header
  if (opts.includeHeader) {
    rows.push([
      'Month',
      'Theme',
      'Week',
      'Type',
      'Title',
      'Slug',
      'Primary Links',
      'Adobe Mention',
      'Mention Note',
    ].join(opts.delimiter));
  }

  // Data rows
  for (const month of plan.contentCalendar.months) {
    for (const item of month.items) {
      rows.push([
        escapeCSV(month.month),
        escapeCSV(month.theme),
        escapeCSV(item.week),
        escapeCSV(item.type),
        escapeCSV(item.title),
        escapeCSV(item.slug),
        escapeCSV(arrayToCSV(item.primaryLinks)),
        escapeCSV(item.mentions.adobe ? 'Yes' : 'No'),
        escapeCSV(item.mentions.note || ''),
      ].join(opts.delimiter));
    }
  }

  return rows.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Pages Export
// ─────────────────────────────────────────────────────────────────────────────

export interface PageExportRow {
  id: string;
  role: string;
  title: string;
  slug: string;
  internalLinksOut: string;
  moneyLinkTarget?: string;
  goal?: string;
}

/**
 * Export all pages to CSV format
 */
export function exportPagesToCSV(
  plan: IAPlan,
  options: Partial<CSVExportOptions> = {}
): string {
  const opts = { ...defaultCSVOptions, ...options };
  const rows: string[] = [];

  // Header
  if (opts.includeHeader) {
    rows.push([
      'ID',
      'Role',
      'Title',
      'Slug',
      'Primary Intent',
      'CTA',
      'Goal',
      'Money Link Target',
      'Internal Links Out',
      'Supporting Topics',
    ].join(opts.delimiter));
  }

  // Money pages
  for (const page of plan.siteMap.moneyPages) {
    rows.push([
      escapeCSV(page.id),
      escapeCSV('money'),
      escapeCSV(page.title),
      escapeCSV(page.slug),
      escapeCSV(page.primaryIntent),
      escapeCSV(page.cta),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(arrayToCSV(page.internalLinksOut)),
      escapeCSV(''),
    ].join(opts.delimiter));
  }

  // Pillars
  for (const page of plan.siteMap.pillars) {
    rows.push([
      escapeCSV(page.id),
      escapeCSV('pillar'),
      escapeCSV(page.title),
      escapeCSV(page.slug),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(page.goal),
      escapeCSV(page.moneyLinkTarget),
      escapeCSV(''),
      escapeCSV(arrayToCSV(page.supportingTopics)),
    ].join(opts.delimiter));
  }

  // Trust pages
  for (const page of plan.siteMap.trustPages) {
    rows.push([
      escapeCSV(page.id),
      escapeCSV('trust'),
      escapeCSV(page.title),
      escapeCSV(page.slug),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(arrayToCSV(page.internalLinksOut)),
      escapeCSV(''),
    ].join(opts.delimiter));
  }

  // Support pages
  for (const page of plan.siteMap.supportPages) {
    rows.push([
      escapeCSV(page.id),
      escapeCSV('support'),
      escapeCSV(page.title),
      escapeCSV(page.slug),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(arrayToCSV(page.internalLinksOut)),
      escapeCSV(''),
    ].join(opts.delimiter));
  }

  // Case studies
  for (const page of plan.siteMap.caseStudies) {
    rows.push([
      escapeCSV(page.id),
      escapeCSV('caseStudy'),
      escapeCSV(page.title),
      escapeCSV(page.slug),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(arrayToCSV(page.internalLinksOut)),
      escapeCSV(''),
    ].join(opts.delimiter));
  }

  // Release notes
  for (const page of plan.siteMap.releaseNotes) {
    rows.push([
      escapeCSV(page.id),
      escapeCSV('release'),
      escapeCSV(page.title),
      escapeCSV(page.slug),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(arrayToCSV(page.internalLinksOut)),
      escapeCSV(''),
    ].join(opts.delimiter));
  }

  return rows.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Link Rules Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export internal link rules to CSV
 */
export function exportLinkRulesToCSV(
  plan: IAPlan,
  options: Partial<CSVExportOptions> = {}
): string {
  const opts = { ...defaultCSVOptions, ...options };
  const rows: string[] = [];

  // Header
  if (opts.includeHeader) {
    rows.push([
      'Rule Type',
      'Source Page',
      'Target Page',
      'Required',
      'Description',
    ].join(opts.delimiter));
  }

  // Global rules
  rows.push([
    escapeCSV('global'),
    escapeCSV('*'),
    escapeCSV('*'),
    escapeCSV('Yes'),
    escapeCSV('Every pillar must have a moneyLinkTarget'),
  ].join(opts.delimiter));

  rows.push([
    escapeCSV('global'),
    escapeCSV('*'),
    escapeCSV('*'),
    escapeCSV('Yes'),
    escapeCSV('Every content calendar item must have 2-3 primary links'),
  ].join(opts.delimiter));

  // Per-pillar rules
  for (const pillar of plan.siteMap.pillars) {
    rows.push([
      escapeCSV('pillar'),
      escapeCSV(pillar.id),
      escapeCSV(pillar.moneyLinkTarget),
      escapeCSV('Yes'),
      escapeCSV(`Pillar "${pillar.title}" must link to ${pillar.moneyLinkTarget}`),
    ].join(opts.delimiter));
  }

  return rows.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export plan summary as JSON
 */
export function exportPlanSummary(plan: IAPlan): {
  version: string;
  product: string;
  stats: {
    moneyPages: number;
    pillars: number;
    trustPages: number;
    supportPages: number;
    caseStudies: number;
    releaseNotes: number;
    calendarMonths: number;
    totalCalendarItems: number;
  };
  monthlyThemes: Array<{ month: string; theme: string; itemCount: number }>;
} {
  return {
    version: plan.planVersion,
    product: plan.product.name,
    stats: {
      moneyPages: plan.siteMap.moneyPages.length,
      pillars: plan.siteMap.pillars.length,
      trustPages: plan.siteMap.trustPages.length,
      supportPages: plan.siteMap.supportPages.length,
      caseStudies: plan.siteMap.caseStudies.length,
      releaseNotes: plan.siteMap.releaseNotes.length,
      calendarMonths: plan.contentCalendar.months.length,
      totalCalendarItems: plan.contentCalendar.months.reduce(
        (sum, m) => sum + m.items.length,
        0
      ),
    },
    monthlyThemes: plan.contentCalendar.months.map(m => ({
      month: m.month,
      theme: m.theme,
      itemCount: m.items.length,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sitemap Export
// ─────────────────────────────────────────────────────────────────────────────

export interface SitemapEntry {
  url: string;
  title: string;
  role: string;
  priority: number;
  changefreq: 'daily' | 'weekly' | 'monthly';
}

/**
 * Export sitemap entries
 */
export function exportSitemapEntries(
  plan: IAPlan,
  baseUrl: string = ''
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  // Money pages - highest priority
  for (const page of plan.siteMap.moneyPages) {
    entries.push({
      url: `${baseUrl}${page.slug}`,
      title: page.title,
      role: 'money',
      priority: 1.0,
      changefreq: 'weekly',
    });
  }

  // Pillars - high priority
  for (const page of plan.siteMap.pillars) {
    entries.push({
      url: `${baseUrl}${page.slug}`,
      title: page.title,
      role: 'pillar',
      priority: 0.9,
      changefreq: 'weekly',
    });
  }

  // Trust pages
  for (const page of plan.siteMap.trustPages) {
    entries.push({
      url: `${baseUrl}${page.slug}`,
      title: page.title,
      role: 'trust',
      priority: 0.8,
      changefreq: 'monthly',
    });
  }

  // Support pages
  for (const page of plan.siteMap.supportPages) {
    entries.push({
      url: `${baseUrl}${page.slug}`,
      title: page.title,
      role: 'support',
      priority: 0.7,
      changefreq: 'monthly',
    });
  }

  // Case studies
  for (const page of plan.siteMap.caseStudies) {
    entries.push({
      url: `${baseUrl}${page.slug}`,
      title: page.title,
      role: 'caseStudy',
      priority: 0.8,
      changefreq: 'monthly',
    });
  }

  // Release notes
  for (const page of plan.siteMap.releaseNotes) {
    entries.push({
      url: `${baseUrl}${page.slug}`,
      title: page.title,
      role: 'release',
      priority: 0.6,
      changefreq: 'weekly',
    });
  }

  return entries;
}
