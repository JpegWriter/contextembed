// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * Audit Logger — Records governance-significant events in Supabase.
 * 
 * Rules:
 * - Event log is APPEND-ONLY (no updates, no deletes)
 * - Details JSONB must remain SMALL and STRUCTURED
 * - NEVER store full EXIF/IPTC dumps
 * - Store evidence as reason codes + extracted key fields ONLY
 */

import { CeEventType } from './event-types';
import { AuthorshipStatus, AuthorshipEvidence } from './types';

/**
 * Event log entry — what gets written to ce_event_log
 */
export interface AuditEvent {
  userId: string;
  projectId?: string;
  imageId?: string;
  exportId?: string;
  eventType: CeEventType;
  details: Record<string, unknown>;
}

/**
 * Image state — what gets upserted to ce_images
 */
export interface ImageStateInput {
  id?: string;
  userId: string;
  projectId?: string;
  assetId?: string;
  sha256: string;
  sourceType?: string;
  authorshipStatus: AuthorshipStatus;
  authorshipEvidence: AuthorshipEvidence;
  userDeclared: boolean;
  syntheticConfidence?: number;
}

/**
 * Export record — what gets created in ce_exports
 */
export interface ExportRecordInput {
  userId: string;
  projectId?: string;
  exportType: string;
  payloadHash?: string;
}

/**
 * Export status update
 */
export interface ExportStatusUpdate {
  exportId: string;
  status: 'started' | 'validated' | 'blocked' | 'completed' | 'failed';
  reasonCodes?: string[];
  resultRefs?: Record<string, unknown>;
}

/**
 * Abstract audit logger interface.
 * Implemented by the DB layer (packages/db) using Prisma.
 * The core package defines the contract; the API wires the implementation.
 */
export interface IAuditLogger {
  /** Append an event to the audit trail (never update) */
  logEvent(event: AuditEvent): Promise<void>;
  
  /** Create or update the image state record */
  upsertImageState(input: ImageStateInput): Promise<string>;
  
  /** Create a new export record */
  createExportRecord(input: ExportRecordInput): Promise<string>;
  
  /** Update export status */
  updateExportStatus(update: ExportStatusUpdate): Promise<void>;
  
  /** Get audit trail for an image */
  getImageAuditTrail(imageId: string): Promise<AuditEvent[]>;
  
  /** Get audit trail for a project */
  getProjectAuditTrail(projectId: string, limit?: number): Promise<AuditEvent[]>;
}

export { AuditEvent as CeAuditEvent };
