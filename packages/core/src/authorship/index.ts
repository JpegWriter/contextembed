// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * Authorship Integrity Engine
 * 
 * The system of record for authorship claims.
 * ContextEmbed does not invent authorship.
 * It does not optimise for performance.
 * It does not guess.
 * 
 * It only:
 * - records what can be proven
 * - records what is explicitly declared
 * - marks uncertainty clearly
 * - blocks false claims
 * 
 * If authorship cannot be justified, it must be downgraded — never upgraded.
 */

export { AuthorshipStatus, AuthorshipEvidence, ClassificationResult, ImageSignals } from './types';
export { ReasonCode, REASON_CODE_LABELS } from './reason-codes';
export { CeEventType, CE_EVENT_LABELS } from './event-types';
export { AuthorshipClassifier } from './classifier';
export { LanguageGovernor } from './language-governor';
export { ExportGuard, ExportValidationResult, ExportPayload } from './export-guard';
export { MetadataEmbeddingRules, AuthorshipXmpBlock } from './metadata-rules';
export { IAuditLogger, AuditEvent, ImageStateInput, ExportRecordInput, ExportStatusUpdate } from './audit-logger';
