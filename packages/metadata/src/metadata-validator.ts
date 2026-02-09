/**
 * Metadata Validator
 * Enforces IPTC contract before export
 * 
 * ❌ Export is BLOCKED if validation fails
 * 
 * v2.1 - Added proof-first field validation
 */

import {
  MetadataContract,
  IPTCCoreContract,
  XMPContextEmbedContract,
  ValidationResult as IptcValidationResult,
  ValidationError,
  ValidationWarning,
  IPTC_CONSTRAINTS,
  EXPORT_FAILURE_CONDITIONS,
  requiresSafetyValidation,
  JOB_TYPES,
  PAGE_ROLES,
  isSpamKeyword,
} from './iptc-contract';

// Re-export for convenience
export type { IptcValidationResult as ValidationResult };
export type { ValidationError, ValidationWarning };

/**
 * Validate metadata against IPTC contract
 * Returns validation result with errors and warnings
 */
export function validateMetadataContract(
  contract: Partial<MetadataContract>
): IptcValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const iptc = contract.iptc;
  const xmp = contract.xmpContextEmbed;
  
  // ==========================================================================
  // IPTC CORE VALIDATION
  // ==========================================================================
  
  if (!iptc) {
    errors.push({
      field: 'iptc',
      rule: 'required',
      message: 'IPTC core metadata is required',
    });
    return { valid: false, errors, warnings };
  }
  
  // ObjectName (Title)
  if (!iptc.objectName || iptc.objectName.trim() === '') {
    errors.push({
      field: 'objectName',
      rule: 'required',
      message: EXPORT_FAILURE_CONDITIONS.CREATOR_MISSING,
    });
  } else if (iptc.objectName.length > IPTC_CONSTRAINTS.objectName.maxLength) {
    errors.push({
      field: 'objectName',
      rule: 'maxLength',
      message: EXPORT_FAILURE_CONDITIONS.TITLE_TOO_LONG,
      value: iptc.objectName.length,
    });
  }
  
  // Caption-Abstract
  if (!iptc.captionAbstract || iptc.captionAbstract.trim() === '') {
    errors.push({
      field: 'captionAbstract',
      rule: 'required',
      message: 'Caption/Description is required',
    });
  } else {
    if (iptc.captionAbstract.length < IPTC_CONSTRAINTS.captionAbstract.minLength) {
      errors.push({
        field: 'captionAbstract',
        rule: 'minLength',
        message: EXPORT_FAILURE_CONDITIONS.CAPTION_TOO_SHORT,
        value: iptc.captionAbstract.length,
      });
    }
    if (iptc.captionAbstract.length > IPTC_CONSTRAINTS.captionAbstract.maxLength) {
      warnings.push({
        field: 'captionAbstract',
        message: `Caption is ${iptc.captionAbstract.length} chars (max recommended: ${IPTC_CONSTRAINTS.captionAbstract.maxLength})`,
      });
    }
  }
  
  // By-line (Creator)
  if (!iptc.byLine || iptc.byLine.trim() === '') {
    errors.push({
      field: 'byLine',
      rule: 'required',
      message: EXPORT_FAILURE_CONDITIONS.CREATOR_MISSING,
    });
  }
  
  // Credit
  if (!iptc.credit || iptc.credit.trim() === '') {
    errors.push({
      field: 'credit',
      rule: 'required',
      message: EXPORT_FAILURE_CONDITIONS.CREDIT_MISSING,
    });
  }
  
  // Copyright Notice
  if (!iptc.copyrightNotice || iptc.copyrightNotice.trim() === '') {
    errors.push({
      field: 'copyrightNotice',
      rule: 'required',
      message: EXPORT_FAILURE_CONDITIONS.COPYRIGHT_MISSING,
    });
  }
  
  // Keywords
  if (!iptc.keywords || iptc.keywords.length === 0) {
    errors.push({
      field: 'keywords',
      rule: 'required',
      message: EXPORT_FAILURE_CONDITIONS.KEYWORDS_TOO_FEW,
    });
  } else if (iptc.keywords.length < IPTC_CONSTRAINTS.keywords.minCount) {
    errors.push({
      field: 'keywords',
      rule: 'minCount',
      message: EXPORT_FAILURE_CONDITIONS.KEYWORDS_TOO_FEW,
      value: iptc.keywords.length,
    });
  }
  
  // City
  if (!iptc.city || iptc.city.trim() === '') {
    errors.push({
      field: 'city',
      rule: 'required',
      message: EXPORT_FAILURE_CONDITIONS.CITY_MISSING,
    });
  }
  
  // Country
  if (!iptc.country || iptc.country.trim() === '') {
    errors.push({
      field: 'country',
      rule: 'required',
      message: EXPORT_FAILURE_CONDITIONS.COUNTRY_MISSING,
    });
  }
  
  // Rights Usage Terms
  if (!iptc.rightsUsageTerms || iptc.rightsUsageTerms.trim() === '') {
    errors.push({
      field: 'rightsUsageTerms',
      rule: 'required',
      message: EXPORT_FAILURE_CONDITIONS.RIGHTS_MISSING,
    });
  }
  
  // ==========================================================================
  // XMP CONTEXTEMBED VALIDATION (v2.1 - proof-first fields)
  // ==========================================================================
  
  if (xmp) {
    // Safety validation for sensitive content
    if (xmp.sceneType && xmp.primarySubjects) {
      const subjects = xmp.primarySubjects.split(',').map(s => s.trim());
      if (requiresSafetyValidation(xmp.sceneType, subjects)) {
        if (!xmp.safetyValidated) {
          errors.push({
            field: 'safetyValidated',
            rule: 'safety',
            message: EXPORT_FAILURE_CONDITIONS.SAFETY_NOT_VALIDATED,
          });
        }
      }
    }
    
    // Confidence score warning
    if (xmp.visionConfidenceScore !== undefined && xmp.visionConfidenceScore < 70) {
      warnings.push({
        field: 'visionConfidenceScore',
        message: `Low vision confidence score: ${xmp.visionConfidenceScore}%. Manual review recommended.`,
      });
    }
    
    // --- PROOF-FIRST FIELD VALIDATION (v2.1) ---
    
    // businessName is required for authority
    if (!xmp.businessName || xmp.businessName.trim() === '') {
      errors.push({
        field: 'businessName',
        rule: 'required',
        message: 'Business name is required for evidence-backed metadata',
      });
    } else if (xmp.businessName.length > (IPTC_CONSTRAINTS.businessName?.maxLength || 120)) {
      warnings.push({
        field: 'businessName',
        message: `Business name too long: ${xmp.businessName.length} chars`,
      });
    }
    
    // jobType is required and must be valid enum
    if (!xmp.jobType || xmp.jobType.trim() === '') {
      errors.push({
        field: 'jobType',
        rule: 'required',
        message: 'Job type is required for proof-first metadata',
      });
    } else if (!JOB_TYPES.includes(xmp.jobType as any)) {
      errors.push({
        field: 'jobType',
        rule: 'enum',
        message: `Invalid jobType: ${xmp.jobType}. Must be one of: ${JOB_TYPES.join(', ')}`,
        value: xmp.jobType,
      });
    }
    
    // serviceCategory is required
    if (!xmp.serviceCategory || xmp.serviceCategory.trim() === '') {
      errors.push({
        field: 'serviceCategory',
        rule: 'required',
        message: 'Service category is required for proof-first metadata',
      });
    } else if (xmp.serviceCategory.length > (IPTC_CONSTRAINTS.serviceCategory?.maxLength || 60)) {
      warnings.push({
        field: 'serviceCategory',
        message: `Service category too long: ${xmp.serviceCategory.length} chars`,
      });
    }
    
    // assetId is required for linkage
    if (!xmp.assetId || xmp.assetId.trim() === '') {
      errors.push({
        field: 'assetId',
        rule: 'required',
        message: 'Asset ID is required for manifest linkage',
      });
    }
    
    // Validate pageRole enum if present
    if (xmp.pageRole && !PAGE_ROLES.includes(xmp.pageRole as any)) {
      errors.push({
        field: 'pageRole',
        rule: 'enum',
        message: `Invalid pageRole: ${xmp.pageRole}. Must be one of: ${PAGE_ROLES.join(', ')}`,
        value: xmp.pageRole,
      });
    }
    
    // Recommend evidence fields for full authority
    if (!xmp.contextLine && !xmp.outcomeProof) {
      warnings.push({
        field: 'contextLine',
        message: 'Add contextLine or outcomeProof for full evidence tier',
      });
    }
    
    // Recommend IA hooks for authority tier
    if (!xmp.targetPage || !xmp.pageRole) {
      warnings.push({
        field: 'targetPage',
        message: 'Add targetPage and pageRole for authority tier SEO linkage',
      });
    }
  } else {
    // No XMP context embed at all - this is a critical error for v2.1
    errors.push({
      field: 'xmpContextEmbed',
      rule: 'required',
      message: 'XMP ContextEmbed metadata is required for proof-first embedding',
    });
  }
  
  // ==========================================================================
  // KEYWORD QUALITY CHECKS (v2.1 - enhanced)
  // ==========================================================================
  
  if (iptc.keywords && iptc.keywords.length > 0) {
    // Check for too many keywords (spam risk)
    if (iptc.keywords.length > (IPTC_CONSTRAINTS.keywords.maxCount || 15)) {
      warnings.push({
        field: 'keywords',
        message: `Too many keywords: ${iptc.keywords.length} (max ${IPTC_CONSTRAINTS.keywords.maxCount} to avoid spam flags)`,
      });
    }
    
    // Check for sentence-like keywords
    const sentenceKeywords = iptc.keywords.filter(k => 
      k.split(' ').length > 3 || k.includes('.')
    );
    if (sentenceKeywords.length > 0) {
      warnings.push({
        field: 'keywords',
        message: `Some keywords appear to be sentences: "${sentenceKeywords[0]}"`,
      });
    }
    
    // Check for duplicates
    const lowerKeywords = iptc.keywords.map(k => k.toLowerCase());
    const uniqueKeywords = new Set(lowerKeywords);
    if (uniqueKeywords.size < iptc.keywords.length) {
      warnings.push({
        field: 'keywords',
        message: `Duplicate keywords detected (${iptc.keywords.length - uniqueKeywords.size} duplicates)`,
      });
    }
    
    // Check for spam keywords
    const spamKeywords = iptc.keywords.filter(k => isSpamKeyword(k));
    if (spamKeywords.length > 0) {
      warnings.push({
        field: 'keywords',
        message: `Spam keywords detected: ${spamKeywords.slice(0, 3).join(', ')}. These will be removed.`,
      });
    }
    
    // Check individual keyword length
    const longKeywords = iptc.keywords.filter(k => 
      k.length > (IPTC_CONSTRAINTS.keywords.itemMaxLength || 24)
    );
    if (longKeywords.length > 0) {
      warnings.push({
        field: 'keywords',
        message: `${longKeywords.length} keywords exceed max length (${IPTC_CONSTRAINTS.keywords.itemMaxLength} chars)`,
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate metadata and throw if invalid
 * Use this before export to block invalid files
 */
export function assertValidMetadata(contract: Partial<MetadataContract>): void {
  const result = validateMetadataContract(contract);
  
  if (!result.valid) {
    const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    throw new Error(`Export blocked - metadata validation failed: ${errorMessages}`);
  }
}

/**
 * Check if metadata is export-ready
 */
export function isExportReady(contract: Partial<MetadataContract>): boolean {
  const result = validateMetadataContract(contract);
  return result.valid;
}

/**
 * Get human-readable validation report
 */
export function getValidationReport(contract: Partial<MetadataContract>): string {
  const result = validateMetadataContract(contract);
  
  const lines: string[] = [
    '=== IPTC METADATA VALIDATION REPORT ===',
    '',
  ];
  
  if (result.valid) {
    lines.push('✅ VALIDATION PASSED - Ready for export');
  } else {
    lines.push('❌ VALIDATION FAILED - Export blocked');
  }
  
  if (result.errors.length > 0) {
    lines.push('');
    lines.push('ERRORS (must fix):');
    for (const error of result.errors) {
      lines.push(`  ❌ ${error.field}: ${error.message}`);
    }
  }
  
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('WARNINGS (review recommended):');
    for (const warning of result.warnings) {
      lines.push(`  ⚠️ ${warning.field}: ${warning.message}`);
    }
  }
  
  return lines.join('\n');
}
