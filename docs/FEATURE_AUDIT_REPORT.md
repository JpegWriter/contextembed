# ContextEmbed™ Unique Feature Audit Report
## Audit Date: February 11, 2026 (Updated after v2.2 patch)

---

# Audit Summary

| Feature | Verdict | Implementation | Metadata Written | Risk |
|---------|---------|----------------|------------------|------|
| **Proof-First Metadata™** | ✅ **REAL** | Full | 12+ XMP fields | LOW |
| **Visual Authenticity Governance** | ✅ **REAL** | Full (v2.2) | 7 XMP fields + manifest | LOW |
| **AEO-Ready Metadata** | ⚠️ **PARTIAL** | Intent fields | Limited | MEDIUM |

---

# Feature 1: Proof-First Metadata™

## Verdict: ✅ REAL

The Proof-First Metadata feature is **fully implemented** with complete code paths from data capture through metadata embedding and manifest generation.

### Code Locations

| Component | File | Lines |
|-----------|------|-------|
| Contract Definition | [packages/metadata/src/iptc-contract.ts](packages/metadata/src/iptc-contract.ts) | 40-120 |
| XMP Namespace Config | [packages/metadata/src/authoritative-writer.ts](packages/metadata/src/authoritative-writer.ts) | 60-120 |
| Tag Builder | [packages/metadata/src/authoritative-writer.ts](packages/metadata/src/authoritative-writer.ts) | 380-470 |
| Manifest Generator | [packages/metadata/src/manifest-generator.ts](packages/metadata/src/manifest-generator.ts) | 1-250 |
| Health Scoring | [packages/metadata/src/manifest-generator.ts](packages/metadata/src/manifest-generator.ts) | 100-200 |
| Audit Script | [scripts/audit-embed.ts](scripts/audit-embed.ts) | 170-290 |

### Metadata Fields Written

| XMP Field | Contract Required | Written to File |
|-----------|-------------------|-----------------|
| `XMP-contextembed:BusinessName` | ✅ Required | ✅ YES |
| `XMP-contextembed:BusinessWebsite` | Optional | ✅ YES |
| `XMP-contextembed:CreatorRole` | Optional | ✅ YES |
| `XMP-contextembed:JobType` | ✅ Required | ✅ YES |
| `XMP-contextembed:ServiceCategory` | ✅ Required | ✅ YES |
| `XMP-contextembed:ContextLine` | Optional | ✅ YES |
| `XMP-contextembed:OutcomeProof` | Optional | ✅ YES |
| `XMP-contextembed:GeoFocus` | Optional | ✅ YES (auto-gen) |
| `XMP-contextembed:AssetId` | ✅ Required | ✅ YES |
| `XMP-contextembed:ExportId` | Optional | ✅ YES |
| `XMP-contextembed:ManifestRef` | Optional | ✅ YES |
| `XMP-contextembed:Checksum` | Optional | ✅ YES |
| `XMP-contextembed:TargetPage` | Optional | ✅ YES |
| `XMP-contextembed:PageRole` | Optional | ✅ YES |
| `XMP-contextembed:ClusterId` | Optional | ✅ YES |
| `XMP-contextembed:EmbedTier` | Calculated | ✅ YES |
| `XMP-contextembed:EmbeddedBy` | Auto | ✅ YES |
| `XMP-contextembed:EmbeddingMethod` | Auto | ✅ YES |
| `XMP-contextembed:PipelineVersion` | Auto | ✅ YES |
| `XMP-contextembed:MetadataVersion` | Auto | ✅ YES |

### Database Tables

| Table | Purpose | Stores Proof Fields |
|-------|---------|---------------------|
| `user_profiles` | User business context | `businessName`, `creatorName` |
| `onboarding_profiles` | Project business context | `confirmedContext` JSON |
| `metadata_results` | Synthesized metadata | Full contract JSON |
| `embed_results` | Verification records | Success/failure status |

### Export Manifest Evidence

The export manifest contains:
- ✅ SHA-256 checksums per file
- ✅ Health score (0-100)
- ✅ Embed tier classification (AUTHORITY/EVIDENCE/BASIC/INCOMPLETE)
- ✅ Full IPTC + XMP contract snapshot
- ✅ Business context (businessName, businessWebsite)
- ✅ Manifest checksum for integrity

### Bypass Prevention

- ✅ `authoritative-writer.ts` is the ONLY module that writes metadata
- ✅ Contract validation runs before write (`validateMetadataContract`)
- ✅ Verification runs after write (`verifyMetadataWrite`)
- ✅ Required fields enforced in contract schema

### Inspectable Output

**ExifTool verification command**:
```bash
exiftool -XMP-contextembed:all exported_image.jpg
```

Expected output:
```
Business Name                   : Sarah Mitchell Photography
Job Type                        : service-proof
Service Category                : Wedding Photography
Geo Focus                       : Austin, TX
Asset Id                        : asset_abc123
Embed Tier                      : AUTHORITY
Embedded By                     : ContextEmbed.com
```

---

# Feature 2: Visual Authenticity Governance

## Verdict: ✅ REAL (Updated v2.2)

The governance feature is **fully implemented** with policy engine, database tracking, AND **portable proof embedded in exported files and manifest**.

### What IS Implemented ✅

| Component | File | Status |
|-----------|------|--------|
| Policy Enum | [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma#L282-L286) | ✅ Complete |
| Project Settings | [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma#L254-L255) | ✅ Complete |
| Startup Mode Lock | [packages/db/src/repositories.ts](packages/db/src/repositories.ts#L158-L165) | ✅ Complete |
| Governance Evaluation | [apps/api/src/routes/growth.ts](apps/api/src/routes/growth.ts#L100-L130) | ✅ Complete |
| Decision Audit Log | [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma#L797) | ✅ Complete |
| Role Update + Recheck | [apps/api/src/routes/growth.ts](apps/api/src/routes/growth.ts#L75-L170) | ✅ Complete |
| Frontend Policy UI | [apps/web/src/app/dashboard/projects/[projectId]/settings/page.tsx](apps/web/src/app/dashboard/projects/[projectId]/settings/page.tsx) | ✅ Complete |
| **GovernanceAttestation Type** | [packages/metadata/src/iptc-contract.ts](packages/metadata/src/iptc-contract.ts#L37-L77) | ✅ **NEW v2.2** |
| **XMP Governance Tags** | [packages/metadata/src/authoritative-writer.ts](packages/metadata/src/authoritative-writer.ts#L514-L550) | ✅ **NEW v2.2** |
| **Manifest Governance** | [packages/metadata/src/manifest-generator.ts](packages/metadata/src/manifest-generator.ts#L116-L140) | ✅ **NEW v2.2** |

### Database Tables

| Table | Field | Purpose |
|-------|-------|---------|
| `projects` | `visualAuthenticityPolicy` | Policy setting |
| `projects` | `startupModeEnabled` | Lock flag |
| `growth_images` | `aiGenerated` | Detection result |
| `growth_images` | `aiConfidence` | Detection confidence |
| `growth_images` | `governanceStatus` | pending/approved/blocked/warning |
| `growth_images` | `governanceReason` | Human-readable reason |
| `growth_images` | `decisionLog` | Full audit trail (JSON) |

### XMP Fields Written (v2.2)

| XMP Field | Purpose | Written to File |
|-----------|---------|-----------------|
| `XMP-contextembed:AIGenerated` | true/false/unknown | ✅ YES |
| `XMP-contextembed:AIConfidence` | 0.00-1.00 confidence | ✅ YES |
| `XMP-contextembed:GovernanceStatus` | approved/blocked/warning/pending | ✅ YES |
| `XMP-contextembed:GovernancePolicy` | deny_ai_proof/conditional/allow | ✅ YES |
| `XMP-contextembed:GovernanceReason` | Human-readable reason | ✅ YES |
| `XMP-contextembed:GovernanceCheckedAt` | ISO timestamp | ✅ YES |
| `XMP-contextembed:GovernanceDecisionRef` | Export/audit reference | ✅ YES |

### Manifest Governance Attestation (v2.2)

```json
{
  "governanceAttestation": {
    "aiGenerated": false,
    "aiConfidence": null,
    "status": "approved",
    "policy": "conditional",
    "reason": "Export approved under conditional policy",
    "checkedAt": "2026-02-11T10:30:00.000Z",
    "decisionRef": "export-adv-1707650000000"
  }
}
```

### Inspectable Output

**ExifTool verification command**:
```bash
exiftool -XMP-contextembed:AIGenerated \
         -XMP-contextembed:GovernanceStatus \
         -XMP-contextembed:GovernancePolicy \
         -XMP-contextembed:GovernanceCheckedAt \
         exported_image.jpg
```

Expected output:
```
AI Generated                    : false
Governance Status               : approved
Governance Policy               : conditional
Governance Checked At           : 2026-02-11T10:30:00.000Z
```

---

# Feature 3: AEO-Ready Metadata (AI-Optimized)

## Verdict: ⚠️ PARTIAL

The feature exists conceptually but implementation is **limited to intent fields** without specific AEO optimization in the synthesis pipeline.

### What IS Implemented ✅

| Component | File | Status |
|-----------|------|--------|
| Intent fields in field-mapper | [packages/metadata/src/field-mapper.ts](packages/metadata/src/field-mapper.ts#L350-L380) | ✅ Written |
| Project goal "seo_aeo" | [packages/core/src/schemas/onboarding.ts](packages/core/src/schemas/onboarding.ts#L7) | ✅ Exists |
| narrativeRole in UserComment | [packages/metadata/src/field-mapper.ts](packages/metadata/src/field-mapper.ts#L378-L382) | ✅ Written |

### Metadata Fields Written

| Field | Location | Purpose |
|-------|----------|---------|
| `intent.purpose` | UserComment JSON | portfolio/commercial/editorial |
| `intent.narrativeRole` | UserComment JSON + SpecialInstructions | Story context |
| `intent.emotionalTone` | UserComment JSON | Mood for AI context |
| `intent.momentType` | UserComment JSON | Scene classification |

### What is MISSING/WEAK ❌

| Gap | Impact |
|-----|--------|
| **No AEO-specific prompts in GPT synthesis** | Descriptions not optimized for AI citation |
| **No schema.org structured data** | No JSON-LD for AI parsers |
| **No Q&A format metadata** | AI assistants can't easily cite |
| **No "AI-safe" meaning preservation fields** | Intent fields are optional, not enforced |
| **Goal="seo_aeo" doesn't change pipeline** | Same synthesis regardless of goal |

### Risk Assessment

**MEDIUM RISK**: The marketing claim of "AI-optimized metadata specifically for AI search engines" is **aspirational** rather than fully delivered. The intent fields exist, but:

1. There's no evidence the GPT-4 synthesis prompt includes AEO-specific instructions
2. The `seo_aeo` goal enum doesn't trigger different behavior
3. No structured data (schema.org) is generated for AI parsers

### What Would Make It REAL

1. **AEO Prompt Engineering**: Modify synthesis prompt to generate Q&A-style descriptions
2. **schema.org Generation**: Add ImageObject JSON-LD to manifest
3. **Citation-Ready Format**: "This image shows [X] taken by [Y] in [Z]"
4. **AI Intent Signals**: Explicit `XMP-contextembed:AISearchHint` field

---

# Structural Dependencies

## Critical Path

```
UserProfile.businessName
        ↓
OnboardingProfile.confirmedContext
        ↓
MetadataResult.result (synthesized)
        ↓
authoritative-writer.ts (buildExifToolTags + governance tags)
        ↓
ExifTool write (actual embedding)
        ↓
manifest-generator.ts (portable truth + governanceAttestation)
        ↓
Export ZIP (user download)
```

## Key Risk Points

| Risk | Location | Severity |
|------|----------|----------|
| User has no businessName | Profile incomplete | LOW (falls back to creatorName) |
| No onboarding context | First-time user | LOW (uses defaults) |
| ExifTool write fails | authoritative-writer.ts | LOW (captured in logs) |
| ~~Governance not in export~~ | ~~authoritative-writer.ts~~ | ✅ **FIXED v2.2** |
| AEO prompts missing | job-runner.ts synthesis | **MEDIUM** (claim gap) |

---

# Final Recommendations

## ✅ Completed (v2.2 Patch)

1. ~~**Add governance fields to XMP namespace**~~ ✅ 7 fields added
2. ~~**Add governance attestation to manifest.json**~~ ✅ governanceAttestation per image
3. **Clarify AEO claims** to focus on intent fields + EEAT structure

## Near-Term

1. Implement AEO-specific synthesis prompts when goal="seo_aeo"
2. Generate schema.org ImageObject in manifest
3. Add XMP-contextembed:AISearchContext field

## Documentation Updates

Update marketing doc to say:
- ✅ "Proof-First Metadata embeds 12+ evidence fields"
- ⚠️ "Governance policy controls which images can be used" (not "embedded proof of governance")
- ⚠️ "Intent signals for AI interpretation" (not "fully AEO-optimized")

---

*Audit performed: February 11, 2026*
*Auditor: ContextEmbed Engineering*
