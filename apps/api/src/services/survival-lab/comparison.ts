/**
 * Survival Lab - Comparison Logic
 * 
 * Compares scenario uploads against their baseline images.
 * Generates survival scores and field-by-field comparison results.
 *
 * v2 additions:
 *   - scoreV2 (weighted, canonical-field-based)
 *   - diffReport (field-level diff from diff-engine)
 *   - survivalClass (PRISTINE / SAFE / DEGRADED / HOSTILE / DESTRUCTIVE)
 */

import { generateMetadataDiff, type MetadataDiffReport } from './diff-engine';
import { classifyDiff, type SurvivalClass, type ClassificationResult } from './classifier';

export interface ComparisonInput {
  baseline: {
    creatorValue: string | null;
    rightsValue: string | null;
    creditValue: string | null;
    descriptionValue: string | null;
    width: number;
    height: number;
    originalFilename: string;
    exifPresent: boolean;
    xmpPresent: boolean;
    iptcPresent: boolean;
    /** Raw ExifTool JSON — required for v2 diff engine (optional for backward compat) */
    rawJson?: Record<string, unknown>;
  };
  scenario: {
    creatorValue: string | null;
    rightsValue: string | null;
    creditValue: string | null;
    descriptionValue: string | null;
    width: number;
    height: number;
    originalFilename: string;
    exifPresent: boolean;
    xmpPresent: boolean;
    iptcPresent: boolean;
    /** Raw ExifTool JSON — required for v2 diff engine (optional for backward compat) */
    rawJson?: Record<string, unknown>;
  };
}

export interface ComparisonResult {
  survivalScore: number;
  creatorOk: boolean;
  rightsOk: boolean;
  creditOk: boolean;
  descriptionOk: boolean;
  dimsChanged: boolean;
  filenameChanged: boolean;
  fieldsMissing: string[];

  // ── v2 additions (optional for backward compat) ──
  /** Weighted canonical-field score 0–100 */
  scoreV2?: number;
  /** High-level classification */
  survivalClass?: SurvivalClass;
  /** Full diff report (field-level detail) */
  diffReport?: MetadataDiffReport;
  /** Per-field score breakdown */
  classification?: ClassificationResult;
}

/**
 * Normalize a string for comparison:
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Lowercase
 */
function normalize(val: string | null): string {
  if (!val) return '';
  return val.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Check if two values are equal (normalized)
 */
function valuesEqual(a: string | null, b: string | null): boolean {
  return normalize(a) === normalize(b);
}

/**
 * Check if scenario description contains baseline description
 * (for cases where platform adds prefix/suffix)
 */
function descriptionMatches(baseline: string | null, scenario: string | null): boolean {
  if (!baseline && !scenario) return true;
  if (!baseline) return true; // No baseline to compare
  if (!scenario) return false; // Baseline exists but scenario doesn't
  
  const normBaseline = normalize(baseline);
  const normScenario = normalize(scenario);
  
  // Exact match or contains
  return normScenario === normBaseline || normScenario.includes(normBaseline);
}

/**
 * Compare scenario upload against baseline and compute survival metrics
 */
export function compareToBaseline(input: ComparisonInput): ComparisonResult {
  const { baseline, scenario } = input;
  
  // Field comparisons
  const creatorOk = valuesEqual(baseline.creatorValue, scenario.creatorValue);
  const rightsOk = valuesEqual(baseline.rightsValue, scenario.rightsValue);
  const creditOk = valuesEqual(baseline.creditValue, scenario.creditValue);
  const descriptionOk = descriptionMatches(baseline.descriptionValue, scenario.descriptionValue);
  
  // Dimension check
  const dimsChanged = baseline.width !== scenario.width || baseline.height !== scenario.height;
  
  // Filename check (strip path, compare names)
  const baselineFilename = baseline.originalFilename.split('/').pop()?.split('\\').pop() || '';
  const scenarioFilename = scenario.originalFilename.split('/').pop()?.split('\\').pop() || '';
  const filenameChanged = baselineFilename !== scenarioFilename;
  
  // Track missing fields
  const fieldsMissing: string[] = [];
  
  if (baseline.creatorValue && !scenario.creatorValue) {
    fieldsMissing.push('creator');
  }
  if (baseline.rightsValue && !scenario.rightsValue) {
    fieldsMissing.push('rights');
  }
  if (baseline.creditValue && !scenario.creditValue) {
    fieldsMissing.push('credit');
  }
  if (baseline.descriptionValue && !scenario.descriptionValue) {
    fieldsMissing.push('description');
  }
  if (baseline.exifPresent && !scenario.exifPresent) {
    fieldsMissing.push('EXIF');
  }
  if (baseline.xmpPresent && !scenario.xmpPresent) {
    fieldsMissing.push('XMP');
  }
  if (baseline.iptcPresent && !scenario.iptcPresent) {
    fieldsMissing.push('IPTC');
  }
  
  // Compute survival score
  // Start at 100, deduct for issues
  let survivalScore = 100;
  
  // Metadata presence penalties
  if (baseline.xmpPresent && !scenario.xmpPresent) {
    survivalScore -= 25; // XMP is most important for modern metadata
  }
  if (baseline.exifPresent && !scenario.exifPresent) {
    survivalScore -= 20;
  }
  if (baseline.iptcPresent && !scenario.iptcPresent) {
    survivalScore -= 15;
  }
  
  // Field value penalties
  if (!rightsOk) {
    survivalScore -= 15; // Rights/copyright is critical
  }
  if (!creatorOk) {
    survivalScore -= 10;
  }
  if (!creditOk) {
    survivalScore -= 10;
  }
  if (!descriptionOk) {
    survivalScore -= 10;
  }
  
  // Dimension change penalty
  if (dimsChanged) {
    survivalScore -= 10;
  }
  
  // Clamp to 0-100
  survivalScore = Math.max(0, Math.min(100, survivalScore));
  
  // ── v2: Canonical diff + weighted scoring ──
  let scoreV2: number | undefined;
  let survivalClass: SurvivalClass | undefined;
  let diffReport: MetadataDiffReport | undefined;
  let classification: ClassificationResult | undefined;

  if (baseline.rawJson && scenario.rawJson) {
    diffReport = generateMetadataDiff(baseline.rawJson, scenario.rawJson);
    classification = classifyDiff(diffReport);
    scoreV2 = classification.scoreV2;
    survivalClass = classification.survivalClass;
  }

  return {
    survivalScore,
    creatorOk,
    rightsOk,
    creditOk,
    descriptionOk,
    dimsChanged,
    filenameChanged,
    fieldsMissing,
    scoreV2,
    survivalClass,
    diffReport,
    classification,
  };
}

/**
 * Generate a human-readable summary of the comparison
 */
export function generateComparisonSummary(result: ComparisonResult): string {
  const issues: string[] = [];
  
  if (!result.creatorOk) issues.push('Creator mismatch');
  if (!result.rightsOk) issues.push('Rights/Copyright mismatch');
  if (!result.creditOk) issues.push('Credit mismatch');
  if (!result.descriptionOk) issues.push('Description mismatch');
  if (result.dimsChanged) issues.push('Dimensions changed');
  if (result.filenameChanged) issues.push('Filename changed');
  
  if (result.fieldsMissing.length > 0) {
    issues.push(`Missing: ${result.fieldsMissing.join(', ')}`);
  }
  
  if (issues.length === 0) {
    return 'All metadata preserved ✓';
  }
  
  return issues.join('; ');
}
