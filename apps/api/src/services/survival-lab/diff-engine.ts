/**
 * Survival Lab — Metadata Diff Engine
 *
 * Generates a field-level diff between a baseline metadata report
 * and a scenario metadata report.  Every canonical field gets a
 * deterministic FieldStatus classification.
 *
 * DESIGN RULES:
 *   1.  Pure functions — no side-effects, no I/O.
 *   2.  Deterministic — same inputs always produce same outputs.
 *   3.  Backward-compatible — returns both legacy booleans AND
 *       new FieldDiff[] for rich UI rendering.
 */

import {
  CANONICAL_FIELDS,
  type CanonicalFieldDef,
  type MetadataContainer,
  extractCanonicalValue,
  extractAllContainerValues,
} from './canonical-map';

// ─── Types ─────────────────────────────────────────────────────

/**
 * Possible states a single metadata field can be in after
 * surviving a platform round-trip.
 */
export type FieldStatus =
  | 'PRESERVED'          // Identical value, same container(s)
  | 'MIGRATED'           // Value survived but moved containers (e.g. XMP→EXIF)
  | 'TRUNCATED'          // Scenario value is a substring of baseline value
  | 'ENCODING_MUTATION'  // Mojibake / encoding artefacts detected
  | 'MODIFIED'           // Value exists but differs (not truncated, not encoding)
  | 'STRIPPED'            // Field existed in baseline, absent in scenario
  | 'REGENERATED'        // Field was absent in baseline but appeared in scenario
  | 'ABSENT';            // Field absent in both (nothing to compare)

/**
 * Diff result for a single canonical field.
 */
export interface FieldDiff {
  /** Canonical field name (e.g. "CREATOR") */
  canonical: string;
  /** Human label */
  label: string;
  /** Weight used in scoring */
  weight: number;
  /** Classification */
  status: FieldStatus;

  // Values
  baselineValue: string | null;
  scenarioValue: string | null;

  // Container provenance
  baselineContainers: MetadataContainer[];
  scenarioContainers: MetadataContainer[];

  /** Optional explanation for the UI */
  note: string | null;
}

/**
 * Container-level retention summary.
 */
export interface ContainerRetention {
  container: MetadataContainer;
  /** How many canonical fields had a value in this container in the baseline */
  baselineCount: number;
  /** How many of those survived in the scenario */
  survivedCount: number;
  /** 0–100 */
  retentionPct: number;
}

/**
 * The full diff report returned to the caller.
 */
export interface MetadataDiffReport {
  /** One entry per canonical field */
  fields: FieldDiff[];

  /** Per-container retention summary */
  containerRetention: ContainerRetention[];

  /** Counts by status */
  statusCounts: Record<FieldStatus, number>;

  /** Quick boolean — true if every authored field is PRESERVED */
  perfectSurvival: boolean;

  /** Overall field survival rate (0–1) — fields PRESERVED+MIGRATED / total authored */
  fieldSurvivalRate: number;
}

// ─── Mojibake Detection ────────────────────────────────────────

const MOJIBAKE_PATTERNS = [
  'â€™', 'â€œ', 'â€\u009d', 'â€"', 'â€"',
  'Ã©', 'Ã¶', 'Ã¼', 'Ã\u0084', 'Ã\u0096', 'Ã\u009c',
  'Â©', 'Â®', 'â', '┬®', '┬',
  '\ufffd',  // Unicode replacement character
];

function hasMojibake(value: string): boolean {
  const lower = value.toLowerCase();
  return MOJIBAKE_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

// ─── Normalisation ─────────────────────────────────────────────

function normalise(val: string | null): string {
  if (!val) return '';
  return val
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isTruncation(baseline: string, scenario: string): boolean {
  const nb = normalise(baseline);
  const ns = normalise(scenario);
  if (!nb || !ns) return false;
  // Scenario is shorter AND is a leading substring of baseline
  return ns.length < nb.length && nb.startsWith(ns);
}

function isContainment(baseline: string, scenario: string): boolean {
  const nb = normalise(baseline);
  const ns = normalise(scenario);
  if (!nb || !ns) return false;
  // Scenario contains the baseline value (platform may add wrapper text)
  return ns.includes(nb) || nb.includes(ns);
}

// ─── Core Diff Logic ───────────────────────────────────────────

function classifyField(
  def: CanonicalFieldDef,
  baselineRaw: Record<string, unknown>,
  scenarioRaw: Record<string, unknown>,
): FieldDiff {
  const baselineExtract = extractCanonicalValue(baselineRaw, def.canonical);
  const scenarioExtract = extractCanonicalValue(scenarioRaw, def.canonical);

  const bVal = baselineExtract.value;
  const sVal = scenarioExtract.value;

  const baselineContainerValues = extractAllContainerValues(baselineRaw, def.canonical);
  const scenarioContainerValues = extractAllContainerValues(scenarioRaw, def.canonical);

  const baselineContainers = [...new Set(baselineContainerValues.map(c => c.container))];
  const scenarioContainers = [...new Set(scenarioContainerValues.map(c => c.container))];

  const base: Omit<FieldDiff, 'status' | 'note'> = {
    canonical: def.canonical,
    label: def.label,
    weight: def.weight,
    baselineValue: bVal,
    scenarioValue: sVal,
    baselineContainers,
    scenarioContainers,
  };

  // ── Neither has it
  if (!bVal && !sVal) {
    return { ...base, status: 'ABSENT', note: null };
  }

  // ── Regenerated: baseline didn't have it, scenario does
  if (!bVal && sVal) {
    return { ...base, status: 'REGENERATED', note: 'Value appeared in scenario but was not in baseline' };
  }

  // ── Stripped: baseline had it, scenario doesn't
  if (bVal && !sVal) {
    return { ...base, status: 'STRIPPED', note: `"${def.label}" was removed by the platform` };
  }

  // ── Both have a value — compare
  const bNorm = normalise(bVal);
  const sNorm = normalise(sVal);

  // Exact match (normalised)
  if (bNorm === sNorm) {
    // Check for container migration
    const sameContainers =
      baselineContainers.length === scenarioContainers.length &&
      baselineContainers.every(c => scenarioContainers.includes(c));

    if (sameContainers) {
      return { ...base, status: 'PRESERVED', note: null };
    }
    return {
      ...base,
      status: 'MIGRATED',
      note: `Value preserved but moved: ${baselineContainers.join('+')} → ${scenarioContainers.join('+')}`,
    };
  }

  // Encoding corruption
  if (sVal && hasMojibake(sVal)) {
    return {
      ...base,
      status: 'ENCODING_MUTATION',
      note: 'Encoding artefacts detected (possible UTF-8 → Latin-1 corruption)',
    };
  }

  // Truncation
  if (bVal && sVal && isTruncation(bVal, sVal)) {
    return {
      ...base,
      status: 'TRUNCATED',
      note: `Value truncated from ${bVal.length} → ${sVal.length} characters`,
    };
  }

  // Containment (loose match — platform wrapped or appended text)
  if (bVal && sVal && isContainment(bVal, sVal)) {
    return { ...base, status: 'PRESERVED', note: 'Loose match — value contained within scenario text' };
  }

  // Generic modification
  return {
    ...base,
    status: 'MODIFIED',
    note: `Value changed`,
  };
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Generate a full metadata diff report between baseline and scenario raw JSON.
 *
 * @param baselineRawJson - The `rawJson` field from the baseline SurvivalMetadataReport
 * @param scenarioRawJson - The `rawJson` field from the scenario SurvivalMetadataReport
 */
export function generateMetadataDiff(
  baselineRawJson: Record<string, unknown>,
  scenarioRawJson: Record<string, unknown>,
): MetadataDiffReport {
  // Classify every canonical field
  const fields: FieldDiff[] = CANONICAL_FIELDS.map(def =>
    classifyField(def, baselineRawJson, scenarioRawJson),
  );

  // Count statuses
  const statusCounts: Record<FieldStatus, number> = {
    PRESERVED: 0,
    MIGRATED: 0,
    TRUNCATED: 0,
    ENCODING_MUTATION: 0,
    MODIFIED: 0,
    STRIPPED: 0,
    REGENERATED: 0,
    ABSENT: 0,
  };
  for (const f of fields) {
    statusCounts[f.status]++;
  }

  // Container retention
  const containers: MetadataContainer[] = ['EXIF', 'IPTC', 'XMP'];
  const containerRetention: ContainerRetention[] = containers.map(container => {
    let baselineCount = 0;
    let survivedCount = 0;

    for (const f of fields) {
      if (f.baselineContainers.includes(container)) {
        baselineCount++;
        if (f.scenarioContainers.includes(container)) {
          survivedCount++;
        }
      }
    }

    return {
      container,
      baselineCount,
      survivedCount,
      retentionPct: baselineCount > 0
        ? Math.round((survivedCount / baselineCount) * 100)
        : 100, // nothing to lose = 100% retention
    };
  });

  // Authored fields = fields that had a value in the baseline (not ABSENT or REGENERATED)
  const authoredFields = fields.filter(
    f => f.status !== 'ABSENT' && f.status !== 'REGENERATED',
  );
  const survivedFields = authoredFields.filter(
    f => f.status === 'PRESERVED' || f.status === 'MIGRATED',
  );

  const fieldSurvivalRate =
    authoredFields.length > 0
      ? survivedFields.length / authoredFields.length
      : 1;

  const perfectSurvival =
    authoredFields.length > 0 && authoredFields.every(f => f.status === 'PRESERVED');

  return {
    fields,
    containerRetention,
    statusCounts,
    perfectSurvival,
    fieldSurvivalRate,
  };
}

/**
 * Convenience: generate a human-readable summary string from a diff report.
 */
export function summariseDiff(report: MetadataDiffReport): string {
  const lines: string[] = [];

  const authored = report.fields.filter(
    f => f.status !== 'ABSENT' && f.status !== 'REGENERATED',
  );

  if (report.perfectSurvival) {
    lines.push('✓ Perfect survival — all authored metadata preserved.');
  } else {
    lines.push(
      `Survival rate: ${Math.round(report.fieldSurvivalRate * 100)}% ` +
      `(${report.statusCounts.PRESERVED + report.statusCounts.MIGRATED}/${authored.length} fields)`,
    );
  }

  // List problems
  for (const f of report.fields) {
    if (f.status === 'STRIPPED') {
      lines.push(`✗ ${f.label}: STRIPPED`);
    } else if (f.status === 'TRUNCATED') {
      lines.push(`⚠ ${f.label}: TRUNCATED (${f.note})`);
    } else if (f.status === 'ENCODING_MUTATION') {
      lines.push(`⚠ ${f.label}: ENCODING CORRUPTION`);
    } else if (f.status === 'MODIFIED') {
      lines.push(`△ ${f.label}: MODIFIED`);
    } else if (f.status === 'MIGRATED') {
      lines.push(`↻ ${f.label}: MIGRATED (${f.note})`);
    }
  }

  // Container summary
  for (const cr of report.containerRetention) {
    if (cr.baselineCount > 0) {
      lines.push(
        `  ${cr.container}: ${cr.retentionPct}% retention (${cr.survivedCount}/${cr.baselineCount})`,
      );
    }
  }

  return lines.join('\n');
}
