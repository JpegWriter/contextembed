// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * Prisma-backed Audit Logger implementation.
 * Wires the IAuditLogger interface from @contextembed/core
 * to the Prisma repositories in @contextembed/db.
 */

import {
  ceImageRepository,
  ceExportRepository,
  ceEventLogRepository,
} from '@contextembed/db';
import type {
  IAuditLogger,
  AuditEvent,
  ImageStateInput,
  ExportRecordInput,
  ExportStatusUpdate,
} from '@contextembed/core';

export class PrismaAuditLogger implements IAuditLogger {
  /**
   * Append an event to the audit trail.
   * APPEND-ONLY — never update, never delete.
   */
  async logEvent(event: AuditEvent): Promise<void> {
    await ceEventLogRepository.create({
      userId: event.userId,
      projectId: event.projectId,
      imageId: event.imageId,
      exportId: event.exportId,
      eventType: event.eventType,
      details: event.details,
    });
  }

  /**
   * Create or update the CE image state record.
   * Returns the ceImage.id.
   */
  async upsertImageState(input: ImageStateInput): Promise<string> {
    if (!input.assetId) {
      throw new Error('assetId is required to upsert image state');
    }

    const ceImage = await ceImageRepository.upsertByAssetId({
      assetId: input.assetId,
      userId: input.userId,
      projectId: input.projectId,
      sha256: input.sha256,
      sourceType: input.sourceType || 'upload',
      authorshipStatus: input.authorshipStatus,
      authorshipEvidence: input.authorshipEvidence,
      userDeclared: input.userDeclared,
      syntheticConfidence: input.syntheticConfidence,
      classifiedBy: 'system',
    });

    return ceImage.id;
  }

  /**
   * Create a new export record. Returns the ceExport.id.
   */
  async createExportRecord(input: ExportRecordInput): Promise<string> {
    const ceExport = await ceExportRepository.create({
      userId: input.userId,
      projectId: input.projectId,
      exportType: input.exportType,
      payloadHash: input.payloadHash,
    });

    return ceExport.id;
  }

  /**
   * Update export status with reason codes and result references.
   */
  async updateExportStatus(update: ExportStatusUpdate): Promise<void> {
    await ceExportRepository.updateStatus(update.exportId, {
      status: update.status,
      reasonCodes: update.reasonCodes,
      resultRefs: update.resultRefs,
    });
  }

  /**
   * Get audit trail for an image.
   */
  async getImageAuditTrail(imageId: string): Promise<AuditEvent[]> {
    const events = await ceEventLogRepository.findByImage(imageId);
    return events.map(e => ({
      userId: e.userId,
      projectId: e.projectId || undefined,
      imageId: e.imageId || undefined,
      exportId: e.exportId || undefined,
      eventType: e.eventType as any,
      details: (e.details as Record<string, unknown>) || {},
    }));
  }

  /**
   * Get audit trail for a project.
   */
  async getProjectAuditTrail(projectId: string, limit = 100): Promise<AuditEvent[]> {
    const events = await ceEventLogRepository.findByProject(projectId, limit);
    return events.map(e => ({
      userId: e.userId,
      projectId: e.projectId || undefined,
      imageId: e.imageId || undefined,
      exportId: e.exportId || undefined,
      eventType: e.eventType as any,
      details: (e.details as Record<string, unknown>) || {},
    }));
  }
}
