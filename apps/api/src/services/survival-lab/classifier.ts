/**
 * Survival Lab — Field-Level Survival Classifier
 *
 * Takes a MetadataDiffReport and assigns a SurvivalClass to the
 * overall result, plus computes a weighted scoreV2 that replaces
 * the legacy penalty-based score with a canonical-field-weighted model.
 *
 * DESIGN RULES:
 *   1.  Pure functions — deterministic, no I/O.
 *   2.  Works alongside the legacy score (backward-compatible).
 *   3.  Uses the canonical field weights from canonical-map.ts.
 */

import { CANONICAL_FIELDS } from './canonical-map';
import type { FieldDiff, FieldStatus, MetadataDiffReport } from './diff-engine';

// ─── Types ─────────────────────────────────────────────────────

/**
 * Overall classification of how well a platform preserved metadata.
 */
export type SurvivalClass =
  | 'PRISTINE'       // 100 — zero changes
  | 'SAFE'           // 80–99 — minor container migration only
  | 'DEGRADED'       // 50–79 — some fields lost or corrupted
  | 'HOSTILE'         // 20–49 — significant stripping
  | 'DESTRUCTIVE';   //  0–19 — near-total metadata wipe

/**
 * Per-field score detail (for drill-down UI).
 */
export interface FieldScoreDetail {
  canonical: string;
  label: string;
  weight: number;
  status: FieldStatus;
  /** Points earned out of `weight` */
  earned: number;
  /** Multiplier applied for this status (0–1) */
  multiplier: number;
}

/**
 * Full classification result.
 */
export interface ClassificationResult {
  /** Weighted score 0–100 */
  scoreV2: number;
  /** High-level class */
  survivalClass: SurvivalClass;
  /** Per-field breakdown */
  fieldDetails: FieldScoreDetail[];
  /** Container-level retention (pass-through from diff report) */
  containerRetention: MetadataDiffReport['containerRetention'];
  /** Human summary */
  summary: string;
}

// ─── Status → Multiplier ──────────────────────────────────────

/**
 * How much of the field's weight is awarded for each status.
 *
 * PRESERVED   = 1.0  (full marks)
 * MIGRATED    = 0.9  (minor – value survived but container changed)
 * TRUNCATED   = 0.4  (partial data loss)
 * ENCODING_MUTATION = 0.3  (data present but corrupted)
 * MODIFIED    = 0.2  (value changed materially)
 * STRIPPED    = 0.0  (total loss)
 * REGENERATED = 0.0  (not penalised but not rewarded — baseline didn't have it)
 * ABSENT      = N/A  (excluded from scoring)
 */
const STATUS_MULTIPLIER: Record<FieldStatus, number> = {
  PRESERVED: 1.0,
  MIGRATED: 0.9,
  TRUNCATED: 0.4,
  ENCODING_MUTATION: 0.3,
  MODIFIED: 0.2,
  STRIPPED: 0.0,
  REGENERATED: 0.0, // Not counted in denominator either
  ABSENT: 0.0,      // Excluded
};

// ─── Core Classifier ──────────────────────────────────────────

/**
 * Compute the weighted scoreV2 from a diff report.
 */
export function classifyDiff(report: MetadataDiffReport): ClassificationResult {
  const fieldDetails: FieldScoreDetail[] = [];

  let totalWeight = 0;
  let totalEarned = 0;

  for (const field of report.fields) {
    // Skip fields that aren't authored (ABSENT) and regenerated ones
    if (field.status === 'ABSENT' || field.status === 'REGENERATED') {
      fieldDetails.push({
        canonical: field.canonical,
        label: field.label,
        weight: field.weight,
        status: field.status,
        earned: 0,
        multiplier: 0,
      });
      continue;
    }

    const multiplier = STATUS_MULTIPLIER[field.status];
    const earned = field.weight * multiplier;

    totalWeight += field.weight;
    totalEarned += earned;

    fieldDetails.push({
      canonical: field.canonical,
      label: field.label,
      weight: field.weight,
      status: field.status,
      earned,
      multiplier,
    });
  }

  // Normalise to 0–100
  const scoreV2 = totalWeight > 0
    ? Math.round((totalEarned / totalWeight) * 100)
    : 100; // nothing to lose

  const survivalClass = classFromScore(scoreV2);

  const summary = buildSummary(scoreV2, survivalClass, report, fieldDetails);

  return {
    scoreV2,
    survivalClass,
    fieldDetails,
    containerRetention: report.containerRetention,
    summary,
  };
}

// ─── Helper: Score → Class ─────────────────────────────────────

export function classFromScore(score: number): SurvivalClass {
  if (score >= 100) return 'PRISTINE';
  if (score >= 80) return 'SAFE';
  if (score >= 50) return 'DEGRADED';
  if (score >= 20) return 'HOSTILE';
  return 'DESTRUCTIVE';
}

/**
 * CSS-friendly colour for each class.
 */
export function classColor(cls: SurvivalClass): string {
  switch (cls) {
    case 'PRISTINE':    return '#22c55e'; // green-500
    case 'SAFE':        return '#4ade80'; // green-400
    case 'DEGRADED':    return '#facc15'; // yellow-400
    case 'HOSTILE':     return '#f97316'; // orange-500
    case 'DESTRUCTIVE': return '#ef4444'; // red-500
  }
}

/**
 * Human-friendly label.
 */
export function classLabel(cls: SurvivalClass): string {
  switch (cls) {
    case 'PRISTINE':    return 'Pristine';
    case 'SAFE':        return 'Safe';
    case 'DEGRADED':    return 'Degraded';
    case 'HOSTILE':     return 'Hostile';
    case 'DESTRUCTIVE': return 'Destructive';
  }
}

// ─── Summary Builder ──────────────────────────────────────────

function buildSummary(
  score: number,
  cls: SurvivalClass,
  report: MetadataDiffReport,
  details: FieldScoreDetail[],
): string {
  const parts: string[] = [
    `Score: ${score}/100 — ${classLabel(cls)}`,
  ];

  const stripped = details.filter(d => d.status === 'STRIPPED');
  const corrupted = details.filter(d => d.status === 'ENCODING_MUTATION');
  const truncated = details.filter(d => d.status === 'TRUNCATED');

  if (stripped.length > 0) {
    parts.push(`Stripped: ${stripped.map(d => d.label).join(', ')}`);
  }
  if (corrupted.length > 0) {
    parts.push(`Encoding issues: ${corrupted.map(d => d.label).join(', ')}`);
  }
  if (truncated.length > 0) {
    parts.push(`Truncated: ${truncated.map(d => d.label).join(', ')}`);
  }

  for (const cr of report.containerRetention) {
    if (cr.baselineCount > 0) {
      parts.push(`${cr.container}: ${cr.retentionPct}% retention`);
    }
  }

  return parts.join(' | ');
}

// ─── Convenience: Classify from raw JSON ──────────────────────

/**
 * One-shot classifier: takes baseline + scenario rawJson, returns full classification.
 * Import generateMetadataDiff from diff-engine.ts.
 */
export function classifyFromRawJson(
  baselineRawJson: Record<string, unknown>,
  scenarioRawJson: Record<string, unknown>,
  generateDiff: (b: Record<string, unknown>, s: Record<string, unknown>) => MetadataDiffReport,
): ClassificationResult {
  const report = generateDiff(baselineRawJson, scenarioRawJson);
  return classifyDiff(report);
}
