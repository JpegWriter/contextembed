/**
 * ContextEmbed Metadata Audit Script
 * 
 * Audits exported assets to verify metadata presence, compliance, and quality.
 * Generates JSON report + Markdown summary.
 * 
 * Usage:
 *   npx ts-node scripts/audit-embed.ts --path ./exports/folder
 *   npm run audit:embed -- --path ./exports/folder
 */

import { exiftool, Tags } from 'exiftool-vendored';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

interface FieldSpec {
  name: string;
  exifToolNames: string[];
  required: boolean;
  category: 'identity' | 'rights' | 'descriptive' | 'location' | 'evidence' | 'linkage' | 'ai-classification';
  constraints?: {
    minLength?: number;
    maxLength?: number;
    minItems?: number;
    maxItems?: number;
    itemMaxLength?: number;
  };
}

interface RiskFlag {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

interface AssetAuditResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  
  presentFields: string[];
  missingRequiredFields: string[];
  constraintViolations: Array<{
    field: string;
    violation: string;
    value?: unknown;
  }>;
  riskFlags: RiskFlag[];
  
  fieldValues: Record<string, unknown>;
  
  healthScore: number; // 0-100
  healthTier: 'EVIDENCE_EMBEDDED' | 'PARTIALLY_EMBEDDED' | 'NOT_EMBEDDED';
  
  rawTags?: Tags; // Optional full dump
}

interface FolderAuditSummary {
  folderPath: string;
  auditedAt: string;
  totalAssets: number;
  
  complianceStats: {
    fullyCompliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
    percentFullyCompliant: number;
  };
  
  topMissingFields: Array<{ field: string; count: number; percent: number }>;
  topConstraintViolations: Array<{ violation: string; count: number }>;
  topRiskFlags: Array<{ code: string; count: number; severity: string }>;
  
  strippingPatterns: string[];
  
  assetResults: AssetAuditResult[];
}

// =============================================================================
// FIELD SPECIFICATIONS
// =============================================================================

const SPAM_KEYWORDS = [
  'best', 'top', 'cheap', 'affordable', 'amazing', 'awesome', 'incredible',
  'professional', 'expert', 'quality', 'guaranteed', 'free', '#1', 'number one',
  'leading', 'premier', 'elite', 'ultimate', 'perfect', 'excellent'
];

const FIELD_SPECS: FieldSpec[] = [
  // Identity fields
  {
    name: 'ObjectName',
    exifToolNames: ['ObjectName', 'Title', 'XMP-dc:Title'],
    required: true,
    category: 'identity',
    constraints: { maxLength: 60 }
  },
  {
    name: 'Caption-Abstract',
    exifToolNames: ['Caption-Abstract', 'Description', 'ImageDescription', 'XMP-dc:Description'],
    required: true,
    category: 'descriptive',
    constraints: { minLength: 200, maxLength: 1200 }
  },
  {
    name: 'Keywords',
    exifToolNames: ['Keywords', 'Subject', 'XMP-dc:Subject'],
    required: true,
    category: 'descriptive',
    constraints: { minItems: 5, maxItems: 15, itemMaxLength: 24 }
  },
  
  // Rights fields (critical)
  {
    name: 'By-line',
    exifToolNames: ['By-line', 'Artist', 'Creator', 'XMP-dc:Creator'],
    required: true,
    category: 'rights'
  },
  {
    name: 'CopyrightNotice',
    exifToolNames: ['CopyrightNotice', 'Copyright', 'Rights', 'XMP-dc:Rights'],
    required: true,
    category: 'rights'
  },
  {
    name: 'Credit',
    exifToolNames: ['Credit', 'XMP-photoshop:Credit'],
    required: true,
    category: 'rights'
  },
  {
    name: 'Source',
    exifToolNames: ['Source', 'XMP-photoshop:Source', 'XMP-dc:Source'],
    required: false,
    category: 'rights'
  },
  {
    name: 'UsageTerms',
    exifToolNames: ['UsageTerms', 'XMP-xmpRights:UsageTerms'],
    required: false,
    category: 'rights'
  },
  
  // Location fields
  {
    name: 'City',
    exifToolNames: ['City', 'XMP-photoshop:City'],
    required: true,
    category: 'location'
  },
  {
    name: 'Country',
    exifToolNames: ['Country', 'Country-PrimaryLocationName', 'XMP-photoshop:Country'],
    required: true,
    category: 'location'
  },
  {
    name: 'Province-State',
    exifToolNames: ['Province-State', 'State', 'XMP-photoshop:State'],
    required: false,
    category: 'location'
  },
  
  // Evidence fields (NEW - proof-first)
  {
    name: 'BusinessName',
    exifToolNames: ['XMP-contextembed:BusinessName'],
    required: true,
    category: 'evidence'
  },
  {
    name: 'JobType',
    exifToolNames: ['XMP-contextembed:JobType'],
    required: true,
    category: 'evidence'
  },
  {
    name: 'ServiceCategory',
    exifToolNames: ['XMP-contextembed:ServiceCategory'],
    required: true,
    category: 'evidence'
  },
  {
    name: 'ContextLine',
    exifToolNames: ['XMP-contextembed:ContextLine'],
    required: false,
    category: 'evidence'
  },
  {
    name: 'OutcomeProof',
    exifToolNames: ['XMP-contextembed:OutcomeProof'],
    required: false,
    category: 'evidence'
  },
  {
    name: 'GeoFocus',
    exifToolNames: ['XMP-contextembed:GeoFocus'],
    required: false,
    category: 'evidence'
  },
  
  // Linkage fields
  {
    name: 'DocumentID',
    exifToolNames: ['XMP-xmpMM:DocumentID', 'DocumentID'],
    required: false,
    category: 'linkage'
  },
  {
    name: 'InstanceID',
    exifToolNames: ['XMP-xmpMM:InstanceID', 'InstanceID'],
    required: false,
    category: 'linkage'
  },
  {
    name: 'AssetId',
    exifToolNames: ['XMP-contextembed:AssetId'],
    required: true,
    category: 'linkage'
  },
  {
    name: 'ExportId',
    exifToolNames: ['XMP-contextembed:ExportId'],
    required: false,
    category: 'linkage'
  },
  {
    name: 'ManifestRef',
    exifToolNames: ['XMP-contextembed:ManifestRef'],
    required: false,
    category: 'linkage'
  },
  {
    name: 'Checksum',
    exifToolNames: ['XMP-contextembed:Checksum'],
    required: false,
    category: 'linkage'
  },
  
  // AI Classification fields (existing, now secondary)
  {
    name: 'SceneType',
    exifToolNames: ['XMP-contextembed:SceneType', 'XMP-iptcCore:Scene'],
    required: false,
    category: 'ai-classification'
  },
  {
    name: 'EmotionalTone',
    exifToolNames: ['XMP-contextembed:EmotionalTone'],
    required: false,
    category: 'ai-classification'
  },
  {
    name: 'Intent',
    exifToolNames: ['XMP-contextembed:Intent'],
    required: false,
    category: 'ai-classification'
  },
  {
    name: 'SafetyValidated',
    exifToolNames: ['XMP-contextembed:SafetyValidated'],
    required: false,
    category: 'ai-classification'
  },
  {
    name: 'MetadataVersion',
    exifToolNames: ['XMP-contextembed:MetadataVersion'],
    required: true,
    category: 'linkage'
  },
  
  // IA Structure hooks (optional)
  {
    name: 'TargetPage',
    exifToolNames: ['XMP-contextembed:TargetPage'],
    required: false,
    category: 'evidence'
  },
  {
    name: 'PageRole',
    exifToolNames: ['XMP-contextembed:PageRole'],
    required: false,
    category: 'evidence'
  },
  {
    name: 'ClusterId',
    exifToolNames: ['XMP-contextembed:ClusterId'],
    required: false,
    category: 'evidence'
  },
  
  // Governance Attestation fields (NEW v2.2 - portable proof)
  {
    name: 'AIGenerated',
    exifToolNames: ['XMP-contextembed:AIGenerated'],
    required: false, // Optional for backwards compatibility
    category: 'evidence'
  },
  {
    name: 'AIConfidence',
    exifToolNames: ['XMP-contextembed:AIConfidence'],
    required: false,
    category: 'evidence'
  },
  {
    name: 'GovernanceStatus',
    exifToolNames: ['XMP-contextembed:GovernanceStatus'],
    required: false, // Optional for backwards compatibility
    category: 'evidence'
  },
  {
    name: 'GovernancePolicy',
    exifToolNames: ['XMP-contextembed:GovernancePolicy'],
    required: false,
    category: 'evidence'
  },
  {
    name: 'GovernanceReason',
    exifToolNames: ['XMP-contextembed:GovernanceReason'],
    required: false,
    category: 'evidence'
  },
  {
    name: 'GovernanceCheckedAt',
    exifToolNames: ['XMP-contextembed:GovernanceCheckedAt'],
    required: false,
    category: 'evidence'
  },
  {
    name: 'GovernanceDecisionRef',
    exifToolNames: ['XMP-contextembed:GovernanceDecisionRef'],
    required: false,
    category: 'evidence'
  },
];

// =============================================================================
// AUDIT FUNCTIONS
// =============================================================================

function getFieldValue(tags: Tags, spec: FieldSpec): unknown {
  const t = tags as Record<string, unknown>;
  for (const name of spec.exifToolNames) {
    const value = t[name];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function checkConstraints(
  spec: FieldSpec,
  value: unknown
): Array<{ field: string; violation: string; value?: unknown }> {
  const violations: Array<{ field: string; violation: string; value?: unknown }> = [];
  
  if (!spec.constraints || value === undefined) return violations;
  
  const c = spec.constraints;
  
  if (typeof value === 'string') {
    if (c.minLength && value.length < c.minLength) {
      violations.push({
        field: spec.name,
        violation: `Too short: ${value.length} chars (min ${c.minLength})`,
        value: value.length
      });
    }
    if (c.maxLength && value.length > c.maxLength) {
      violations.push({
        field: spec.name,
        violation: `Too long: ${value.length} chars (max ${c.maxLength})`,
        value: value.length
      });
    }
  }
  
  if (Array.isArray(value)) {
    if (c.minItems && value.length < c.minItems) {
      violations.push({
        field: spec.name,
        violation: `Too few items: ${value.length} (min ${c.minItems})`,
        value: value.length
      });
    }
    if (c.maxItems && value.length > c.maxItems) {
      violations.push({
        field: spec.name,
        violation: `Too many items: ${value.length} (max ${c.maxItems})`,
        value: value.length
      });
    }
    if (c.itemMaxLength) {
      const longItems = value.filter((item: string) => 
        typeof item === 'string' && item.length > c.itemMaxLength!
      );
      if (longItems.length > 0) {
        violations.push({
          field: spec.name,
          violation: `${longItems.length} keywords exceed max length (${c.itemMaxLength} chars)`,
          value: longItems
        });
      }
    }
  }
  
  return violations;
}

function detectRiskFlags(tags: Tags, fieldValues: Record<string, unknown>): RiskFlag[] {
  const flags: RiskFlag[] = [];
  
  // Missing rights notice
  if (!fieldValues['CopyrightNotice']) {
    flags.push({
      code: 'MISSING_RIGHTS',
      severity: 'critical',
      message: 'No copyright notice embedded - ownership unclear'
    });
  }
  
  // Missing business identity
  if (!fieldValues['BusinessName'] && !fieldValues['Credit']) {
    flags.push({
      code: 'MISSING_BUSINESS_IDENTITY',
      severity: 'critical',
      message: 'No business name or credit - cannot establish authority'
    });
  }
  
  // Missing semantic location
  if (!fieldValues['City'] && !fieldValues['Country'] && !fieldValues['GeoFocus']) {
    flags.push({
      code: 'MISSING_LOCATION',
      severity: 'warning',
      message: 'No location metadata - reduces local SEO value'
    });
  }
  
  // Keywords analysis
  const keywords = fieldValues['Keywords'];
  if (Array.isArray(keywords)) {
    // Too many keywords
    if (keywords.length > 15) {
      flags.push({
        code: 'KEYWORD_SPAM_RISK',
        severity: 'warning',
        message: `${keywords.length} keywords may be seen as spam (recommended: 5-15)`
      });
    }
    
    // Check for spam terms
    const spamFound = keywords.filter((kw: string) =>
      SPAM_KEYWORDS.some(spam => kw.toLowerCase().includes(spam.toLowerCase()))
    );
    if (spamFound.length > 0) {
      flags.push({
        code: 'SPAM_KEYWORDS_DETECTED',
        severity: 'warning',
        message: `Found potentially spammy keywords: ${spamFound.slice(0, 3).join(', ')}`
      });
    }
    
    // Check for duplicates (case-insensitive)
    const lowerKeywords = keywords.map((k: string) => k.toLowerCase());
    const duplicates = lowerKeywords.filter((k: string, i: number) => lowerKeywords.indexOf(k) !== i);
    if (duplicates.length > 0) {
      flags.push({
        code: 'DUPLICATE_KEYWORDS',
        severity: 'info',
        message: `Found ${duplicates.length} duplicate keywords`
      });
    }
  }
  
  // Caption analysis
  const caption = fieldValues['Caption-Abstract'] as string;
  if (caption) {
    if (caption.length > 1200) {
      flags.push({
        code: 'CAPTION_TOO_LONG',
        severity: 'warning',
        message: `Caption is ${caption.length} chars (max recommended: 1200)`
      });
    }
    if (caption.length < 200) {
      flags.push({
        code: 'CAPTION_TOO_SHORT',
        severity: 'warning',
        message: `Caption is ${caption.length} chars (min recommended: 200)`
      });
    }
  }
  
  // Custom namespace missing version
  if (!fieldValues['MetadataVersion']) {
    flags.push({
      code: 'MISSING_METADATA_VERSION',
      severity: 'info',
      message: 'No ContextEmbed metadata version - may be legacy embed'
    });
  }
  
  // No manifest linkage
  if (!fieldValues['ManifestRef'] && !fieldValues['AssetId']) {
    flags.push({
      code: 'NO_MANIFEST_LINKAGE',
      severity: 'info',
      message: 'No manifest or asset ID linkage - cannot re-embed if stripped'
    });
  }
  
  // Missing job type (evidence field)
  if (!fieldValues['JobType']) {
    flags.push({
      code: 'MISSING_JOB_TYPE',
      severity: 'warning',
      message: 'No job type - reduces proof-of-work value'
    });
  }
  
  // Governance attestation checks (NEW v2.2)
  const hasGovernanceFields = fieldValues['AIGenerated'] || fieldValues['GovernanceStatus'];
  if (hasGovernanceFields) {
    // Governance is present - check for completeness
    if (!fieldValues['GovernancePolicy']) {
      flags.push({
        code: 'GOVERNANCE_INCOMPLETE',
        severity: 'info',
        message: 'Governance attestation present but missing policy field'
      });
    }
    if (!fieldValues['GovernanceCheckedAt']) {
      flags.push({
        code: 'GOVERNANCE_NO_TIMESTAMP',
        severity: 'info',
        message: 'Governance attestation missing timestamp'
      });
    }
  }
  
  return flags;
}

function calculateHealthScore(
  presentFields: string[],
  missingRequired: string[],
  violations: Array<{ field: string; violation: string }>,
  riskFlags: RiskFlag[]
): { score: number; tier: 'EVIDENCE_EMBEDDED' | 'PARTIALLY_EMBEDDED' | 'NOT_EMBEDDED' } {
  let score = 100;
  
  // Deduct for missing required fields
  const requiredCount = FIELD_SPECS.filter(f => f.required).length;
  const missingRequiredPenalty = (missingRequired.length / requiredCount) * 50;
  score -= missingRequiredPenalty;
  
  // Deduct for constraint violations
  score -= violations.length * 5;
  
  // Deduct for risk flags
  for (const flag of riskFlags) {
    if (flag.severity === 'critical') score -= 15;
    else if (flag.severity === 'warning') score -= 5;
    else score -= 2;
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let tier: 'EVIDENCE_EMBEDDED' | 'PARTIALLY_EMBEDDED' | 'NOT_EMBEDDED';
  
  // Evidence Embedded: score >= 80 AND no critical flags AND has evidence fields
  const hasCriticalFlags = riskFlags.some(f => f.severity === 'critical');
  const hasEvidenceFields = presentFields.includes('BusinessName') || 
                            presentFields.includes('JobType') ||
                            presentFields.includes('ServiceCategory');
  
  if (score >= 80 && !hasCriticalFlags && hasEvidenceFields) {
    tier = 'EVIDENCE_EMBEDDED';
  } else if (score >= 50 || (presentFields.length >= 5 && !hasCriticalFlags)) {
    tier = 'PARTIALLY_EMBEDDED';
  } else {
    tier = 'NOT_EMBEDDED';
  }
  
  return { score: Math.round(score), tier };
}

async function calculateFileChecksum(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function auditAsset(filePath: string, includeRawTags = false): Promise<AssetAuditResult> {
  const stats = await fs.stat(filePath);
  const checksum = await calculateFileChecksum(filePath);
  const tags = await exiftool.read(filePath);
  
  const presentFields: string[] = [];
  const missingRequiredFields: string[] = [];
  const constraintViolations: Array<{ field: string; violation: string; value?: unknown }> = [];
  const fieldValues: Record<string, unknown> = {};
  
  for (const spec of FIELD_SPECS) {
    const value = getFieldValue(tags, spec);
    
    if (value !== undefined) {
      presentFields.push(spec.name);
      fieldValues[spec.name] = value;
      
      // Check constraints
      const violations = checkConstraints(spec, value);
      constraintViolations.push(...violations);
    } else if (spec.required) {
      missingRequiredFields.push(spec.name);
    }
  }
  
  const riskFlags = detectRiskFlags(tags, fieldValues);
  const { score, tier } = calculateHealthScore(
    presentFields,
    missingRequiredFields,
    constraintViolations,
    riskFlags
  );
  
  return {
    filePath,
    fileName: path.basename(filePath),
    fileSize: stats.size,
    checksum,
    presentFields,
    missingRequiredFields,
    constraintViolations,
    riskFlags,
    fieldValues,
    healthScore: score,
    healthTier: tier,
    rawTags: includeRawTags ? tags : undefined,
  };
}

function detectStrippingPatterns(results: AssetAuditResult[]): string[] {
  const patterns: string[] = [];
  
  // Check if XMP-contextembed fields are consistently missing
  const customFieldsMissing = results.every(r => 
    !r.presentFields.includes('MetadataVersion') &&
    !r.presentFields.includes('AssetId')
  );
  if (customFieldsMissing && results.length > 0) {
    patterns.push('Custom XMP-contextembed namespace stripped (all assets)');
  }
  
  // Check if all IPTC fields are missing but EXIF present
  const iptcStripped = results.every(r => 
    !r.presentFields.includes('ObjectName') &&
    !r.presentFields.includes('Caption-Abstract') &&
    r.fieldValues['ImageDescription'] !== undefined
  );
  if (iptcStripped && results.length > 0) {
    patterns.push('IPTC IIM stripped, only EXIF preserved');
  }
  
  // Check if XMP stripped
  const xmpStripped = results.every(r => 
    !r.fieldValues['XMP-dc:Title'] &&
    !r.fieldValues['XMP-dc:Description'] &&
    r.presentFields.includes('ObjectName')
  );
  if (xmpStripped && results.length > 0) {
    patterns.push('XMP stripped, only IPTC IIM preserved');
  }
  
  return patterns;
}

async function auditFolder(folderPath: string, verbose = false): Promise<FolderAuditSummary> {
  const files = await fs.readdir(folderPath);
  const imageFiles = files.filter(f => 
    /\.(jpg|jpeg|png|tiff?|webp)$/i.test(f)
  );
  
  console.log(`\n📂 Auditing folder: ${folderPath}`);
  console.log(`   Found ${imageFiles.length} image files\n`);
  
  const results: AssetAuditResult[] = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const fullPath = path.join(folderPath, file);
    
    process.stdout.write(`   [${i + 1}/${imageFiles.length}] ${file}...`);
    
    try {
      const result = await auditAsset(fullPath, verbose);
      results.push(result);
      
      const tierEmoji = 
        result.healthTier === 'EVIDENCE_EMBEDDED' ? '🟢' :
        result.healthTier === 'PARTIALLY_EMBEDDED' ? '🟡' : '🔴';
      
      console.log(` ${tierEmoji} ${result.healthScore}/100`);
    } catch (error) {
      console.log(` ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
  
  // Compile summary stats
  const fullyCompliant = results.filter(r => r.healthTier === 'EVIDENCE_EMBEDDED').length;
  const partiallyCompliant = results.filter(r => r.healthTier === 'PARTIALLY_EMBEDDED').length;
  const nonCompliant = results.filter(r => r.healthTier === 'NOT_EMBEDDED').length;
  
  // Top missing fields
  const missingFieldCounts: Record<string, number> = {};
  for (const r of results) {
    for (const field of r.missingRequiredFields) {
      missingFieldCounts[field] = (missingFieldCounts[field] || 0) + 1;
    }
  }
  const topMissingFields = Object.entries(missingFieldCounts)
    .map(([field, count]) => ({
      field,
      count,
      percent: Math.round((count / results.length) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Top constraint violations
  const violationCounts: Record<string, number> = {};
  for (const r of results) {
    for (const v of r.constraintViolations) {
      violationCounts[v.violation] = (violationCounts[v.violation] || 0) + 1;
    }
  }
  const topViolations = Object.entries(violationCounts)
    .map(([violation, count]) => ({ violation, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Top risk flags
  const flagCounts: Record<string, { count: number; severity: string }> = {};
  for (const r of results) {
    for (const f of r.riskFlags) {
      if (!flagCounts[f.code]) {
        flagCounts[f.code] = { count: 0, severity: f.severity };
      }
      flagCounts[f.code].count++;
    }
  }
  const topFlags = Object.entries(flagCounts)
    .map(([code, data]) => ({ code, count: data.count, severity: data.severity }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const strippingPatterns = detectStrippingPatterns(results);
  
  return {
    folderPath,
    auditedAt: new Date().toISOString(),
    totalAssets: results.length,
    complianceStats: {
      fullyCompliant,
      partiallyCompliant,
      nonCompliant,
      percentFullyCompliant: results.length > 0 
        ? Math.round((fullyCompliant / results.length) * 100) 
        : 0
    },
    topMissingFields,
    topConstraintViolations: topViolations,
    topRiskFlags: topFlags,
    strippingPatterns,
    assetResults: results
  };
}

function generateMarkdownSummary(summary: FolderAuditSummary): string {
  const { complianceStats: stats } = summary;
  
  let md = `# ContextEmbed Metadata Audit Report

**Folder:** \`${summary.folderPath}\`  
**Audited:** ${summary.auditedAt}  
**Total Assets:** ${summary.totalAssets}

---

## Compliance Summary

| Status | Count | Percentage |
|--------|-------|------------|
| 🟢 Evidence Embedded | ${stats.fullyCompliant} | ${summary.totalAssets > 0 ? Math.round((stats.fullyCompliant / summary.totalAssets) * 100) : 0}% |
| 🟡 Partially Embedded | ${stats.partiallyCompliant} | ${summary.totalAssets > 0 ? Math.round((stats.partiallyCompliant / summary.totalAssets) * 100) : 0}% |
| 🔴 Not Embedded | ${stats.nonCompliant} | ${summary.totalAssets > 0 ? Math.round((stats.nonCompliant / summary.totalAssets) * 100) : 0}% |

`;

  if (summary.topMissingFields.length > 0) {
    md += `## Top Missing Required Fields

| Field | Missing Count | % of Assets |
|-------|---------------|-------------|
`;
    for (const f of summary.topMissingFields) {
      md += `| ${f.field} | ${f.count} | ${f.percent}% |\n`;
    }
    md += '\n';
  }

  if (summary.topRiskFlags.length > 0) {
    md += `## Risk Flags Detected

| Flag | Severity | Count |
|------|----------|-------|
`;
    for (const f of summary.topRiskFlags) {
      const icon = f.severity === 'critical' ? '🔴' : f.severity === 'warning' ? '🟡' : 'ℹ️';
      md += `| ${icon} ${f.code} | ${f.severity} | ${f.count} |\n`;
    }
    md += '\n';
  }

  if (summary.topConstraintViolations.length > 0) {
    md += `## Constraint Violations

| Violation | Count |
|-----------|-------|
`;
    for (const v of summary.topConstraintViolations) {
      md += `| ${v.violation} | ${v.count} |\n`;
    }
    md += '\n';
  }

  if (summary.strippingPatterns.length > 0) {
    md += `## ⚠️ Detected Stripping Patterns

`;
    for (const pattern of summary.strippingPatterns) {
      md += `- ${pattern}\n`;
    }
    md += '\n';
  }

  md += `## Asset Details

| File | Health | Tier | Missing | Flags |
|------|--------|------|---------|-------|
`;
  for (const r of summary.assetResults) {
    const tierEmoji = 
      r.healthTier === 'EVIDENCE_EMBEDDED' ? '🟢' :
      r.healthTier === 'PARTIALLY_EMBEDDED' ? '🟡' : '🔴';
    md += `| ${r.fileName} | ${r.healthScore}/100 | ${tierEmoji} | ${r.missingRequiredFields.length} | ${r.riskFlags.length} |\n`;
  }

  md += `
---

## Field Reference

### Required for "Evidence Embedded" status:
- **Identity:** ObjectName (title), Caption-Abstract (description), Keywords
- **Rights:** By-line (creator), CopyrightNotice, Credit
- **Location:** City, Country
- **Evidence:** BusinessName, JobType, ServiceCategory
- **Linkage:** AssetId, MetadataVersion

### Recommended for full authority:
- ContextLine, OutcomeProof, GeoFocus
- TargetPage, PageRole, ClusterId (IA hooks)
- ManifestRef, ExportId, Checksum (provenance)
- AIGenerated, GovernanceStatus, GovernancePolicy (v2.2 governance)

---
*Generated by ContextEmbed Audit Tool v2.2*
`;

  return md;
}

// =============================================================================
// MANIFEST AUDIT (NEW v2.2 - governance attestation check)
// =============================================================================

interface ManifestAuditResult {
  found: boolean;
  manifestPath?: string;
  hasGovernanceAttestation: boolean;
  assetCount: number;
  assetsWithGovernance: number;
  errors: string[];
}

async function auditManifest(folderPath: string): Promise<ManifestAuditResult> {
  const manifestPath = path.join(folderPath, 'manifest.json');
  const result: ManifestAuditResult = {
    found: false,
    hasGovernanceAttestation: false,
    assetCount: 0,
    assetsWithGovernance: 0,
    errors: [],
  };
  
  try {
    await fs.access(manifestPath);
    result.found = true;
    result.manifestPath = manifestPath;
    
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);
    
    // Check assets for governance attestation
    const assets = manifest.assets || manifest.images || [];
    result.assetCount = assets.length;
    
    for (const asset of assets) {
      if (asset.governanceAttestation) {
        result.assetsWithGovernance++;
        result.hasGovernanceAttestation = true;
      }
    }
    
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      result.errors.push('No manifest.json found in folder');
    } else {
      result.errors.push(`Manifest read error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
  
  return result;
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  const pathIndex = args.indexOf('--path');
  const folderPath = pathIndex !== -1 ? args[pathIndex + 1] : null;
  
  const verbose = args.includes('--verbose');
  const outputDir = args.includes('--output') 
    ? args[args.indexOf('--output') + 1] 
    : null;
  
  if (!folderPath) {
    console.log(`
ContextEmbed Metadata Audit Tool
================================

Usage:
  npx ts-node scripts/audit-embed.ts --path <folder> [options]

Options:
  --path <folder>   Path to folder containing exported images (required)
  --verbose         Include full raw tags in JSON output
  --output <dir>    Output directory for reports (default: same as input)

Example:
  npx ts-node scripts/audit-embed.ts --path ./exports/my-gallery
  npm run audit:embed -- --path ./apps/api/uploads/exports/test
`);
    process.exit(1);
  }
  
  try {
    // Verify folder exists
    await fs.access(folderPath);
    
    const summary = await auditFolder(folderPath, verbose);
    
    // Determine output location
    const reportDir = outputDir || folderPath;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    const jsonPath = path.join(reportDir, `audit_report_${timestamp}.json`);
    const mdPath = path.join(reportDir, `audit_summary_${timestamp}.md`);
    
    // Write JSON report
    await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 JSON report: ${jsonPath}`);
    
    // Write Markdown summary
    const markdown = generateMarkdownSummary(summary);
    await fs.writeFile(mdPath, markdown);
    console.log(`📝 Markdown summary: ${mdPath}`);
    
    // Print summary to console
    console.log('\n' + '='.repeat(50));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total: ${summary.totalAssets} assets`);
    console.log(`🟢 Evidence Embedded: ${summary.complianceStats.fullyCompliant} (${summary.complianceStats.percentFullyCompliant}%)`);
    console.log(`🟡 Partially Embedded: ${summary.complianceStats.partiallyCompliant}`);
    console.log(`🔴 Not Embedded: ${summary.complianceStats.nonCompliant}`);
    
    if (summary.topMissingFields.length > 0) {
      console.log('\nTop missing fields:');
      for (const f of summary.topMissingFields.slice(0, 5)) {
        console.log(`  - ${f.field} (${f.percent}%)`);
      }
    }
    
    // Manifest audit (NEW v2.2 - governance attestation check)
    console.log('\n' + '-'.repeat(50));
    console.log('MANIFEST AUDIT (v2.2)');
    console.log('-'.repeat(50));
    
    const manifestResult = await auditManifest(folderPath);
    if (manifestResult.found) {
      console.log(`📋 Manifest found: ${manifestResult.manifestPath}`);
      console.log(`   Assets in manifest: ${manifestResult.assetCount}`);
      console.log(`   Assets with governance attestation: ${manifestResult.assetsWithGovernance}`);
      
      if (manifestResult.hasGovernanceAttestation) {
        console.log('   ✅ Governance attestation: PRESENT');
      } else {
        console.log('   ⚠️ Governance attestation: NOT FOUND (legacy export or not enabled)');
      }
    } else {
      console.log('   ⚠️ No manifest.json found in export folder');
      if (manifestResult.errors.length > 0) {
        for (const err of manifestResult.errors) {
          console.log(`   - ${err}`);
        }
      }
    }
    
    // Cleanup
    await exiftool.end();
    
  } catch (error) {
    console.error('❌ Audit failed:', error instanceof Error ? error.message : error);
    await exiftool.end();
    process.exit(1);
  }
}

main();

// Export for programmatic use
export {
  auditAsset,
  auditFolder,
  auditManifest,
  generateMarkdownSummary,
  FIELD_SPECS,
  AssetAuditResult,
  FolderAuditSummary,
  ManifestAuditResult,
  RiskFlag,
};
