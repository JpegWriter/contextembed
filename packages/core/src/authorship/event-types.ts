// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * CE Event Types — Governance-relevant events recorded in the audit trail.
 * Only governance-significant actions, not every UI click.
 */

export enum CeEventType {
  // Ingest events
  IMAGE_INGESTED = 'image_ingested',
  AUTHORSHIP_CLASSIFIED = 'authorship_classified',
  
  // User declaration events
  USER_DECLARATION_PROMPTED = 'user_declaration_prompted',
  USER_DECLARATION_SET = 'user_declaration_set',
  
  // Metadata embedding events
  METADATA_EMBED_REQUESTED = 'metadata_embed_requested',
  METADATA_EMBED_COMPLETED = 'metadata_embed_completed',
  
  // Export events
  EXPORT_VALIDATED = 'export_validated',
  EXPORT_BLOCKED = 'export_blocked',
  EXPORT_COMPLETED = 'export_completed',
  
  // Content generation events
  CASE_STUDY_GENERATED = 'case_study_generated',
  
  // Publishing events
  WP_PUBLISH_ATTEMPTED = 'wp_publish_attempted',
  WP_PUBLISH_SUCCEEDED = 'wp_publish_succeeded',
  WP_PUBLISH_FAILED = 'wp_publish_failed',
}

export const CE_EVENT_LABELS: Record<CeEventType, string> = {
  [CeEventType.IMAGE_INGESTED]: 'Image ingested',
  [CeEventType.AUTHORSHIP_CLASSIFIED]: 'Authorship classified',
  [CeEventType.USER_DECLARATION_PROMPTED]: 'User declaration prompted',
  [CeEventType.USER_DECLARATION_SET]: 'User declaration set',
  [CeEventType.METADATA_EMBED_REQUESTED]: 'Metadata embed requested',
  [CeEventType.METADATA_EMBED_COMPLETED]: 'Metadata embed completed',
  [CeEventType.EXPORT_VALIDATED]: 'Export validated',
  [CeEventType.EXPORT_BLOCKED]: 'Export blocked',
  [CeEventType.EXPORT_COMPLETED]: 'Export completed',
  [CeEventType.CASE_STUDY_GENERATED]: 'Case study generated',
  [CeEventType.WP_PUBLISH_ATTEMPTED]: 'WordPress publish attempted',
  [CeEventType.WP_PUBLISH_SUCCEEDED]: 'WordPress publish succeeded',
  [CeEventType.WP_PUBLISH_FAILED]: 'WordPress publish failed',
};
