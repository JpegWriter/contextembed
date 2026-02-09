/**
 * Field Mapper - Enterprise-grade
 * Maps between internal metadata format and ExifTool tags
 * Supports full IPTC Core, XMP-dc, XMP-xmpRights, XMP-photoshop, XMP-Iptc4xmpCore, XMP-xmpMM
 */

import { SynthesizedMetadata } from '@contextembed/core';
import { Tags } from 'exiftool-vendored';

/**
 * Map internal metadata to ExifTool tags
 * Enterprise-grade with full namespace support
 */
export function mapMetadataToExifTool(
  metadata: SynthesizedMetadata
): Record<string, string | string[] | number> {
  const tags: Record<string, string | string[] | number> = {};
  
  // =========================
  // DESCRIPTIVE (Core IPTC)
  // =========================
  
  // Headline - the main short title
  if (metadata.headline) {
    tags['Headline'] = metadata.headline;
    tags['XMP-photoshop:Headline'] = metadata.headline;
  }
  
  // Description/Caption - the full description
  if (metadata.description) {
    tags['Caption-Abstract'] = metadata.description;
    tags['XMP-dc:Description'] = metadata.description;
    tags['ImageDescription'] = metadata.description;
  }
  
  // Keywords - subject terms
  if (metadata.keywords && metadata.keywords.length > 0) {
    tags['Keywords'] = metadata.keywords;
    tags['XMP-dc:Subject'] = metadata.keywords;
  }
  
  // Title - formal title (often same as headline)
  if (metadata.title) {
    tags['ObjectName'] = metadata.title;
    tags['XMP-dc:Title'] = metadata.title;
  }
  
  // Alt text for accessibility
  if (metadata.altTextShort) {
    // Store in IPTC AltTextAccessibility (IPTC Photo Metadata 2021)
    tags['XMP-iptcExt:AltTextAccessibility'] = metadata.altTextShort;
  }
  if (metadata.altTextLong) {
    tags['XMP-iptcExt:ExtDescrAccessibility'] = metadata.altTextLong;
  }
  
  // Language
  if (metadata.language) {
    tags['XMP-dc:Language'] = metadata.language;
  }
  
  // =========================
  // ATTRIBUTION & RIGHTS
  // =========================
  
  // Creator/Artist
  if (metadata.creator) {
    tags['By-line'] = metadata.creator;
    tags['XMP-dc:Creator'] = metadata.creator;
    tags['Artist'] = metadata.creator;
  }
  
  // Copyright Notice
  if (metadata.copyright) {
    tags['CopyrightNotice'] = metadata.copyright;
    tags['XMP-dc:Rights'] = metadata.copyright;
    tags['Copyright'] = metadata.copyright;
  }
  
  // Credit Line
  if (metadata.credit) {
    tags['Credit'] = metadata.credit;
    tags['XMP-photoshop:Credit'] = metadata.credit;
  }
  
  // Source
  if (metadata.source) {
    tags['Source'] = metadata.source;
    tags['XMP-photoshop:Source'] = metadata.source;
    tags['XMP-dc:Source'] = metadata.source;
  }
  
  // Usage Terms (license text)
  if (metadata.usageTerms) {
    tags['XMP-xmpRights:UsageTerms'] = metadata.usageTerms;
  }
  
  // Web Statement of Rights (URL to license/rights page)
  if (metadata.webStatement) {
    tags['XMP-xmpRights:WebStatement'] = metadata.webStatement;
  }
  
  // Copyright Status (Marked = copyrighted)
  if (metadata.copyrightStatus) {
    tags['XMP-xmpRights:Marked'] = metadata.copyrightStatus === 'copyrighted' ? 'True' : 'False';
  }
  
  // Licensor information (IPTC Extension)
  if (metadata.licensorName) {
    tags['XMP-plus:LicensorName'] = metadata.licensorName;
  }
  if (metadata.licensorEmail) {
    tags['XMP-plus:LicensorEmail'] = metadata.licensorEmail;
  }
  if (metadata.licensorUrl) {
    tags['XMP-plus:LicensorURL'] = metadata.licensorUrl;
  }
  
  // =========================
  // LOCATION (Complete)
  // =========================
  
  if (metadata.sublocation) {
    tags['Sub-location'] = metadata.sublocation;
    tags['XMP-iptcCore:Location'] = metadata.sublocation;
  }
  
  if (metadata.city) {
    tags['City'] = metadata.city;
    tags['XMP-photoshop:City'] = metadata.city;
  }
  
  if (metadata.state) {
    tags['Province-State'] = metadata.state;
    tags['XMP-photoshop:State'] = metadata.state;
  }
  
  if (metadata.country) {
    tags['Country-PrimaryLocationName'] = metadata.country;
    tags['XMP-photoshop:Country'] = metadata.country;
  }
  
  if (metadata.countryCode) {
    tags['Country-PrimaryLocationCode'] = metadata.countryCode;
    tags['XMP-iptcCore:CountryCode'] = metadata.countryCode;
  }
  
  // =========================
  // WORKFLOW
  // =========================
  
  // Special Instructions
  if (metadata.instructions) {
    tags['SpecialInstructions'] = metadata.instructions;
    tags['XMP-photoshop:Instructions'] = metadata.instructions;
  }
  
  // Caption Writer
  if (metadata.captionWriter) {
    tags['Writer-Editor'] = metadata.captionWriter;
    tags['XMP-photoshop:CaptionWriter'] = metadata.captionWriter;
  }
  
  // Category (deprecated but still used)
  if (metadata.category) {
    tags['Category'] = metadata.category;
  }
  if (metadata.supplementalCategories && metadata.supplementalCategories.length > 0) {
    tags['SupplementalCategories'] = metadata.supplementalCategories;
  }
  
  // =========================
  // RELEASES (IPTC Extension)
  // =========================
  
  if (metadata.releases?.model) {
    const modelRelease = metadata.releases.model;
    // Model Release Status: None, Not Applicable, Unlimited Model Releases, Limited or Incomplete Model Releases
    const statusMap: Record<string, string> = {
      'released': 'Unlimited Model Releases',
      'not-released': 'None',
      'not-applicable': 'Not Applicable',
      'unknown': 'None',
    };
    tags['XMP-plus:ModelReleaseStatus'] = statusMap[modelRelease.status] || 'None';
    
    if (modelRelease.releaseId) {
      tags['XMP-plus:ModelReleaseID'] = modelRelease.releaseId;
    }
  }
  
  if (metadata.releases?.property) {
    const propRelease = metadata.releases.property;
    const statusMap: Record<string, string> = {
      'released': 'Unlimited Property Releases',
      'not-released': 'None',
      'not-applicable': 'Not Applicable',
      'unknown': 'None',
    };
    tags['XMP-plus:PropertyReleaseStatus'] = statusMap[propRelease.status] || 'None';
    
    if (propRelease.releaseId) {
      tags['XMP-plus:PropertyReleaseID'] = propRelease.releaseId;
    }
  }
  
  // =========================
  // SCENE METADATA
  // =========================
  
  if (metadata.scene?.peopleCount !== undefined) {
    tags['XMP-iptcExt:PersonInImage'] = `${metadata.scene.peopleCount} people`;
  }
  
  if (metadata.scene?.sceneType) {
    tags['XMP-iptcCore:Scene'] = metadata.scene.sceneType;
  }
  
  // =========================
  // ASSET IDENTITY (XMP Media Management)
  // =========================
  
  if (metadata.documentId) {
    tags['XMP-xmpMM:DocumentID'] = metadata.documentId;
  }
  
  if (metadata.instanceId) {
    tags['XMP-xmpMM:InstanceID'] = metadata.instanceId;
  }
  
  if (metadata.originalDocumentId) {
    tags['XMP-xmpMM:OriginalDocumentID'] = metadata.originalDocumentId;
  }
  
  // =========================
  // CONTEXTEMBED AUDIT (Custom XMP Namespace)
  // We use UserComment for basic data and custom fields for the rest
  // =========================
  
  if (metadata.audit) {
    const auditData: Record<string, string> = {};
    
    if (metadata.audit.ceVersion) auditData.version = metadata.audit.ceVersion;
    if (metadata.audit.embeddedAt) auditData.embeddedAt = metadata.audit.embeddedAt;
    if (metadata.audit.sourceHash) auditData.sourceHash = metadata.audit.sourceHash;
    if (metadata.audit.verificationHash) auditData.verificationHash = metadata.audit.verificationHash;
    if (metadata.audit.hashAlgorithm) auditData.hashAlg = metadata.audit.hashAlgorithm;
    if (metadata.audit.processingPipeline) auditData.pipeline = metadata.audit.processingPipeline;
    
    // Store as JSON in UserComment for maximum compatibility
    if (Object.keys(auditData).length > 0) {
      tags['UserComment'] = `ContextEmbed:${JSON.stringify(auditData)}`;
    }
    
    // Also write individual XMP fields for the most important audit data
    if (metadata.audit.embeddedAt) {
      tags['XMP-xmp:ModifyDate'] = metadata.audit.embeddedAt;
    }
  }
  
  // =========================
  // ENTITY LINKING (Custom fields via UserComment supplement)
  // =========================
  
  if (metadata.entities) {
    const entityData: Record<string, unknown> = {};
    
    if (metadata.entities.brand) entityData.brand = metadata.entities.brand;
    if (metadata.entities.creator) entityData.creatorEntity = metadata.entities.creator;
    if (metadata.entities.shootId) entityData.shootId = metadata.entities.shootId;
    if (metadata.entities.galleryId) entityData.galleryId = metadata.entities.galleryId;
    // Note: clientId is internal only, don't embed
    
    if (Object.keys(entityData).length > 0) {
      // Append to existing UserComment if audit data exists
      const existingComment = tags['UserComment'] as string || '';
      if (existingComment) {
        // Parse and merge
        const auditMatch = existingComment.match(/^ContextEmbed:(.+)$/);
        if (auditMatch) {
          const auditJson = JSON.parse(auditMatch[1]);
          auditJson.entities = entityData;
          tags['UserComment'] = `ContextEmbed:${JSON.stringify(auditJson)}`;
        }
      } else {
        tags['UserComment'] = `ContextEmbed:${JSON.stringify({ entities: entityData })}`;
      }
    }
  }
  
  // =========================
  // TAXONOMY (Stored in supplemental categories and custom XMP)
  // =========================
  
  if (metadata.taxonomy?.categories && metadata.taxonomy.categories.length > 0) {
    // Add to supplemental categories
    const existing = (tags['SupplementalCategories'] as string[]) || [];
    tags['SupplementalCategories'] = [...existing, ...metadata.taxonomy.categories];
  }
  
  // =========================
  // EVENT ANCHOR (Enterprise feature for coherent galleries/case studies)
  // This is THE thing that makes ContextEmbed enterprise-grade
  // =========================
  
  if (metadata.eventAnchor) {
    const eventData: Record<string, unknown> = {
      eventId: metadata.eventAnchor.eventId,
    };
    if (metadata.eventAnchor.eventName) eventData.eventName = metadata.eventAnchor.eventName;
    if (metadata.eventAnchor.eventDate) eventData.eventDate = metadata.eventAnchor.eventDate;
    if (metadata.eventAnchor.storySequence) eventData.storySequence = metadata.eventAnchor.storySequence;
    if (metadata.eventAnchor.galleryId) eventData.galleryId = metadata.eventAnchor.galleryId;
    if (metadata.eventAnchor.galleryName) eventData.galleryName = metadata.eventAnchor.galleryName;
    
    // Store in UserComment JSON
    const existingComment = tags['UserComment'] as string || '';
    if (existingComment && existingComment.startsWith('ContextEmbed:')) {
      try {
        const ceData = JSON.parse(existingComment.replace('ContextEmbed:', ''));
        ceData.eventAnchor = eventData;
        tags['UserComment'] = `ContextEmbed:${JSON.stringify(ceData)}`;
      } catch {
        tags['UserComment'] = `ContextEmbed:${JSON.stringify({ eventAnchor: eventData })}`;
      }
    } else {
      tags['UserComment'] = `ContextEmbed:${JSON.stringify({ eventAnchor: eventData })}`;
    }
    
    // Also write eventId to TransmissionReference for DAM compatibility
    // This is IPTC Core and widely supported
    tags['TransmissionReference'] = metadata.eventAnchor.eventId;
    tags['XMP-photoshop:TransmissionReference'] = metadata.eventAnchor.eventId;
    
    // Store sequence in supplementary category for sorting
    if (metadata.eventAnchor.storySequence) {
      tags['XMP-iptcExt:SeriesName'] = metadata.eventAnchor.eventName || metadata.eventAnchor.eventId;
      // Store sequence number as formatted string for sortability
      const seqStr = String(metadata.eventAnchor.storySequence).padStart(4, '0');
      tags['XMP-iptcExt:Episode'] = `${seqStr}`;
    }
  }
  
  // =========================
  // INTENT & NARRATIVE (The "Why" - critical for AI-safe meaning)
  // =========================
  
  if (metadata.intent || metadata.userContext) {
    const intentData: Record<string, unknown> = {};
    
    if (metadata.intent) {
      intentData.purpose = metadata.intent.purpose;
      intentData.momentType = metadata.intent.momentType;
      intentData.emotionalTone = metadata.intent.emotionalTone;
      if (metadata.intent.storyPosition) intentData.storyPosition = metadata.intent.storyPosition;
      if (metadata.intent.narrativeRole) intentData.narrativeRole = metadata.intent.narrativeRole;
    }
    
    if (metadata.userContext) {
      intentData.userContext = metadata.userContext;
    }
    
    // Merge into UserComment JSON
    const existingComment = tags['UserComment'] as string || '';
    if (existingComment && existingComment.startsWith('ContextEmbed:')) {
      try {
        const ceData = JSON.parse(existingComment.replace('ContextEmbed:', ''));
        ceData.intent = intentData;
        tags['UserComment'] = `ContextEmbed:${JSON.stringify(ceData)}`;
      } catch {
        // If parse fails, append intent separately
        tags['UserComment'] = `ContextEmbed:${JSON.stringify({ intent: intentData })}`;
      }
    } else {
      tags['UserComment'] = `ContextEmbed:${JSON.stringify({ intent: intentData })}`;
    }
    
    // Also write narrativeRole to special instructions for DAM compatibility
    if (metadata.intent?.narrativeRole) {
      tags['SpecialInstructions'] = tags['SpecialInstructions'] 
        ? `${tags['SpecialInstructions']} | Narrative: ${metadata.intent.narrativeRole}`
        : `Narrative: ${metadata.intent.narrativeRole}`;
    }
  }
  
  return tags;
}

/**
 * Map ExifTool tags to internal metadata format
 */
export function mapExifToolToMetadata(tags: Tags): Partial<SynthesizedMetadata> {
  const metadata: Partial<SynthesizedMetadata> = {};
  const t = tags as Record<string, unknown>;
  
  // Headline
  metadata.headline = (t['Headline'] || t['XMP-photoshop:Headline']) as string;
  
  // Description
  metadata.description = (t['Caption-Abstract'] || t['ImageDescription'] || t['XMP-dc:Description']) as string;
  
  // Keywords
  const keywords = t['Keywords'] || t['XMP-dc:Subject'];
  if (keywords) {
    metadata.keywords = Array.isArray(keywords) ? keywords : [keywords as string];
  }
  
  // Title
  metadata.title = (t['ObjectName'] || t['XMP-dc:Title']) as string;
  
  // Alt text
  metadata.altTextShort = t['XMP-iptcExt:AltTextAccessibility'] as string;
  metadata.altTextLong = t['XMP-iptcExt:ExtDescrAccessibility'] as string;
  
  // Language
  metadata.language = t['XMP-dc:Language'] as string;
  
  // Creator
  metadata.creator = (t['By-line'] || t['Artist'] || t['XMP-dc:Creator']) as string;
  
  // Copyright
  metadata.copyright = (t['CopyrightNotice'] || t['Copyright'] || t['XMP-dc:Rights']) as string;
  
  // Credit
  metadata.credit = (t['Credit'] || t['XMP-photoshop:Credit']) as string;
  
  // Source
  metadata.source = (t['Source'] || t['XMP-photoshop:Source'] || t['XMP-dc:Source']) as string;
  
  // Usage Terms
  metadata.usageTerms = t['XMP-xmpRights:UsageTerms'] as string;
  metadata.webStatement = t['XMP-xmpRights:WebStatement'] as string;
  
  // Location
  metadata.sublocation = (t['Sub-location'] || t['XMP-iptcCore:Location']) as string;
  metadata.city = (t['City'] || t['XMP-photoshop:City']) as string;
  metadata.state = (t['Province-State'] || t['XMP-photoshop:State']) as string;
  metadata.country = (t['Country-PrimaryLocationName'] || t['XMP-photoshop:Country']) as string;
  metadata.countryCode = (t['Country-PrimaryLocationCode'] || t['XMP-iptcCore:CountryCode']) as string;
  
  // Instructions
  metadata.instructions = (t['SpecialInstructions'] || t['XMP-photoshop:Instructions']) as string;
  metadata.captionWriter = (t['Writer-Editor'] || t['XMP-photoshop:CaptionWriter']) as string;
  
  // Document IDs
  metadata.documentId = t['XMP-xmpMM:DocumentID'] as string;
  metadata.instanceId = t['XMP-xmpMM:InstanceID'] as string;
  
  // Parse ContextEmbed audit data from UserComment
  const userComment = t['UserComment'] as string;
  if (userComment?.startsWith('ContextEmbed:')) {
    try {
      const data = JSON.parse(userComment.replace('ContextEmbed:', ''));
      if (data.version || data.embeddedAt || data.sourceHash) {
        metadata.audit = {
          ceVersion: data.version,
          embeddedAt: data.embeddedAt,
          sourceHash: data.sourceHash,
          verificationHash: data.verificationHash,
          hashAlgorithm: data.hashAlg,
        };
      }
      if (data.entities) {
        metadata.entities = data.entities;
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  // Clean up undefined values
  return Object.fromEntries(
    Object.entries(metadata).filter(([_, v]) => v !== undefined && v !== null)
  ) as Partial<SynthesizedMetadata>;
}

/**
 * Check if a tag value is considered empty
 */
export function isEmptyTagValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}
