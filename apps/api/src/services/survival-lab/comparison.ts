/**
 * Survival Lab - Comparison Logic
 * 
 * Compares scenario uploads against their baseline images.
 * Generates survival scores and field-by-field comparison results.
 */

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
  
  return {
    survivalScore,
    creatorOk,
    rightsOk,
    creditOk,
    descriptionOk,
    dimsChanged,
    filenameChanged,
    fieldsMissing,
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
