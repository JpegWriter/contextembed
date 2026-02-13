# 🔬 ContextEmbed — Survival Lab: System Inventory

> **Generated:** February 13, 2026
> **Commit:** `f98532c` (main)
> **Dedicated source lines:** ~9,300

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            SURVIVAL LAB                                 │
├──────────┬──────────┬──────────┬──────────┬──────────┬────────────────┤
│ Database │   API    │   Web    │ Metadata │  Tests   │    Scripts     │
│ 10 tables│ 23 endpt │ 5 pages  │ 2 profs  │ 37 unit  │  2 CLI tools  │
│ 10 repos │ 8 svc    │ 5 comps  │ 1 ns cfg │ 3 suites │  1 matrix     │
│          │          │ 1 pillar │          │          │               │
└──────────┴──────────┴──────────┴──────────┴──────────┴────────────────┘
```

---

## 1. Database Layer

### Prisma Models (10 tables)

| Model | Table | Purpose |
|-------|-------|---------|
| `SurvivalPlatform` | `survival_platforms` | Registry of test platforms (WordPress, Instagram, etc.) |
| `SurvivalBaselineImage` | `survival_baseline_images` | CE-embedded source images with SHA-256 + metadata reports |
| `SurvivalTestRun` | `survival_test_runs` | A test execution against a specific platform |
| `SurvivalTestRunAsset` | `survival_test_run_assets` | Junction: which baselines are attached to which run |
| `SurvivalScenarioUpload` | `survival_scenario_uploads` | Post-platform re-downloaded files for comparison |
| `SurvivalMetadataReport` | `survival_metadata_reports` | Extracted EXIF/XMP/IPTC presence + field values |
| `SurvivalComparison` | `survival_comparisons` | Field-by-field diff + survival score (v1 + v2) |
| `SurvivalPlatformStats` | `survival_platform_stats` | Aggregated per-platform analytics (scores, retention, field survival) |
| `SurvivalPlatformTrend` | `survival_platform_trends` | Time-series trend data per platform per scenario |
| `SurvivalStudySession` | `survival_study_sessions` | Guided study session state (step, baselines, platforms) |

#### v2 Columns on `SurvivalComparison`

| Column | Type | Purpose |
|--------|------|---------|
| `scoreV2` | `Int?` | Weighted canonical score (0–100) |
| `survivalClass` | `String?` | PRISTINE / SAFE / DEGRADED / HOSTILE / DESTRUCTIVE |
| `diffReport` | `Json?` | Full field-level diff report from diff engine |

#### `SurvivalPlatformStats` — Fields

| Column | Type | Purpose |
|--------|------|---------|
| `platformId` | `String` (unique) | FK → `survival_platforms` |
| `totalRuns` | `Int` | Count of test runs |
| `totalScenarios` | `Int` | Count of scenario uploads |
| `avgScore` | `Float` | Legacy (v1) score average |
| `avgScoreV2` | `Float` | Weighted v2 score average |
| `bestScore` / `worstScore` | `Int` | Score range |
| `exifRetention` / `xmpRetention` / `iptcRetention` | `Float` | Container retention rates (0.0–1.0) |
| `creatorSurvived` / `creatorTotal` | `Int` | Creator field survival counts |
| `copyrightSurvived` / `copyrightTotal` | `Int` | Copyright field survival counts |
| `creditSurvived` / `creditTotal` | `Int` | Credit field survival counts |
| `descriptionSurvived` / `descriptionTotal` | `Int` | Description field survival counts |

#### `SurvivalPlatformTrend` — Fields

| Column | Type | Purpose |
|--------|------|---------|
| `platformId` | `String` | FK → `survival_platforms` |
| `scenarioUploadId` | `String` | Which scenario produced this point |
| `score` | `Int` | Legacy (v1) score |
| `scoreV2` | `Int?` | Weighted v2 score |
| `survivalClass` | `String?` | Classification at this point |
| `scenario` | `String?` | Scenario type label |
| `createdAt` | `DateTime` | Timestamp (indexed with platformId) |

#### `SurvivalStudySession` — Fields

| Column | Type | Purpose |
|--------|------|---------|  
| `id` | `String` (uuid) | Primary key |
| `userId` | `String` | Session owner |
| `title` | `String?` | Optional session label |
| `status` | `String` | `IN_PROGRESS` or `COMPLETE` |
| `currentStep` | `String` | Current wizard step (default `BASELINE_LOCK`) |
| `baselineIds` | `String[]` | Locked baseline image IDs |
| `platformSlugs` | `String[]` | Platform slugs under test |
| `createdAt` / `updatedAt` | `DateTime` | Timestamps |

#### v3 Columns on `SurvivalTestRun`

| Column | Type | Purpose |
|--------|------|---------|  
| `studySessionId` | `String?` | FK → `survival_study_sessions` (SET NULL) |

#### v3 Columns on `SurvivalScenarioUpload`

| Column | Type | Purpose |
|--------|------|---------|  
| `scenarioType` | `String?` | Guided-mode scenario label (e.g. `CMS_WP_ORIGINAL`) |
| `studySessionId` | `String?` | FK → `survival_study_sessions` (SET NULL) |

### Migrations

| File | Purpose |
|------|---------|
| `packages/db/prisma/migrations/20260212_add_survival_lab_tables/migration.sql` | DDL for original 7 tables, indexes, FK constraints (CASCADE) |
| `packages/db/prisma/migrations/20260206000000_survival_lab_v2_analytics/migration.sql` | v2: scoreV2/survivalClass/diffReport on comparisons, new stats + trends tables |
| `packages/db/prisma/migrations/20260212_survival_study_sessions/migration.sql` | v3: `survival_study_sessions` table, `studySessionId` + `scenarioType` on existing tables |

### Repositories (in `packages/db/src/repositories.ts`)

Each model has a typed repository with standard CRUD:

- `survivalPlatformRepo` — `findAll`, `findBySlug`, `upsert`, `count`
- `survivalBaselineRepo` — `findByUser`, `create`, `findById`, `updateHash`, `delete`
- `survivalTestRunRepo` — `findByUser`, `create`, `findByIdDeep`, `updateStatus`, `addAssets`, `delete`
- `survivalTestRunAssetRepo` — `create`, `delete`
- `survivalScenarioRepo` — `create`, `findByRunId`, `findById`
- `survivalMetadataReportRepo` — `create`, `findById`
- `survivalComparisonRepo` — `create` (now accepts `scoreV2?`, `survivalClass?`, `diffReport?`), `findByRunId`, `findByScenarioId`
- `survivalPlatformStatsRepo` — `findByPlatformId`, `findAll` (ordered by avgScoreV2 desc), `upsert`
- `survivalPlatformTrendRepo` — `findByPlatform` (limit, desc by createdAt), `create`
- `survivalStudySessionRepo` — `createSession`, `findByUser`, `findById`, `updateStep`, `updateStatus`, `setBaselines`, `setPlatforms`

v3 additions to existing repos:
- `survivalTestRunRepo` — `create()` now accepts `studySessionId?`; added `findByStudySession()`
- `survivalScenarioRepo` — `create()` now accepts `scenarioType?`, `studySessionId?`; added `findByStudySession()`

---

## 2. API Layer

### Endpoints (23 routes mounted at `/survival`)

#### Free-Form Endpoints (15)

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
| `POST` | `/runs/:id/scenarios` | Upload post-platform file, auto-compare (+ v2 diff + analytics hooks) |
| `GET` | `/runs/:id/comparisons` | Get full comparison results |
| `GET` | `/runs/:id/export.csv` | Export results as CSV, marks run complete |
| `GET` | `/analytics/summary` | Cross-platform analytics dashboard data |
| `GET` | `/analytics/platform/:slug` | Per-platform analytics + trend history |
| _(hook)_ | _(after scenario upload)_ | Non-blocking `updatePlatformStats()` + `recordTrend()` |

#### Guided Study Endpoints (8) — mounted at `/survival/study`

| Method | Path | Purpose |
|--------|------|---------|  
| `POST` | `/study/start` | Create a new guided study session |
| `GET` | `/study` | List user's study sessions |
| `GET` | `/study/:id` | Session detail with baselines, scenarios grouped by type, runs |
| `POST` | `/study/:id/advance` | Advance to next step (forward-only enforcement) |
| `POST` | `/study/:id/attach-baselines` | Lock 1–10 baselines for the session |
| `POST` | `/study/:id/attach-platforms` | Set platform slugs under test |
| `POST` | `/study/:id/evidence-pack` | Generate ZIP archive with signed download URL |
| `POST` | `/study/:id/ensure-run` | Auto-create or find existing run for a platform+session |

#### Study Step Sequence (9 steps)

```
BASELINE_LOCK → LOCAL_EXPORT → CDN_DERIVATIVE → CLOUD_STORAGE → CMS → SOCIAL → SUMMARY → EVIDENCE_PACK → COMPLETE
```

#### Scenario Types (13 labels)

```
LOCAL_EXPORT, CDN_DERIVATIVE,
CLOUD_GOOGLE_DRIVE, CLOUD_DROPBOX,
CMS_WP_ORIGINAL, CMS_WP_THUMB, CMS_SQUARESPACE, CMS_WIX, CMS_WEBFLOW, CMS_SHOPIFY,
SOCIAL_INSTAGRAM, SOCIAL_FACEBOOK, SOCIAL_LINKEDIN
```

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

### Services (8 dedicated)

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|  
| `metadata-extractor.ts` | 322 | Non-destructive ExifTool extraction (EXIF/XMP/IPTC detection, field extraction, mojibake detection, SHA-256) | `extractMetadataReport()` |
| `storage.ts` | 278 | Supabase Storage integration, bucket `ce-survival-lab`, raw binary upload/download, signed URLs | `uploadBaseline()`, `downloadFile()`, `getSignedUrl()` |
| `comparison.ts` | 224 | Field-by-field diff, v1 + v2 survival scores, human-readable summary | `compareToBaseline()` (now with `scoreV2`, `survivalClass`, `diffReport`) |
| `canonical-map.ts` | 195 | 9 canonical metadata fields with container-aware aliases and weight system | `CANONICAL_FIELDS`, `resolveCanonical()`, `extractCanonicalValue()` |
| `diff-engine.ts` | 307 | Field-level diff with 8 status types, container retention tracking | `generateMetadataDiff()`, `summariseDiff()` |
| `classifier.ts` | 197 | Weighted scoreV2 calculation and survival classification | `classifyDiff()`, `classFromScore()`, `classColor()`, `classLabel()` |
| `analytics.ts` | 326 | Platform-level analytics aggregation and dashboard data | `updatePlatformStats()`, `recordTrend()`, `getAnalyticsSummary()`, `getPlatformAnalytics()` |
| `evidence-pack.ts` | 272 | **NEW** — ZIP archive generator for study sessions (baselines + scenarios + diffs + CSV + README) | `buildEvidencePack()` |

All services are re-exported via the barrel at `apps/api/src/services/survival-lab/index.ts`.

### Survival Score v1 Algorithm (Legacy)

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

### Survival Score v2 Algorithm (Weighted Canonical)

Each of the 9 canonical fields has a weight (totalling 1.0). The diff engine assigns a `FieldStatus`, and the classifier applies a multiplier:

**Canonical Field Weights:**

| Field | Weight |
|-------|--------|
| CREATOR | 0.20 |
| COPYRIGHT | 0.25 |
| CREDIT | 0.10 |
| DESCRIPTION | 0.15 |
| KEYWORDS | 0.10 |
| SOURCE | 0.05 |
| CREATOR_TOOL | 0.05 |
| TITLE | 0.05 |
| USAGE_TERMS | 0.05 |

**Status → Multiplier:**

| Status | Multiplier | Meaning |
|--------|------------|---------|
| `PRESERVED` | 1.0 | Exact match across containers |
| `MIGRATED` | 0.9 | Value moved to different container |
| `TRUNCATED` | 0.4 | Leading substring retained |
| `ENCODING_MUTATION` | 0.3 | Mojibake / encoding corruption |
| `MODIFIED` | 0.2 | Material change to value |
| `STRIPPED` | 0.0 | Field completely removed |
| `REGENERATED` | — | New value that wasn't in baseline |
| `ABSENT` | — | Neither baseline nor scenario has it (not penalised) |

**Survival Classes:**

| Class | Score Range | Hex Color |
|-------|------------|-----------|
| `PRISTINE` | 100 | `#22c55e` |
| `SAFE` | 80–99 | `#3b82f6` |
| `DEGRADED` | 50–79 | `#f59e0b` |
| `HOSTILE` | 20–49 | `#f97316` |
| `DESTRUCTIVE` | 0–19 | `#ef4444` |

**Score formula:** `scoreV2 = round(Σ (fieldWeight × statusMultiplier) / Σ (applicableFieldWeights) × 100)`

### Diff Engine — FieldStatus Detection Logic

| Status | Detection Rule |
|--------|---------------|
| `PRESERVED` | Exact string match (case-insensitive, trimmed) |
| `STRIPPED` | Baseline had value, scenario is empty/missing |
| `MIGRATED` | Value exists in scenario but in different container(s) |
| `TRUNCATED` | Scenario value is a leading substring of baseline |
| `ENCODING_MUTATION` | Scenario contains mojibake patterns (`Ã©`, `Ã¼`, `â€™`, etc.) |
| `MODIFIED` | Value present but materially changed |
| `REGENERATED` | Scenario has value, baseline did not |
| `ABSENT` | Neither baseline nor scenario has a value |

---

## 3. Web App (Frontend)

### Pages (5 + 1 pillar)

| Page | Path | Lines | Purpose |
|------|------|-------|---------|  
| Main Dashboard | `/survival-lab` | 359 | Platform list, test run list, seed button, create-run modal, Guided Mode button, Continue Study banner |
| Baselines | `/survival-lab/baselines` | 342 | Upload CE-embedded images, list baselines, verify SHA-256 integrity |
| Run Detail | `/survival-lab/runs/[id]` | 772 | Attach baselines, upload scenarios, expandable v2 diff view per scenario, CSV export |
| Analytics Dashboard | `/survival-lab/analytics` | 347 | Cross-platform analytics dashboard data |
| **Guided Mode** | `/survival-lab/mode` | 297 | **NEW** — Three-column wizard: StepRail \| StepPanel \| LiveResultCards. Session ID in URL query param. |
| Pillar Page | `/metadata-survival` | 428 | Public-facing educational page with survival matrix |

### Guided Mode Components (5)

| Component | Lines | Purpose |
|-----------|-------|---------|  
| `StepRail.tsx` | 111 | Vertical step progress indicator (8 steps, CheckCircle2/Loader2/Circle icons) |
| `StepPanel.tsx` | 573 | Per-step content panel with 8 sub-panels: BaselineLock, SingleUpload, MultiPlatform, CMS, Social, Summary, EvidencePack, Complete |
| `ScenarioUploader.tsx` | 170 | Drag-and-drop file upload with auto ensure-run, result cards with v1/v2 scores |
| `LiveResultCards.tsx` | 93 | Right-rail live score cards with survival class color coding and field retention chips |
| `StudySummary.tsx` | 240 | Aggregated results: overall score, field retention bars, per-type table with class distribution bars |

#### Analytics Dashboard Components

| Component | Purpose |
|-----------|---------|
| `StatCard` | Overview metric (Platforms Tested, Test Runs, Scenarios, Avg v1, Avg v2) |
| `RetentionBadge` | Color-coded EXIF/XMP/IPTC retention percentage |
| `ScoreIcon` | Score with survival-class color coding |
| `FieldBar` | Horizontal progress bar (survived / total) for a metadata field |
| `ContainerChip` | Small retention indicator per container type |

#### Run Detail v2 Components

| Component | Purpose |
|-----------|---------|
| `ScenarioResultRow` | Expandable table row showing v1 score, v2 score, survival class, click to expand |
| `DiffDetailPanel` | Per-field diff table (field, status with icon, baseline/scenario values, container migration, notes), survival rate, container retention chips |

### API Client (in `apps/web/src/lib/api.ts`)

22 typed methods on the `survivalLabApi` object:

```
getPlatforms, seedPlatforms, getBaselines, uploadBaseline,
verifyBaseline, getRuns, createRun, getRunDetail,
attachBaselines, uploadScenario, getComparisons, exportCsv,
getAnalyticsSummary, getPlatformAnalytics,
studyStart, studyList, studyGet, studyAdvance,
studyAttachBaselines, studyAttachPlatforms, studyEvidencePack, studyEnsureRun
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

## 5. Test Coverage

### Unit Tests (vitest)

| File | Tests | Status |
|------|-------|--------|
| `apps/api/src/services/survival-lab/__tests__/diff-engine.test.ts` | 12 | ✅ Passing |
| `apps/api/src/services/survival-lab/__tests__/classifier.test.ts` | 9 | ✅ Passing |
| `apps/api/src/services/survival-lab/__tests__/study-session.test.ts` | 16 | ✅ Passing |
| **Total** | **37** | ✅ |
| STRIPPED — creator removed | Status = STRIPPED |
| STRIPPED — copyright removed | Status = STRIPPED |
| MIGRATED — container change | Status = MIGRATED |
| TRUNCATED — leading substring | Status = TRUNCATED |
| ENCODING_MUTATION — mojibake | Status = ENCODING_MUTATION |
| MODIFIED — material change | Status = MODIFIED |
| REGENERATED — new field | Status = REGENERATED |
| ABSENT — neither has it | Status = ABSENT |
| Container retention — IPTC stripped | iptc.present = false |
| Status counts — correct tally | statusCounts map |
| Empty JSON — edge case | Handles gracefully |

#### Classifier Tests (9)

| Test | Asserts |
|------|---------|
| PRISTINE — score 100 | All PRESERVED → class PRISTINE |
| DESTRUCTIVE — score 0–19 | All STRIPPED → class DESTRUCTIVE |
| Correct multipliers | STATUS_MULTIPLIER values |
| ABSENT not penalised | Excluded from weighted score |
| Summary generation | Human-readable string |
| Container retention pass-through | Forwarded from diff report |
| classFromScore boundaries | 100, 80, 50, 20, 19 thresholds |
| classLabel strings | Correct display labels |
| classColor hex | Correct hex colors |

#### Study Session Tests (16)

| Test | Asserts |
|------|---------|  
| STUDY_STEPS — 9 ordered steps | Length, first = BASELINE_LOCK, last = COMPLETE |
| STUDY_STEPS — includes all platform steps | Full sequence match |
| Forward advancement allowed | BASELINE_LOCK → LOCAL_EXPORT, etc. |
| Skip steps allowed | BASELINE_LOCK → CMS |
| Backward movement rejected | CMS → BASELINE_LOCK → error |
| Same-step advancement rejected | LOCAL_EXPORT → LOCAL_EXPORT → error |
| Invalid step names rejected | Unknown step → error |
| COMPLETE is terminal | Index = length − 1 |
| SCENARIO_TYPES — 13 labels | Includes all platform scenario types |
| CMS coverage | ≥ 6 CMS_ types |
| Social coverage | Exactly 3 SOCIAL_ types |
| Every scenario type maps to a step | Full coverage check |
| Step-specific types subset of SCENARIO_TYPES | Bidirectional validation |

---

## 6. CLI Scripts

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

## 7. Entry Points

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

**Free-Form:** Navigate to `/survival-lab` → Seed Platforms → Upload Baselines → Create Run → Upload Scenarios → View Results → Export CSV.

**Guided Mode:** `/survival-lab` → Click "Guided Mode" → Lock Baselines → Walk through Local Export → CDN → Cloud → CMS → Social → Summary → Evidence Pack → Complete.

**Continue Study:** If an IN_PROGRESS session exists, a banner appears on the main dashboard with a direct link.

Analytics: `/survival-lab/analytics` → Cross-platform leaderboard, field survival bars, container retention.

---

## 8. File Index (48 files)

| # | Layer | File | Notes |
|---|-------|------|-------|
| 1 | DB | `packages/db/prisma/schema.prisma` | 10 survival models |
| 2 | DB | `packages/db/prisma/migrations/20260212_add_survival_lab_tables/migration.sql` | Original 7 tables |
| 3 | DB | `packages/db/prisma/migrations/20260206000000_survival_lab_v2_analytics/migration.sql` | v2 columns + stats/trends tables |
| 4 | DB | `packages/db/prisma/migrations/20260212_survival_study_sessions/migration.sql` | **v3** — study sessions table + FK columns |
| 5 | DB | `packages/db/src/repositories.ts` | 10 survival repos |
| 6 | API | `apps/api/src/routes/survival-lab.ts` | 15 free-form endpoints |
| 7 | API | `apps/api/src/routes/survival-study.ts` | **v3** — 8 guided study endpoints |
| 8 | API | `apps/api/src/services/survival-lab/index.ts` | Barrel export (8 modules) |
| 9 | API | `apps/api/src/services/survival-lab/metadata-extractor.ts` | ExifTool extraction |
| 10 | API | `apps/api/src/services/survival-lab/storage.ts` | Supabase Storage |
| 11 | API | `apps/api/src/services/survival-lab/comparison.ts` | v1 + v2 scoring |
| 12 | API | `apps/api/src/services/survival-lab/canonical-map.ts` | 9 canonical fields |
| 13 | API | `apps/api/src/services/survival-lab/diff-engine.ts` | 8-status field diff |
| 14 | API | `apps/api/src/services/survival-lab/classifier.ts` | Weighted classification |
| 15 | API | `apps/api/src/services/survival-lab/analytics.ts` | Platform aggregation |
| 16 | API | `apps/api/src/services/survival-lab/evidence-pack.ts` | **v3** — ZIP archive generator |
| 17 | Test | `apps/api/src/services/survival-lab/__tests__/diff-engine.test.ts` | 12 tests |
| 18 | Test | `apps/api/src/services/survival-lab/__tests__/classifier.test.ts` | 9 tests |
| 19 | Test | `apps/api/src/services/survival-lab/__tests__/study-session.test.ts` | **v3** — 16 tests |
| 20 | API | `apps/api/src/index.ts` | Mounts `/survival` |
| 21 | API | `apps/api/src/services/entitlements.ts` | |
| 22 | API | `apps/api/src/services/workspace-limits.ts` | |
| 23 | API | `apps/api/src/services/operator.ts` | Survival playbook |
| 24 | Web | `apps/web/src/app/survival-lab/page.tsx` | Main dashboard + Guided Mode button |
| 25 | Web | `apps/web/src/app/survival-lab/baselines/page.tsx` | Baseline management |
| 26 | Web | `apps/web/src/app/survival-lab/runs/[id]/page.tsx` | Run detail + v2 diff view |
| 27 | Web | `apps/web/src/app/survival-lab/analytics/page.tsx` | Analytics dashboard |
| 28 | Web | `apps/web/src/app/survival-lab/mode/page.tsx` | **v3** — Guided mode wizard |
| 29 | Web | `apps/web/src/app/metadata-survival/page.tsx` | Public pillar page |
| 30 | Web | `apps/web/src/lib/api.ts` | 22 survival methods |
| 31 | Web | `apps/web/src/components/survival/StepRail.tsx` | **v3** — Step progress indicator |
| 32 | Web | `apps/web/src/components/survival/StepPanel.tsx` | **v3** — Per-step content panel |
| 33 | Web | `apps/web/src/components/survival/ScenarioUploader.tsx` | **v3** — Drag-drop file upload |
| 34 | Web | `apps/web/src/components/survival/LiveResultCards.tsx` | **v3** — Live score cards |
| 35 | Web | `apps/web/src/components/survival/StudySummary.tsx` | **v3** — Aggregated results view |
| 36 | Web | `apps/web/src/components/copilot/playbooks.ts` | |
| 37 | Web | `apps/web/src/components/copilot/CopilotPanel.tsx` | |
| 38 | Meta | `packages/metadata/src/profiles/types.ts` | |
| 39 | Meta | `packages/metadata/src/profiles/index.ts` | |
| 40 | Meta | `packages/metadata/src/profiles/production-standard.ts` | |
| 41 | Meta | `packages/metadata/src/profiles/lab-forensic.ts` | |
| 42 | Script | `scripts/survival/extract-baseline.ts` | |
| 43 | Script | `scripts/survival/run-survival-test.ts` | |
| 44 | Script | `scripts/smoke-test-embed.ts` | Survival assertions |
| 45 | Config | `apps/api/src/services/seed-users.ts` | Survival concerns |
| 46 | Config | `apps/api/package.json` | vitest + archiver deps |
| 47 | Docs | `docs/CONTEXTEMBED_OVERVIEW.md` | Survival Lab section |
| 48 | Blog | `apps/blog/content/pillars/metadata-survival.mdx` | |

---

## 9. Changelog

### v3 — `f98532c` (February 13, 2026)

**Guided Study Mode — Foundation Study Wizard**

| Area | Change |
|------|--------|
| DB | +1 table (`survival_study_sessions`), +2 columns on `survival_test_runs`, +2 columns on `survival_scenario_uploads` |
| DB | +1 repository (`survivalStudySessionRepo` — 7 methods), updated 2 existing repos with `findByStudySession()` |
| API | +1 route file (`survival-study.ts` — 8 endpoints at `/survival/study`) |
| API | +1 service (`evidence-pack.ts` — ZIP archive generator with `archiver`) |
| API | Scenario upload now accepts `scenarioType` and `studySessionId` |
| Web | +1 page (`/survival-lab/mode` — three-column wizard with Suspense boundary) |
| Web | +5 components (StepRail, StepPanel, ScenarioUploader, LiveResultCards, StudySummary) |
| Web | Main dashboard updated with "Guided Mode" button + "Continue Study" banner |
| Web | +8 API client methods (`studyStart` … `studyEnsureRun`), updated `uploadScenario` signature |
| Test | +16 unit tests (step ordering, advancement logic, scenario types, step↔type mapping) |
| Docs | `CONTEXTEMBED_OVERVIEW.md` updated with Survival Lab section |
| Build | `@types/archiver` moved to deps, test files excluded from `tsc` build, Suspense fix |
| Lines | ~7,100 → ~9,300 (+2,200) |
| Files | 38 → 48 (+10 new) |

### v2 — `f11aa38` (February 12, 2026)

**Canonical Diff Engine + Classifier + Analytics Dashboard**

| Area | Change |
|------|--------|
| DB | +2 tables (`survival_platform_stats`, `survival_platform_trends`), +3 columns on `survival_comparisons` |
| DB | +2 repositories (`survivalPlatformStatsRepo`, `survivalPlatformTrendRepo`) |
| API | +4 services (canonical-map, diff-engine, classifier, analytics) |
| API | +2 endpoints (`/analytics/summary`, `/analytics/platform/:slug`) |
| API | Scenario upload now triggers non-blocking analytics hooks |
| Web | +1 page (analytics dashboard with leaderboard, field survival, container retention) |
| Web | Run detail page enhanced with expandable v2 diff view per scenario |
| Web | +2 API client methods (`getAnalyticsSummary`, `getPlatformAnalytics`) |
| Test | +21 unit tests (12 diff-engine, 9 classifier) via vitest |
| Lines | ~4,600 → ~7,100 (+2,500) |
| Files | 29 → 38 (+9 new) |

### v1 — `7f7f9a4` (February 12, 2026)

Initial Survival Lab system: 7 tables, 13 endpoints, 3 pages, 2 metadata profiles, 2 CLI tools.
