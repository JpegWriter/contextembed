# Pillar 1: Proof-First Metadata

## Definition

Proof-First Metadata means embedding evidence of real business work into image files before any AI-generated descriptions are added. The business identity, job context, and geographic focus are captured first, making the metadata defensible as documentation of actual work performed.

This inverts the typical workflow where AI captions are added first (easily dismissed as generated), then business context is bolted on later.

---

## Implementation Locations

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Contract Types | `packages/metadata/src/iptc-contract.ts` | Defines required proof fields |
| XMP Namespace | `packages/metadata/src/authoritative-writer.ts` L60-140 | Custom namespace `contextembed` |
| Tag Builder | `packages/metadata/src/authoritative-writer.ts` L380-520 | Writes proof fields to file |
| Manifest Generator | `packages/metadata/src/manifest-generator.ts` | Includes proof fields in portable manifest |
| Contract Converter | `packages/metadata/src/authoritative-writer.ts` L685-820 | `toMetadataContract()` function |
| Validation | `packages/metadata/src/metadata-validator.ts` | Enforces required fields before write |

---

## Metadata Fields

### Required Proof Fields

| XMP Field | Purpose | Source |
|-----------|---------|--------|
| `XMP-contextembed:BusinessName` | Studio/brand identity | `user_profiles.businessName` or `onboarding_profiles.confirmedContext` |
| `XMP-contextembed:JobType` | Work classification | User selection: `service-proof`, `case-study`, `portfolio`, `testimonial`, `before-after` |
| `XMP-contextembed:ServiceCategory` | Service vertical | Session type: Wedding, Newborn, Corporate, etc. |
| `XMP-contextembed:AssetId` | Unique identifier | Auto-generated UUID per asset |

### Optional Evidence Fields

| XMP Field | Purpose |
|-----------|---------|
| `XMP-contextembed:BusinessWebsite` | Verifiable business URL |
| `XMP-contextembed:CreatorRole` | Role declaration (e.g., "Founder / Photographer") |
| `XMP-contextembed:ContextLine` | User-provided one-liner about the job |
| `XMP-contextembed:OutcomeProof` | Statement like "gallery delivered" |
| `XMP-contextembed:GeoFocus` | Location summary (e.g., "Austin, TX") |

### Linkage Fields

| XMP Field | Purpose |
|-----------|---------|
| `XMP-contextembed:ExportId` | Batch identifier |
| `XMP-contextembed:ManifestRef` | Pointer to manifest.json |
| `XMP-contextembed:Checksum` | SHA-256 of original file |

---

## Database Tables

| Table | Fields | Purpose |
|-------|--------|---------|
| `user_profiles` | `businessName`, `creatorName`, `businessWebsite` | User-level identity |
| `onboarding_profiles` | `confirmedContext` (JSON) | Project-level business context |
| `metadata_results` | `result` (JSON) | Synthesized metadata contract |
| `embed_results` | `status`, `embeddedPath` | Verification of successful embed |

---

## Export Behavior

1. **Pre-export validation**: `isExportReady()` checks required proof fields
2. **Contract assembly**: `toMetadataContract()` builds from DB + onboarding
3. **Tag writing**: `buildExifToolTags()` writes to XMP namespace
4. **Verification**: `verifyMetadataWrite()` confirms fields persisted
5. **Manifest inclusion**: All proof fields copied to `manifest.json` per asset

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| User skips onboarding | LOW | Falls back to `user_profiles` defaults |
| Empty businessName | LOW | Falls back to `creatorName` |
| ExifTool write failure | LOW | Logged, asset marked as embed failed |
| Platform strips XMP | MEDIUM | Manifest serves as portable truth |

---

## Maturity Level

**✅ REAL**

- All required fields defined and enforced
- Complete write pipeline implemented
- Manifest backup for stripped metadata
- Audit script validates presence
