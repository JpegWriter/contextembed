/**
 * ContextEmbed Manifest Generator
 * 
 * Generates manifest.json for export bundles containing:
 * - All standard mapped fields
 * - All XMP-contextembed fields
 * - SHA-256 checksums
 * - Embed tier classification
 * 
 * The manifest serves as portable truth - if platforms strip metadata,
 * we can re-embed using the manifest.
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  MetadataContract, 
  IPTCCoreContract, 
  XMPContextEmbedContract,
  EmbedTier,
  EMBED_TIERS,
  JOB_TYPES,
  PAGE_ROLES,
} from './iptc-contract';

// =============================================================================
// MANIFEST TYPES
// =============================================================================

export interface ManifestAsset {
  // File identification
  fileName: string;
  originalFileName?: string;
  assetId: string;
  
  // Checksums
  checksum: string;
  checksumAlgorithm: 'sha256';
  originalChecksum?: string;
  
  // Embed status
  embedTier: EmbedTier;
  embeddedAt: string;
  metadataVersion: string;
  
  // Full metadata contract (portable truth)
  iptc: IPTCCoreContract;
  xmpContextEmbed: Omit<XMPContextEmbedContract, 'checksum'>;
  
  // Health scoring
  healthScore: number;
  healthStatus: 'EVIDENCE_EMBEDDED' | 'PARTIALLY_EMBEDDED' | 'NOT_EMBEDDED';
  missingFields: string[];
  warnings: string[];
}

export interface ExportManifest {
  // Manifest metadata
  manifestVersion: '2.1';
  generatedAt: string;
  generatedBy: 'ContextEmbed';
  
  // Export identification
  exportId: string;
  projectId?: string;
  
  // Business context
  businessName: string;
  businessWebsite?: string;
  
  // Export summary
  totalAssets: number;
  embedTierSummary: {
    authority: number;
    evidence: number;
    basic: number;
    incomplete: number;
  };
  
  // Assets
  assets: ManifestAsset[];
  
  // Verification
  manifestChecksum: string;
}

// =============================================================================
// CHECKSUM UTILITIES
// =============================================================================

export async function calculateFileChecksum(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function calculateStringChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// =============================================================================
// HEALTH SCORING
// =============================================================================

export interface HealthReport {
  score: number;
  status: 'EVIDENCE_EMBEDDED' | 'PARTIALLY_EMBEDDED' | 'NOT_EMBEDDED';
  missingFields: string[];
  warnings: string[];
  embedTier: EmbedTier;
}

const REQUIRED_CORE_FIELDS = [
  'objectName',
  'captionAbstract',
  'byLine',
  'copyrightNotice',
  'credit',
  'keywords',
  'city',
  'country',
  'rightsUsageTerms',
];

const REQUIRED_EVIDENCE_FIELDS = [
  'businessName',
  'jobType',
  'serviceCategory',
  'assetId',
];

const RECOMMENDED_FIELDS = [
  'contextLine',
  'outcomeProof',
  'geoFocus',
  'targetPage',
  'pageRole',
  'checksum',
  'manifestRef',
];

export function calculateHealthReport(contract: MetadataContract): HealthReport {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  let score = 100;
  
  const { iptc, xmpContextEmbed } = contract;
  
  // Check core IPTC fields
  for (const field of REQUIRED_CORE_FIELDS) {
    const value = iptc[field as keyof IPTCCoreContract];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      missingFields.push(`iptc.${field}`);
      score -= 8; // Core fields heavily weighted
    }
  }
  
  // Check keywords specifically
  if (iptc.keywords) {
    if (iptc.keywords.length < 5) {
      warnings.push(`Only ${iptc.keywords.length} keywords (minimum 5 recommended)`);
      score -= 5;
    }
    if (iptc.keywords.length > 15) {
      warnings.push(`${iptc.keywords.length} keywords may be seen as spam (max 15 recommended)`);
      score -= 3;
    }
  }
  
  // Check caption length
  if (iptc.captionAbstract) {
    if (iptc.captionAbstract.length < 200) {
      warnings.push(`Caption too short: ${iptc.captionAbstract.length} chars (min 200)`);
      score -= 5;
    }
    if (iptc.captionAbstract.length > 1200) {
      warnings.push(`Caption too long: ${iptc.captionAbstract.length} chars (max 1200)`);
      score -= 3;
    }
  }
  
  // Check evidence fields (proof-first)
  if (xmpContextEmbed) {
    for (const field of REQUIRED_EVIDENCE_FIELDS) {
      const value = xmpContextEmbed[field as keyof XMPContextEmbedContract];
      if (!value) {
        missingFields.push(`xmpContextEmbed.${field}`);
        score -= 6; // Evidence fields moderately weighted
      }
    }
    
    // Check recommended fields (warnings only)
    for (const field of RECOMMENDED_FIELDS) {
      const value = xmpContextEmbed[field as keyof XMPContextEmbedContract];
      if (!value) {
        warnings.push(`Recommended field missing: ${field}`);
        score -= 1;
      }
    }
    
    // Validate jobType enum
    if (xmpContextEmbed.jobType && !JOB_TYPES.includes(xmpContextEmbed.jobType as any)) {
      warnings.push(`Invalid jobType: ${xmpContextEmbed.jobType}`);
      score -= 2;
    }
    
    // Validate pageRole enum
    if (xmpContextEmbed.pageRole && !PAGE_ROLES.includes(xmpContextEmbed.pageRole as any)) {
      warnings.push(`Invalid pageRole: ${xmpContextEmbed.pageRole}`);
      score -= 2;
    }
  } else {
    // No XMP context embed at all
    for (const field of REQUIRED_EVIDENCE_FIELDS) {
      missingFields.push(`xmpContextEmbed.${field}`);
    }
    score -= 30;
  }
  
  score = Math.max(0, Math.min(100, score));
  
  // Determine embed tier
  let embedTier: EmbedTier;
  const hasIAHooks = xmpContextEmbed?.targetPage && xmpContextEmbed?.pageRole;
  const hasEvidence = xmpContextEmbed?.businessName && 
                      xmpContextEmbed?.jobType && 
                      xmpContextEmbed?.serviceCategory &&
                      xmpContextEmbed?.assetId;
  
  if (hasIAHooks && hasEvidence && (xmpContextEmbed?.contextLine || xmpContextEmbed?.outcomeProof)) {
    embedTier = EMBED_TIERS.AUTHORITY;
  } else if (hasEvidence) {
    embedTier = EMBED_TIERS.EVIDENCE;
  } else if (missingFields.filter(f => f.startsWith('iptc.')).length === 0) {
    embedTier = EMBED_TIERS.BASIC;
  } else {
    embedTier = EMBED_TIERS.INCOMPLETE;
  }
  
  // Determine status for UI
  let status: 'EVIDENCE_EMBEDDED' | 'PARTIALLY_EMBEDDED' | 'NOT_EMBEDDED';
  if (embedTier === EMBED_TIERS.AUTHORITY || embedTier === EMBED_TIERS.EVIDENCE) {
    status = 'EVIDENCE_EMBEDDED';
  } else if (embedTier === EMBED_TIERS.BASIC) {
    status = 'PARTIALLY_EMBEDDED';
  } else {
    status = 'NOT_EMBEDDED';
  }
  
  return {
    score: Math.round(score),
    status,
    missingFields,
    warnings,
    embedTier,
  };
}

// =============================================================================
// MANIFEST GENERATION
// =============================================================================

export interface GenerateManifestOptions {
  exportId: string;
  projectId?: string;
  businessName: string;
  businessWebsite?: string;
  assets: Array<{
    filePath: string;
    originalFileName?: string;
    contract: MetadataContract;
  }>;
  outputPath: string;
}

export async function generateManifest(options: GenerateManifestOptions): Promise<ExportManifest> {
  const { exportId, projectId, businessName, businessWebsite, assets, outputPath } = options;
  
  const manifestAssets: ManifestAsset[] = [];
  const tierCounts = { authority: 0, evidence: 0, basic: 0, incomplete: 0 };
  
  for (const asset of assets) {
    const checksum = await calculateFileChecksum(asset.filePath);
    const healthReport = calculateHealthReport(asset.contract);
    
    // Update tier counts
    switch (healthReport.embedTier) {
      case EMBED_TIERS.AUTHORITY: tierCounts.authority++; break;
      case EMBED_TIERS.EVIDENCE: tierCounts.evidence++; break;
      case EMBED_TIERS.BASIC: tierCounts.basic++; break;
      case EMBED_TIERS.INCOMPLETE: tierCounts.incomplete++; break;
    }
    
    const manifestAsset: ManifestAsset = {
      fileName: path.basename(asset.filePath),
      originalFileName: asset.originalFileName,
      assetId: asset.contract.xmpContextEmbed?.assetId || crypto.randomUUID(),
      checksum,
      checksumAlgorithm: 'sha256',
      embedTier: healthReport.embedTier,
      embeddedAt: new Date().toISOString(),
      metadataVersion: asset.contract.xmpContextEmbed?.metadataVersion || '2.1',
      iptc: asset.contract.iptc,
      xmpContextEmbed: {
        ...asset.contract.xmpContextEmbed,
      },
      healthScore: healthReport.score,
      healthStatus: healthReport.status,
      missingFields: healthReport.missingFields,
      warnings: healthReport.warnings,
    };
    
    manifestAssets.push(manifestAsset);
  }
  
  // Build manifest (without checksum first)
  const manifestWithoutChecksum: Omit<ExportManifest, 'manifestChecksum'> = {
    manifestVersion: '2.1',
    generatedAt: new Date().toISOString(),
    generatedBy: 'ContextEmbed',
    exportId,
    projectId,
    businessName,
    businessWebsite,
    totalAssets: manifestAssets.length,
    embedTierSummary: tierCounts,
    assets: manifestAssets,
  };
  
  // Calculate manifest checksum
  const manifestChecksum = calculateStringChecksum(JSON.stringify(manifestWithoutChecksum));
  
  const manifest: ExportManifest = {
    ...manifestWithoutChecksum,
    manifestChecksum,
  };
  
  // Write manifest to file
  await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));
  
  return manifest;
}

// =============================================================================
// MANIFEST READING
// =============================================================================

export async function readManifest(manifestPath: string): Promise<ExportManifest | null> {
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as ExportManifest;
    
    // Verify checksum
    const { manifestChecksum, ...rest } = manifest;
    const calculatedChecksum = calculateStringChecksum(JSON.stringify(rest));
    
    if (calculatedChecksum !== manifestChecksum) {
      console.warn('Manifest checksum mismatch - file may have been modified');
    }
    
    return manifest;
  } catch (error) {
    console.error('Failed to read manifest:', error);
    return null;
  }
}

// =============================================================================
// MANIFEST DIFF (for re-embed scenarios)
// =============================================================================

export interface ManifestDiff {
  addedAssets: string[];
  removedAssets: string[];
  modifiedAssets: string[];
  checksumMismatches: Array<{ assetId: string; expected: string; actual: string }>;
}

export async function compareManifests(
  oldManifest: ExportManifest,
  newManifest: ExportManifest
): Promise<ManifestDiff> {
  const oldAssetMap = new Map(oldManifest.assets.map(a => [a.assetId, a]));
  const newAssetMap = new Map(newManifest.assets.map(a => [a.assetId, a]));
  
  const addedAssets: string[] = [];
  const removedAssets: string[] = [];
  const modifiedAssets: string[] = [];
  const checksumMismatches: Array<{ assetId: string; expected: string; actual: string }> = [];
  
  // Find added and modified
  for (const [assetId, newAsset] of newAssetMap) {
    const oldAsset = oldAssetMap.get(assetId);
    if (!oldAsset) {
      addedAssets.push(assetId);
    } else if (oldAsset.checksum !== newAsset.checksum) {
      modifiedAssets.push(assetId);
      checksumMismatches.push({
        assetId,
        expected: oldAsset.checksum,
        actual: newAsset.checksum,
      });
    }
  }
  
  // Find removed
  for (const assetId of oldAssetMap.keys()) {
    if (!newAssetMap.has(assetId)) {
      removedAssets.push(assetId);
    }
  }
  
  return {
    addedAssets,
    removedAssets,
    modifiedAssets,
    checksumMismatches,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  EMBED_TIERS,
  JOB_TYPES,
  PAGE_ROLES,
};
