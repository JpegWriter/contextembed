/**
 * ContextEmbed Survival Test Baseline Generator
 * 
 * Extracts metadata from an embedded image to create a baseline snapshot.
 * Used to compare pre-upload vs post-download metadata survival.
 * 
 * Usage:
 *   npx ts-node scripts/survival/run-survival-test.ts --image ./path/to/embedded.jpg
 *   npx ts-node scripts/survival/run-survival-test.ts --image ./path/to/embedded.jpg --output ./baselines/
 */

import { exiftool, Tags } from 'exiftool-vendored';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

interface ContextEmbedFields {
  // Proof-First Fields
  businessName?: string;
  businessWebsite?: string;
  creatorRole?: string;
  jobType?: string;
  serviceCategory?: string;
  contextLine?: string;
  outcomeProof?: string;
  geoFocus?: string;
  
  // Linkage Fields
  assetId?: string;
  exportId?: string;
  manifestRef?: string;
  checksum?: string;
  
  // IA Structure
  targetPage?: string;
  pageRole?: string;
  clusterId?: string;
  
  // AI Classification
  sceneType?: string;
  primarySubjects?: string;
  emotionalTone?: string;
  intent?: string;
  safetyValidated?: boolean;
  visionConfidenceScore?: number;
  
  // Tooling
  embeddedBy?: string;
  embeddingMethod?: string;
  pipelineVersion?: string;
  metadataVersion?: string;
  embedTier?: string;
  
  // Governance (v2.2)
  aiGenerated?: string;
  aiConfidence?: string;
  governanceStatus?: string;
  governancePolicy?: string;
  governanceReason?: string;
  governanceCheckedAt?: string;
  governanceDecisionRef?: string;
}

interface IPTCCoreFields {
  objectName?: string;
  captionAbstract?: string;
  byLine?: string;
  credit?: string;
  copyrightNotice?: string;
  source?: string;
  keywords?: string[];
  city?: string;
  country?: string;
  usageTerms?: string;
}

interface SurvivalBaseline {
  version: '1.0';
  generatedAt: string;
  sourceFile: string;
  fileChecksum: string;
  fileSize: number;
  
  iptcCore: IPTCCoreFields;
  xmpContextEmbed: ContextEmbedFields;
  
  governancePresent: boolean;
  proofFirstComplete: boolean;
  embedTier: string | null;
  
  rawTagCount: number;
  contextEmbedTagCount: number;
}

// =============================================================================
// EXTRACTION HELPERS
// =============================================================================

function extractIPTCCore(tags: Tags): IPTCCoreFields {
  return {
    objectName: (tags as any)['ObjectName'] || (tags as any)['Title'] || undefined,
    captionAbstract: (tags as any)['Caption-Abstract'] || (tags as any)['Description'] || undefined,
    byLine: (tags as any)['By-line'] || (tags as any)['Artist'] || (tags as any)['Creator'] || undefined,
    credit: (tags as any)['Credit'] || undefined,
    copyrightNotice: (tags as any)['CopyrightNotice'] || (tags as any)['Copyright'] || undefined,
    source: (tags as any)['Source'] || undefined,
    keywords: extractKeywords(tags),
    city: (tags as any)['City'] || undefined,
    country: (tags as any)['Country-PrimaryLocationName'] || (tags as any)['Country'] || undefined,
    usageTerms: (tags as any)['UsageTerms'] || undefined,
  };
}

function extractKeywords(tags: Tags): string[] | undefined {
  const kw = (tags as any)['Keywords'] || (tags as any)['Subject'];
  if (!kw) return undefined;
  if (Array.isArray(kw)) return kw;
  if (typeof kw === 'string') return [kw];
  return undefined;
}

function extractContextEmbed(tags: Tags): ContextEmbedFields {
  const prefix = 'XMP-contextembed:';
  const result: ContextEmbedFields = {};
  
  // Iterate all tags and extract contextembed namespace
  for (const [key, value] of Object.entries(tags)) {
    if (key.startsWith(prefix) || key.startsWith('Contextembed')) {
      const fieldName = key.replace(prefix, '').replace('Contextembed', '');
      const camelCase = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
      (result as any)[camelCase] = value;
    }
  }
  
  // Also check for non-prefixed versions (ExifTool sometimes normalizes)
  const fieldMap: Record<string, keyof ContextEmbedFields> = {
    'BusinessName': 'businessName',
    'BusinessWebsite': 'businessWebsite',
    'CreatorRole': 'creatorRole',
    'JobType': 'jobType',
    'ServiceCategory': 'serviceCategory',
    'ContextLine': 'contextLine',
    'OutcomeProof': 'outcomeProof',
    'GeoFocus': 'geoFocus',
    'AssetId': 'assetId',
    'ExportId': 'exportId',
    'ManifestRef': 'manifestRef',
    'Checksum': 'checksum',
    'TargetPage': 'targetPage',
    'PageRole': 'pageRole',
    'ClusterId': 'clusterId',
    'SceneType': 'sceneType',
    'PrimarySubjects': 'primarySubjects',
    'EmotionalTone': 'emotionalTone',
    'Intent': 'intent',
    'SafetyValidated': 'safetyValidated',
    'VisionConfidenceScore': 'visionConfidenceScore',
    'EmbeddedBy': 'embeddedBy',
    'EmbeddingMethod': 'embeddingMethod',
    'PipelineVersion': 'pipelineVersion',
    'MetadataVersion': 'metadataVersion',
    'EmbedTier': 'embedTier',
    'AIGenerated': 'aiGenerated',
    'AIConfidence': 'aiConfidence',
    'GovernanceStatus': 'governanceStatus',
    'GovernancePolicy': 'governancePolicy',
    'GovernanceReason': 'governanceReason',
    'GovernanceCheckedAt': 'governanceCheckedAt',
    'GovernanceDecisionRef': 'governanceDecisionRef',
  };
  
  for (const [exifKey, fieldKey] of Object.entries(fieldMap)) {
    const value = (tags as any)[exifKey] || (tags as any)[`XMP-contextembed:${exifKey}`];
    if (value !== undefined && result[fieldKey] === undefined) {
      (result as any)[fieldKey] = value;
    }
  }
  
  return result;
}

async function calculateChecksum(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// =============================================================================
// MAIN
// =============================================================================

async function generateBaseline(imagePath: string, outputDir?: string): Promise<SurvivalBaseline> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('ContextEmbed Survival Test Baseline Generator');
  console.log('='.repeat(50));
  
  // Verify file exists
  await fs.access(imagePath);
  const stats = await fs.stat(imagePath);
  const checksum = await calculateChecksum(imagePath);
  
  console.log(`\nSource: ${imagePath}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`Checksum: ${checksum.substring(0, 16)}...`);
  
  // Read all tags
  console.log('\nExtracting metadata...');
  const tags = await exiftool.read(imagePath);
  
  // Extract structured fields
  const iptcCore = extractIPTCCore(tags);
  const xmpContextEmbed = extractContextEmbed(tags);
  
  // Count tags
  const rawTagCount = Object.keys(tags).length;
  const contextEmbedTagCount = Object.keys(xmpContextEmbed).filter(k => (xmpContextEmbed as any)[k] !== undefined).length;
  
  // Check governance presence
  const governancePresent = !!(
    xmpContextEmbed.aiGenerated ||
    xmpContextEmbed.governanceStatus ||
    xmpContextEmbed.governancePolicy
  );
  
  // Check proof-first completeness
  const proofFirstComplete = !!(
    xmpContextEmbed.businessName &&
    xmpContextEmbed.jobType &&
    xmpContextEmbed.serviceCategory &&
    xmpContextEmbed.assetId
  );
  
  const baseline: SurvivalBaseline = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(imagePath),
    fileChecksum: checksum,
    fileSize: stats.size,
    iptcCore,
    xmpContextEmbed,
    governancePresent,
    proofFirstComplete,
    embedTier: xmpContextEmbed.embedTier || null,
    rawTagCount,
    contextEmbedTagCount,
  };
  
  // Output summary
  console.log('\n' + '-'.repeat(50));
  console.log('BASELINE SUMMARY');
  console.log('-'.repeat(50));
  console.log(`Raw tags found: ${rawTagCount}`);
  console.log(`ContextEmbed tags: ${contextEmbedTagCount}`);
  console.log(`Proof-First complete: ${proofFirstComplete ? '✅ YES' : '❌ NO'}`);
  console.log(`Governance present: ${governancePresent ? '✅ YES' : '⚠️ NO'}`);
  console.log(`Embed Tier: ${xmpContextEmbed.embedTier || 'NOT SET'}`);
  
  if (iptcCore.objectName) console.log(`\nTitle: ${iptcCore.objectName}`);
  if (iptcCore.byLine) console.log(`Creator: ${iptcCore.byLine}`);
  if (xmpContextEmbed.businessName) console.log(`Business: ${xmpContextEmbed.businessName}`);
  if (xmpContextEmbed.jobType) console.log(`Job Type: ${xmpContextEmbed.jobType}`);
  
  // Write baseline file
  const outputPath = outputDir
    ? path.join(outputDir, 'baseline-survival.json')
    : path.join(path.dirname(imagePath), 'baseline-survival.json');
  
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(baseline, null, 2));
  
  console.log(`\n📄 Baseline saved: ${outputPath}`);
  
  await exiftool.end();
  
  return baseline;
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  const imageIndex = args.indexOf('--image');
  const imagePath = imageIndex !== -1 ? args[imageIndex + 1] : null;
  
  const outputIndex = args.indexOf('--output');
  const outputDir = outputIndex !== -1 ? args[outputIndex + 1] : undefined;
  
  if (!imagePath) {
    console.log(`
ContextEmbed Survival Test Baseline Generator
==============================================

Usage:
  npx ts-node scripts/survival/run-survival-test.ts --image <path> [options]

Options:
  --image <path>    Path to embedded image file (required)
  --output <dir>    Output directory for baseline JSON (default: same as image)

Example:
  npx ts-node scripts/survival/run-survival-test.ts --image ./exports/test/photo.jpg
  npx ts-node scripts/survival/run-survival-test.ts --image ./photo.jpg --output ./baselines/

This script extracts all XMP-contextembed:* tags from an embedded image
and saves a baseline-survival.json snapshot for comparison after platform upload.
`);
    process.exit(1);
  }
  
  try {
    await generateBaseline(imagePath, outputDir);
    console.log('\n✅ Baseline generation complete');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    await exiftool.end();
    process.exit(1);
  }
}

main();

// Export for programmatic use
export {
  generateBaseline,
  SurvivalBaseline,
  ContextEmbedFields,
  IPTCCoreFields,
};
