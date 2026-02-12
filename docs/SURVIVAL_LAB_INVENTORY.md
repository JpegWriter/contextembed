# 🔬 ContextEmbed — Survival Lab: System Inventory

> **Generated:** February 12, 2026
> **Commit:** `7f7f9a4` (main)
> **Dedicated source lines:** ~4,600

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      SURVIVAL LAB                           │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ Database │   API    │   Web    │ Metadata │    Scripts     │
│ 7 tables │ 13 endpt │ 3 pages  │ 2 profs  │  2 CLI tools  │
│ 7 repos  │ 3 svc    │ 1 pillar │ 1 ns cfg │  1 matrix     │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

---

## 1. Database Layer

### Prisma Models (7 tables)

| Model | Table | Purpose |
|-------|-------|---------|
| `SurvivalPlatform` | `survival_platforms` | Registry of test platforms (WordPress, Instagram, etc.) |
| `SurvivalBaselineImage` | `survival_baseline_images` | CE-embedded source images with SHA-256 + metadata reports |
| `SurvivalTestRun` | `survival_test_runs` | A test execution against a specific platform |
| `SurvivalTestRunAsset` | `survival_test_run_assets` | Junction: which baselines are attached to which run |
| `SurvivalScenarioUpload` | `survival_scenario_uploads` | Post-platform re-downloaded files for comparison |
| `SurvivalMetadataReport` | `survival_metadata_reports` | Extracted EXIF/XMP/IPTC presence + field values |
| `SurvivalComparison` | `survival_comparisons` | Field-by-field diff + survival score (0–100) |

### Migration

| File | Purpose |
|------|---------|
| `packages/db/prisma/migrations/20260212_add_survival_lab_tables/migration.sql` | DDL for all 7 tables, indexes, FK constraints (CASCADE) |

### Repositories (in `packages/db/src/repositories.ts`)

Each model has a typed repository with standard CRUD:

- `survivalPlatformRepo` — `findAll`, `findBySlug`, `upsert`, `count`
- `survivalBaselineRepo` — `findByUser`, `create`, `findById`, `updateHash`, `delete`
- `survivalTestRunRepo` — `findByUser`, `create`, `findByIdDeep`, `updateStatus`, `addAssets`, `delete`
- `survivalTestRunAssetRepo` — `create`, `delete`
- `survivalScenarioRepo` — `create`, `findByRunId`, `findById`
- `survivalMetadataReportRepo` — `create`, `findById`
- `survivalComparisonRepo` — `create`, `findByRunId`, `findByScenarioId`

---

## 2. API Layer

### Endpoints (13 routes mounted at `/survival`)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/platforms` | List all platforms |
| `POST` | `/platforms/seed` | Seed the 12 Phase 1 study platforms |
| `GET` | `/baselines` | List user's baseline images + metadata reports |
| `POST` | `/baselines` | Upload a CE-embedded baseline image |
| `POST` | `/baselines/:id/verify` | Re-download & verify SHA-256 integrity |
| `GET` | `/runs` | List user's test runs |
| `POST` | `/runs` | Create a new test run for a platform |
| `GET` | `/runs/:id` | Get run details with attached baselines |
| `POST` | `/runs/:id/baselines` | Attach baseline images to a run |
| `POST` | `/runs/:id/scenarios` | Upload post-platform file, auto-compare |
| `GET` | `/runs/:id/comparisons` | Get full comparison results |
| `GET` | `/runs/:id/export.csv` | Export results as CSV, marks run complete |

### Seed Platforms (12)

| Slug | Platform | Test Method |
|------|----------|-------------|
| `wordpress_selfhosted` | WordPress (Self-Hosted) | Upload via Media Library |
| `wordpress_com` | WordPress.com | Upload via block editor |
| `squarespace` | Squarespace | Upload via image block |
| `wix` | Wix | Upload via media manager |
| `webflow` | Webflow | Upload via asset panel |
| `shopify` | Shopify | Upload via files section |
| `instagram` | Instagram | Upload via mobile app |
| `facebook` | Facebook | Upload via post composer |
| `linkedin` | LinkedIn | Upload via post editor |
| `dropbox` | Dropbox | Sync via desktop client |
| `google_drive` | Google Drive | Upload via web interface |
| `smugmug` | SmugMug | Upload via web uploader |

### Services (3 dedicated)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `apps/api/src/services/survival/metadata-extractor.ts` | Non-destructive ExifTool extraction (EXIF/XMP/IPTC detection, field extraction, mojibake detection, SHA-256) | `extractMetadataReport()` |
| `apps/api/src/services/survival/storage.ts` | Supabase Storage integration, bucket `ce-survival-lab`, raw binary upload/download, signed URLs | `uploadBaseline()`, `downloadFile()`, `getSignedUrl()` |
| `apps/api/src/services/survival/comparison.ts` | Field-by-field diff, survival score calculation (0–100), human-readable summary | `compareMetadata()`, `calculateSurvivalScore()` |

### Survival Score Algorithm

Starts at **100**, deductions applied:

| Condition | Penalty |
|-----------|---------|
| XMP stripped | −25 |
| EXIF stripped | −20 |
| IPTC stripped | −15 |
| Rights mismatch | −15 |
| Creator mismatch | −10 |
| Credit mismatch | −10 |
| Description mismatch | −10 |
| Dimensions changed | −10 |

---

## 3. Web App (Frontend)

### Pages (3 + 1 pillar)

| Page | Path | Lines | Purpose |
|------|------|-------|---------|
| Main Dashboard | `/survival-lab` | 342 | Platform list, test run list, seed button, create-run modal |
| Baselines | `/survival-lab/baselines` | 358 | Upload CE-embedded images, list baselines, verify SHA-256 integrity |
| Run Detail | `/survival-lab/runs/[id]` | 615 | Attach baselines, upload scenarios, color-coded comparison results, CSV export |
| Pillar Page | `/metadata-survival` | 428 | Public-facing educational page with survival matrix |

### API Client (in `apps/web/src/lib/api.ts`)

12 typed methods on the `survival` object:

```
getPlatforms, seedPlatforms, getBaselines, uploadBaseline,
verifyBaseline, getRuns, createRun, getRunDetail,
attachBaselines, uploadScenario, getComparisons, exportCsv
```

---

## 4. Metadata Profile System

### Profile Registry (`packages/metadata/src/profiles/`)

| File | Lines | Profile | Purpose |
|------|-------|---------|---------|
| `types.ts` | 117 | — | `UserContext`, `AssetContext`, `EmbedProfile` interface, `ForensicContext`, `ForensicEmbedResult` |
| `production-standard.ts` | 109 | `CE_PRODUCTION_STANDARD` | Clean professional authorship (EXIF/IPTC/XMP + CE namespace) |
| `lab-forensic.ts` | 141 | `CE_LAB_FORENSIC` | Forensic instrumentation — layer markers, test keywords, stress caption |
| `index.ts` | 405 | — | Registry, `embedWithProfile()`, `embedForensicBaseline()`, CE namespace config, LAB_MODE gate |

### CE Custom XMP Namespace

```
URI:    http://contextembed.com/ns/1.0/
Prefix: CE
```

| Tag | Used By | Purpose |
|-----|---------|---------|
| `CE:Version` | Both | App version (2.0.0) |
| `CE:ExportProfile` | Both | Profile identifier |
| `CE:Timestamp` | Both | ISO 8601 embed timestamp |
| `CE:RunID` | Forensic only | UUID per embed run |
| `CE:BaselineID` | Forensic only | Baseline identifier |
| `CE:OriginalHash` | Forensic only | SHA-256 of pre-embed file |
| `CE:FileSizeOriginal` | Forensic only | Original file size in bytes |

### CE_PRODUCTION_STANDARD — Fields Written

| Container | Tags |
|-----------|------|
| **EXIF** | `Artist`, `Copyright`, `ImageDescription` |
| **IPTC** | `By-line`, `CopyrightNotice`, `Credit`, `Source`, `Caption-Abstract`, `Keywords[]` |
| **XMP** | `dc:creator`, `dc:rights`, `dc:description`, `photoshop:Credit`, `xmpRights:Marked` |
| **CE** | `Version`, `ExportProfile`, `Timestamp` |

### CE_LAB_FORENSIC — Marker Strategy

| Layer | Tag | Value Pattern |
|-------|-----|---------------|
| EXIF only | `ImageDescription` | `EXIF_ONLY_MARKER_{baselineID}` |
| IPTC only | `Caption-Abstract` | `IPTC_ONLY_MARKER_{baselineID}` |
| XMP only | `dc:Description` | `XMP_ONLY_MARKER_{baselineID}` |
| Cross-layer | `Artist` / `By-line` / `dc:Creator` | `{name} \| CE_LAB_{baselineID}` |
| Cross-layer | `Copyright` / `CopyrightNotice` / `dc:Rights` | `© {year} {name} \| CE_LAB_{baselineID}` |
| Keywords | `Keywords` + `dc:Subject` | `CE_TEST_01` … `CE_TEST_12` |
| Stress test | `UserComment` | 300+ chars with `© € ü é ß` |
| Short field | `Headline` | `OK` |

### Access Control

- `CE_LAB_FORENSIC` requires `LAB_MODE=true` environment variable
- Not accessible from the public export UI
- `CE_PRODUCTION_STANDARD` has no gate — available to all users

---

## 5. CLI Scripts

| File | Lines | Purpose |
|------|-------|---------|
| `scripts/survival/extract-baseline.ts` | 340 | Extract all metadata from an embedded image, produce JSON snapshot for pre/post comparison |
| `scripts/survival/run-survival-test.ts` | 160 | Platform survival matrix — 11 platforms with expected IPTC/XMP/EXIF survival ratings |

### Platform Matrix (Expected Survival)

| Platform | IPTC | XMP | EXIF |
|----------|------|-----|------|
| WordPress (Native) | partial | partial | full |
| WordPress + MLA | full | full | full |
| Squarespace | none | none | partial |
| Dropbox | full | full | full |
| Google Drive | full | full | full |
| Instagram | none | none | partial |
| Facebook | none | none | none |
| LinkedIn | none | none | partial |
| PhotoShelter | full | full | full |
| SmugMug | full | full | full |
| Adobe Lightroom CC | full | full | full |

---

## 6. Entry Points

### Forensic Baseline CLI

```bash
LAB_MODE=true npx ts-node -e "
  import { embedForensicBaseline } from '@contextembed/metadata';
  embedForensicBaseline('./sample.jpg', '01', { displayName: 'Test User' })
    .then(r => console.log(JSON.stringify(r, null, 2)));
"
```

### Production Embed

```ts
import { embedWithProfile } from '@contextembed/metadata';

const result = await embedWithProfile(
  '/images/hero.jpg',
  'CE_PRODUCTION_STANDARD',
  { displayName: 'Jane Doe', businessName: 'JD Studio' },
  { shortAlt: 'Portrait', structuredKeywords: ['portrait', 'studio'] },
);
```

### Web UI

Navigate to `/survival-lab` → Seed Platforms → Upload Baselines → Create Run → Upload Scenarios → View Results → Export CSV.

---

## 7. File Index (29 files)

| # | Layer | File |
|---|-------|------|
| 1 | DB | `packages/db/prisma/schema.prisma` (survival models) |
| 2 | DB | `packages/db/prisma/migrations/20260212_add_survival_lab_tables/migration.sql` |
| 3 | DB | `packages/db/src/repositories.ts` (survival repos) |
| 4 | API | `apps/api/src/routes/survival-lab.ts` |
| 5 | API | `apps/api/src/services/survival/index.ts` |
| 6 | API | `apps/api/src/services/survival/metadata-extractor.ts` |
| 7 | API | `apps/api/src/services/survival/storage.ts` |
| 8 | API | `apps/api/src/services/survival/comparison.ts` |
| 9 | API | `apps/api/src/index.ts` (mounts `/survival`) |
| 10 | API | `apps/api/src/services/entitlements.ts` |
| 11 | API | `apps/api/src/services/workspace-limits.ts` |
| 12 | API | `apps/api/src/services/operator.ts` (survival playbook) |
| 13 | Web | `apps/web/src/app/survival-lab/page.tsx` |
| 14 | Web | `apps/web/src/app/survival-lab/baselines/page.tsx` |
| 15 | Web | `apps/web/src/app/survival-lab/runs/[id]/page.tsx` |
| 16 | Web | `apps/web/src/app/metadata-survival/page.tsx` |
| 17 | Web | `apps/web/src/lib/api.ts` (survival methods) |
| 18 | Web | `apps/web/src/components/copilot/playbooks.ts` |
| 19 | Web | `apps/web/src/components/copilot/CopilotPanel.tsx` |
| 20 | Meta | `packages/metadata/src/profiles/types.ts` |
| 21 | Meta | `packages/metadata/src/profiles/index.ts` |
| 22 | Meta | `packages/metadata/src/profiles/production-standard.ts` |
| 23 | Meta | `packages/metadata/src/profiles/lab-forensic.ts` |
| 24 | Script | `scripts/survival/extract-baseline.ts` |
| 25 | Script | `scripts/survival/run-survival-test.ts` |
| 26 | Script | `scripts/smoke-test-embed.ts` (survival assertions) |
| 27 | Config | `apps/api/src/services/seed-users.ts` (survival concerns) |
| 28 | Docs | `docs/CONTEXTEMBED_OVERVIEW.md` (survival section) |
| 29 | Blog | `apps/blog/content/pillars/metadata-survival.mdx` |
