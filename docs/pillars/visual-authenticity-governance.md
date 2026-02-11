# Pillar 2: Visual Authenticity Governance

## Definition

Visual Authenticity Governance is a policy engine that controls which images can be exported based on AI detection results and user-configured policies. It prevents AI-generated content from being labeled as "service-proof" when a strict policy is set.

The governance decision is now portable: embedded in exported files (XMP) and manifest.json, allowing third parties to verify the attestation.

---

## Implementation Locations

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Policy Enum | `packages/db/prisma/schema.prisma` L282-286 | `VisualAuthenticityPolicy` enum |
| Project Settings | `packages/db/prisma/schema.prisma` L254-255 | `visualAuthenticityPolicy` field |
| Startup Mode Lock | `packages/db/src/repositories.ts` L158-165 | Prevents policy changes after first export |
| Governance Evaluation | `apps/api/src/routes/growth.ts` L100-130 | AI detection + policy enforcement |
| Decision Audit Log | `packages/db/prisma/schema.prisma` L797 | `decisionLog` JSON field |
| Governance Types | `packages/metadata/src/iptc-contract.ts` L37-77 | `GovernanceAttestation` type |
| XMP Writing | `packages/metadata/src/authoritative-writer.ts` L514-550 | Governance tags in buildExifToolTags |
| Manifest Inclusion | `packages/metadata/src/manifest-generator.ts` L116-140 | `governanceAttestation` per asset |
| Export Population | `apps/api/src/routes/exports.ts` L755-768 | Derives governance from project policy |

---

## Metadata Fields

### XMP Governance Tags (v2.2)

| XMP Field | Type | Values |
|-----------|------|--------|
| `XMP-contextembed:AIGenerated` | string | `true`, `false`, `unknown` |
| `XMP-contextembed:AIConfidence` | string | `0.00` to `1.00` |
| `XMP-contextembed:GovernanceStatus` | string | `approved`, `blocked`, `warning`, `pending` |
| `XMP-contextembed:GovernancePolicy` | string | `deny_ai_proof`, `conditional`, `allow` |
| `XMP-contextembed:GovernanceReason` | string | Human-readable reason (max 280 chars) |
| `XMP-contextembed:GovernanceCheckedAt` | string | ISO 8601 timestamp |
| `XMP-contextembed:GovernanceDecisionRef` | string | Export/audit reference (max 80 chars) |

---

## Database Tables

| Table | Field | Purpose |
|-------|-------|---------|
| `projects` | `visualAuthenticityPolicy` | Policy setting per project |
| `projects` | `startupModeEnabled` | Lock flag (prevents policy change) |
| `growth_images` | `aiGenerated` | Boolean detection result |
| `growth_images` | `aiConfidence` | Float 0-1 confidence |
| `growth_images` | `governanceStatus` | Enum: pending/approved/blocked/warning |
| `growth_images` | `governanceReason` | Human-readable reason |
| `growth_images` | `decisionLog` | Full audit trail (JSON array) |

---

## Policy Types

| Policy | Behavior |
|--------|----------|
| `deny_ai_proof` | Block AI content from `service-proof` role |
| `conditional` | AI content allowed with review/warning |
| `allow` | No restrictions on AI content |

---

## Export Behavior

1. **Policy lookup**: Read `project.visualAuthenticityPolicy`
2. **Attestation assembly**: Create `governanceAttestation` object
3. **XMP writing**: 7 governance tags written to file
4. **Manifest inclusion**: `governanceAttestation` block per asset
5. **Backwards compatibility**: Missing governance = null (legacy exports pass)

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI detection false positive | MEDIUM | Manual override in UI |
| Policy bypassed via API | LOW | Governance checked at export time |
| Legacy exports lack governance | LOW | Null attestation is valid |
| Startup mode not locked | LOW | Auto-locks on first export |

---

## Maturity Level

**✅ REAL (v2.2)**

- Policy engine fully implemented
- Database tracking complete
- XMP governance tags written to exports
- Manifest includes attestation per asset
- Audit script verifies presence
