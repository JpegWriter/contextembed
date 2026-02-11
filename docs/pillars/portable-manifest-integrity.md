# Pillar 4: Portable Manifest Integrity

## Definition

Portable Manifest Integrity ensures that even when platforms strip embedded XMP metadata, there's an authoritative JSON manifest that can restore all metadata. The manifest is checksummed and includes the complete contract snapshot per asset.

This solves the "platform stripping" problem: Instagram, Facebook, and many CMSes strip XMP on upload. The manifest survives as a sidecar file.

---

## Implementation Locations

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Manifest Generator | `packages/metadata/src/manifest-generator.ts` | Main generation logic |
| Manifest Types | `packages/metadata/src/manifest-generator.ts` L28-100 | TypeScript interfaces |
| Health Scoring | `packages/metadata/src/manifest-generator.ts` L150-250 | Calculates embed quality |
| Checksum Utilities | `packages/metadata/src/manifest-generator.ts` L100-120 | SHA-256 functions |
| Export Integration | `apps/api/src/routes/exports.ts` | Generates manifest in export ZIP |

---

## Manifest Structure

```json
{
  "manifestVersion": "2.1",
  "generatedAt": "2026-02-11T10:30:00.000Z",
  "generatedBy": "ContextEmbed",
  "exportId": "exp_abc123",
  "projectId": "proj_xyz789",
  "businessName": "Sarah Mitchell Photography",
  "businessWebsite": "https://sarahmitchell.com",
  "totalAssets": 25,
  "embedTierSummary": {
    "authority": 20,
    "evidence": 5,
    "basic": 0,
    "incomplete": 0
  },
  "assets": [...],
  "manifestChecksum": "sha256:abc123..."
}
```

---

## Per-Asset Fields

| Field | Type | Purpose |
|-------|------|---------|
| `fileName` | string | Export filename |
| `originalFileName` | string | Original upload name |
| `assetId` | string | UUID for linkage |
| `checksum` | string | SHA-256 of file |
| `checksumAlgorithm` | string | Always "sha256" |
| `embedTier` | enum | AUTHORITY/EVIDENCE/BASIC/INCOMPLETE |
| `embeddedAt` | string | ISO timestamp |
| `metadataVersion` | string | Contract version |
| `iptc` | object | Full IPTC contract snapshot |
| `xmpContextEmbed` | object | Full custom XMP snapshot |
| `governanceAttestation` | object | Governance decision (v2.2) |
| `healthScore` | number | 0-100 quality score |
| `healthStatus` | enum | EVIDENCE_EMBEDDED/PARTIALLY_EMBEDDED/NOT_EMBEDDED |
| `missingFields` | array | List of missing required fields |
| `warnings` | array | Quality warnings |

---

## Database Tables

| Table | Field | Purpose |
|-------|-------|---------|
| `exports` | `outputPath` | Path to ZIP containing manifest |
| `export_assets` | `exportId`, `assetId` | Links exports to assets |
| `metadata_results` | `result` | Source for manifest contract |

---

## Export Behavior

1. **Per-file processing**: Each asset's contract extracted
2. **Checksum calculation**: SHA-256 of embedded file
3. **Health scoring**: `calculateHealthReport()` runs
4. **Governance extraction**: `normalizeGovernanceForManifest()`
5. **Manifest assembly**: All assets + summary stats
6. **Manifest checksum**: SHA-256 of manifest JSON (minus the checksum field)
7. **File write**: `manifest.json` added to export folder/ZIP

---

## Embed Tiers

| Tier | Criteria |
|------|----------|
| `AUTHORITY` | All required + evidence + IA hooks (targetPage, pageRole) |
| `EVIDENCE` | All required + evidence fields (businessName, jobType, serviceCategory, assetId) |
| `BASIC` | Core IPTC present (title, caption, creator, copyright, keywords) |
| `INCOMPLETE` | Missing required fields |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Manifest lost | MEDIUM | Should be uploaded with images to DAM |
| Checksum mismatch | LOW | Warning logged on read |
| Re-embed from manifest | NOT IMPL | Planned: restore from manifest |
| Large manifest size | LOW | Reasonable for <1000 assets |

---

## Maturity Level

**✅ REAL**

- Complete manifest generation
- Per-asset checksums
- Health scoring
- Governance attestation included (v2.2)
- Manifest checksum for integrity
- Audit script validates structure
