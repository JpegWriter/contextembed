# ContextEmbed™
## AI-Powered Metadata Intelligence for Professional Photographers
### Version 2.1 — Evidence-Backed Authority Metadata

---

# Executive Summary

**ContextEmbed** is an enterprise-grade SaaS platform that automatically generates, embeds, and manages rich IPTC/XMP metadata for professional photographers. By combining computer vision AI with user-provided context, ContextEmbed produces search-optimized, legally-compliant, and AI-discoverable image metadata at scale.

### The Problem
- **70%+ of professional images** have incomplete or missing metadata
- Manual metadata entry takes **3-5 minutes per image** — unsustainable for shoots with 500+ images
- Poor metadata = **invisible images** in Google Image Search, AI search engines (Perplexity, ChatGPT), and stock platforms
- Photographers lose revenue from undiscoverable work and miss SEO opportunities
- **AI-generated images** are flooding the market, eroding trust in authentic photography

### The Solution
ContextEmbed uses GPT-4 Vision to analyze images, combines analysis with photographer-provided context (event details, client info, location), and generates **enterprise-grade IPTC/XMP metadata** that is:
- ✅ SEO-optimized for Google and AI search engines (AEO-ready)
- ✅ EEAT-compliant (Experience, Expertise, Authoritativeness, Trustworthiness)
- ✅ Legally complete with proper copyright, credits, and usage terms
- ✅ Embedded directly into file headers using industry-standard ExifTool
- ✅ **Evidence-backed** with proof-first fields for authenticity verification
- ✅ **Governance-protected** with AI-generated image policies

### Key Metrics
| Metric | Value |
|--------|-------|
| Time to metadata per image | **< 10 seconds** (vs. 3-5 min manual) |
| Fields populated | **50+ IPTC/XMP fields** (including proof-first) |
| Accuracy (headline/description) | **95%+ relevance** |
| Export formats | Original, JPEG, TIFF, PNG with XMP sidecars |
| Health score range | **0-100** with tier classification |

---

# Product Overview

## Core Features

### 1. AI Vision Analysis
- Automatic subject detection (people, objects, scenes)
- Emotion and mood classification
- Location cue extraction (landmarks, signage)
- Text/watermark detection (OCR)
- Color palette and composition analysis

### 2. Context-Aware Metadata Synthesis
- Merges AI vision with photographer-provided context
- Event-aware metadata (wedding, portrait, corporate, product)
- Consistent branding across entire galleries
- Photographer style and voice preservation

### 3. Enterprise Metadata Fields
- **Descriptive**: Headline, Description (200-1200 chars), Keywords (5-15 optimized)
- **Attribution**: Creator, Copyright, Credit, Source
- **Rights**: Usage Terms, License URL, Model/Property Releases
- **Location**: City, State, Country, Venue/Sublocation
- **IPTC Scene/Subject Codes**: Industry-standard classification
- **XMP Audit Trail**: Version tracking, hash verification

### 4. Proof-First Metadata (NEW v2.1)
Evidence-backed fields that establish authenticity and authority:

| Field Group | Fields | Purpose |
|-------------|--------|---------|
| **BusinessIdentity** | BusinessName, ContactInfo, Website | Establishes the creator entity |
| **JobEvidence** | JobType, ServiceCategory, ClientContext | Proves commercial work context |
| **SemanticLocation** | GeoFocus, TargetPage, PageRole | Links to website/IA structure |
| **Continuity** | SessionId, ClusterId, SequenceNumber | Gallery/series coherence |
| **IAStructure** | AssetId, EmbedTier, ProcessingPipeline | Provenance chain |

### 5. Smart Export System
- **Presets**: Lightroom Ready, Archive Quality, Client Delivery, Web Optimized, Social Media
- **Format Options**: Original, JPEG (50-100% quality), TIFF, PNG
- **Color Profiles**: sRGB, Adobe RGB, ProPhoto RGB
- **Sidecar Support**: XMP files for non-destructive workflows
- **Naming**: From headline, title, date, or sequence
- **Manifest Generation**: SHA-256 checksums, health reports

### 6. Quality Assurance Dashboard
- Metadata Strength Indicator (Weak/Good/Excellent)
- Before/After diff view
- Provenance preview (© Author · Location · License)
- Explain-Why mode (shows AI reasoning)
- Local signal indicators (location data quality)
- **Health Score**: 0-100 with AUTHORITY/EVIDENCE/BASIC/INCOMPLETE tiers

### 7. Visual Authenticity Governance (NEW v2.1)
Protect your brand from AI-generated image contamination:

| Policy | Behavior |
|--------|----------|
| **Strict (deny_ai_proof)** | AI-generated images blocked for proof roles |
| **Conditional** | AI proof images flagged for manual review |
| **Permissive** | All content allowed (stock/social use cases) |

- **Startup Mode**: Locks policy to strict for new businesses building authentic portfolios
- **Role Classification**: proof / hero / decorative / stock
- **Decision Audit Log**: Full history of governance decisions with timestamps

## User Workflow

```
1. Create Project → Name, Location, Date, Gallery Context
2. Configure Governance → Set visual authenticity policy
3. Upload Images → Drag & drop, batch upload
4. Add Context → Per-image or batch context
5. Run Embed → AI analyzes + generates metadata
6. Review → Quality dashboard, health scores, governance status
7. Export → Choose preset, download with manifest
```

---

# Technical Architecture

## Stack Overview

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS |
| **Backend** | Express.js, TypeScript, Node.js |
| **Database** | PostgreSQL (Supabase), Prisma ORM |
| **AI/ML** | OpenAI GPT-4 Vision, GPT-4 Turbo |
| **Metadata** | ExifTool-vendored v26.2.0, IPTC Core, XMP |
| **Auth** | Supabase Auth (OAuth, Email) |
| **Build** | Turborepo monorepo, pnpm workspaces |

## Package Architecture

```
packages/
├── core/           # Domain types, Zod schemas, validators
├── db/             # Prisma client, repositories, governance
├── metadata/       # ExifTool wrapper, field mapping, validation
│   ├── iptc-contract.ts      # Proof-first types, constraints
│   ├── authoritative-writer.ts # XMP namespace v2.1
│   ├── manifest-generator.ts  # Export manifests with checksums
│   └── metadata-validator.ts  # Field validation + spam detection
├── providers/      # OpenAI LLM/Vision providers

apps/
├── api/            # Express REST API, job runner, governance routes
├── web/            # Next.js frontend, settings UI
```

## AI Pipeline

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Image     │───▶│  GPT-4 Vision│───▶│ Vision Analysis │
│   Upload    │    │   Analysis   │    │    (JSON)       │
└─────────────┘    └──────────────┘    └────────┬────────┘
                                                │
┌─────────────┐    ┌──────────────┐    ┌────────▼────────┐
│  Onboarding │───▶│   Context    │───▶│ Metadata Synth  │
│   Profile   │    │   Merger     │    │   (GPT-4)       │
└─────────────┘    └──────────────┘    └────────┬────────┘
                                                │
┌─────────────┐    ┌──────────────┐    ┌────────▼────────┐
│  Governance │───▶│  Validation  │───▶│  50+ IPTC/XMP   │
│   Policy    │    │  + Scoring   │    │  Proof Fields   │
└─────────────┘    └──────────────┘    └────────┬────────┘
                                                │
┌─────────────┐    ┌──────────────┐    ┌────────▼────────┐
│  Embedded   │◀───│   ExifTool   │◀───│ XMP Namespace   │
│    File     │    │   v26.2.0    │    │     v2.1        │
└─────────────┘    └──────────────┘    └─────────────────┘
```

## Database Schema (Key Tables)

```sql
User                    -- Supabase Auth users
Project                 -- Photography projects/albums
  ├── visualAuthenticityPolicy  -- conditional/deny_ai_proof/allow
  └── startupModeEnabled        -- Locks policy when true
OnboardingProfile       -- Brand settings, rights, preferences
Asset                   -- Individual images
Job                     -- Processing pipeline jobs
VisionResult            -- AI vision analysis cache
MetadataResult          -- Generated metadata cache
EmbedResult             -- Verification of embedded files
Export                  -- Export job tracking
GrowthImage             -- Growth/marketing images with governance
  ├── role              -- proof/hero/decorative/stock
  ├── aiGenerated       -- Boolean detection result
  ├── governanceStatus  -- pending/approved/blocked/warning
  └── decisionLog       -- JSON audit trail
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/projects` | GET/POST | List/Create projects |
| `/projects/:id` | PATCH | Update project + governance policy |
| `/projects/:id/enable-startup-mode` | POST | Lock to strict policy |
| `/projects/:id/assets` | GET/POST | List/Upload assets |
| `/assets/:id/process` | POST | Trigger AI pipeline |
| `/exports` | POST | Create export job |
| `/exports/advanced` | POST | Export with presets |
| `/growth/projects/:id/images` | GET | List growth images |
| `/growth/images/:id/role` | PATCH | Update role (retry governance) |
| `/growth/images/:id/recheck-governance` | POST | Re-run governance check |
| `/onboarding/:projectId` | GET/PATCH | Manage profile |

---

# Metadata Specifications

## IPTC Contract Constraints (Tightened v2.1)

| Field | Constraint | Rationale |
|-------|------------|-----------|
| `captionAbstract` | 200-1200 characters | Quality floor, avoid thin content |
| `keywords` | 5-15 keywords, max 24 chars each | SEO sweet spot |
| `headline` | 10-150 characters | Readable, not truncated |
| `credit` | Required | EEAT compliance |
| `copyrightNotice` | Required | Legal protection |

## Spam/Quality Guardrails

Blocked keyword patterns:
- Generic: "photo", "image", "picture", "photography"
- Filler: "beautiful", "amazing", "stunning", "professional"
- SEO spam: "best", "top", "quality", "#1"

## Embed Tier Classification

| Tier | Criteria | Score Range |
|------|----------|-------------|
| **AUTHORITY** | All proof-first + core + evidence fields | 90-100 |
| **EVIDENCE** | Core + some proof fields | 70-89 |
| **BASIC** | Core IPTC only | 40-69 |
| **INCOMPLETE** | Missing critical fields | 0-39 |

## XMP Namespace v2.1

Custom namespace for proof-first fields:
```
xmlns:contextembed="http://contextembed.com/xmp/1.0/"
```

Fields:
- `contextembed:BusinessName`
- `contextembed:JobType` (service-proof, case-study, portfolio, testimonial, before-after)
- `contextembed:ServiceCategory`
- `contextembed:GeoFocus`
- `contextembed:TargetPage`
- `contextembed:PageRole` (money, trust, support, authority)
- `contextembed:AssetId`
- `contextembed:ClusterId`
- `contextembed:EmbedTier`
- `contextembed:ProcessingPipeline`

---

# Governance System

## Visual Authenticity Policy

Protects service businesses from AI-generated image contamination:

### Policy Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| **deny_ai_proof** | AI images blocked for proof roles | Contractors, medical, legal |
| **conditional** | AI proof flagged for review | General business |
| **allow** | All content permitted | Stock, social media |

### Image Roles

| Role | Definition | Governance Impact |
|------|------------|-------------------|
| **proof** | Before/after, completed work, case studies | Strictest checks |
| **hero** | Landing page heroes, banners | Warning for AI |
| **decorative** | Backgrounds, patterns, icons | Generally allowed |
| **stock** | Licensed third-party images | Allowed |

### Startup Mode

For new businesses building authentic portfolios:
- One-click enable via Project Settings
- Locks policy to `deny_ai_proof`
- Cannot be disabled (permanent commitment)
- Shows locked indicator in UI

### Decision Audit Log

Every governance decision is logged:
```json
{
  "ts": "2026-02-06T14:30:00Z",
  "action": "role_change",
  "previousRole": "proof",
  "newRole": "decorative",
  "reason": "User changed to decorative to allow AI image"
}
```

---

# Patent Opportunities

## 1. Context-Aware Image Metadata Synthesis
**Claim**: A method for generating image metadata by combining computer vision analysis with structured user context (event type, location, client information) to produce semantically accurate, search-optimized descriptions.

**Novel Elements**:
- Two-stage AI pipeline (vision → synthesis)
- Context hierarchy (global profile → project → batch → per-image)
- Situational context locking (wedding, portrait, corporate modes)

## 2. AI-Safe Metadata with Intent Preservation
**Claim**: A system for embedding machine-readable intent signals in image metadata to guide AI interpretation and prevent misattribution.

**Novel Elements**:
- `intent.purpose` field (portfolio, commercial, editorial)
- `intent.narrativeRole` for story context
- `eventAnchor` for gallery/project linking

## 3. Metadata Provenance and Verification Chain
**Claim**: A method for creating verifiable metadata provenance using cryptographic hashes to prove metadata authenticity and detect tampering.

**Novel Elements**:
- Source file hash (SHA-256)
- Metadata payload hash
- Processing pipeline signature
- Version tracking
- **Export manifests with per-file checksums**

## 4. Automated EEAT Compliance for Visual Content
**Claim**: A system for automatically generating metadata that satisfies Google's EEAT criteria (Experience, Expertise, Authoritativeness, Trustworthiness) for image search ranking.

**Novel Elements**:
- Creator attribution automation
- Copyright template generation
- License/rights URL linking
- Brand entity linking
- **Proof-first fields establishing business authority**

## 5. Situational Context Lock for Batch Processing
**Claim**: A user interface and processing method that allows photographers to "lock" a situational context (e.g., "wedding", "corporate event") at the batch level, ensuring consistent AI interpretation across multiple images.

## 6. Visual Authenticity Governance (NEW)
**Claim**: A system for classifying and governing the use of AI-generated images in professional photography portfolios based on configurable policies and image role assignments.

**Novel Elements**:
- Policy-based AI image blocking (deny_ai_proof, conditional, allow)
- Image role taxonomy (proof, hero, decorative, stock)
- Startup Mode for permanent strict enforcement
- Decision audit logging with full provenance
- Retry flow for re-governance without re-upload

## 7. Evidence-Backed Metadata Embedding (NEW)
**Claim**: A method for embedding structured evidence fields in image metadata that establish business identity, job context, and website semantic location to prove authenticity and authority.

**Novel Elements**:
- BusinessIdentity fields (name, contact, website)
- JobEvidence fields (type, category, client context)
- SemanticLocation fields (geo focus, target page, page role)
- Continuity fields (session, cluster, sequence)
- IAStructure fields (asset ID, embed tier, pipeline signature)

---

# Market Analysis

## Target Segments

### 1. Professional Photographers ($50-200/month)
- Wedding, portrait, event photographers
- 10,000-50,000 images/year
- Pain: Manual keywording, missed SEO

### 2. Photography Studios ($200-500/month)
- Multi-photographer operations
- 50,000-200,000 images/year
- Pain: Consistency, brand compliance

### 3. Stock Contributors ($100-300/month)
- Getty, Shutterstock, Adobe Stock sellers
- Keyword optimization critical for sales
- Pain: Rejection due to poor metadata

### 4. Service Businesses ($100-400/month) — NEW SEGMENT
- Contractors, home services, medical, legal
- Proof-of-work photography critical
- Pain: AI image contamination, trust erosion
- **Key Feature**: Governance + Startup Mode

### 5. Enterprise/Agencies ($500-2000/month)
- Marketing agencies, e-commerce
- 200,000+ images/year
- Pain: DAM integration, compliance

## Competitive Landscape

| Competitor | Weakness | ContextEmbed Advantage |
|------------|----------|------------------------|
| **Adobe Lightroom AI** | Generic tags, no context | Context-aware, IPTC-complete |
| **Excire** | Desktop-only, no embedding | Cloud SaaS, full pipeline |
| **ImagenAI** | Editing focus, not metadata | Metadata-first architecture |
| **Peakto** | Catalog only, no writing | Full embed to file |
| **Manual Entry** | 3-5 min/image | < 10 sec/image |
| **None** | No AI governance | **Visual authenticity policies** |

## Pricing Strategy

| Tier | Price | Images/month | Features |
|------|-------|--------------|----------|
| **Starter** | $29/mo | 500 | Core AI, 2 projects |
| **Pro** | $79/mo | 2,500 | All presets, API access, Governance |
| **Studio** | $199/mo | 10,000 | Multi-user, priority, Startup Mode |
| **Enterprise** | Custom | Unlimited | SSO, DAM integration, SLA |

---

# Marketing Messaging

## Taglines
- **"Your images deserve to be found."**
- **"AI metadata that speaks Google's language."**
- **"From invisible to irresistible — in seconds."**
- **"The metadata your images are missing."**
- **"Prove your work is real."** (NEW — Governance)

## Value Propositions

### For Wedding Photographers
> "Stop spending hours keywording wedding galleries. ContextEmbed understands 'bride preparation' vs. 'ceremony' vs. 'reception' and generates perfect metadata for every moment."

### For Stock Contributors
> "Rejected for incomplete metadata? ContextEmbed generates the 5-15 keyword sweet spot that Getty and Shutterstock algorithms love."

### For SEO-Focused Photographers
> "Your portfolio is invisible to Google because your images can't speak. ContextEmbed gives them a voice that AI search engines understand."

### For Service Businesses (NEW)
> "Your before/after photos prove your work is real. ContextEmbed's Startup Mode ensures AI-generated fakes never contaminate your portfolio. Build trust, not doubt."

### For Contractors & Home Services (NEW)
> "Clients want proof you did the work. ContextEmbed embeds your business identity, job context, and location directly into every photo — impossible to fake, easy to verify."

## Key Stats for Marketing
- ⏱️ **300x faster** than manual keywording
- 📊 **50+ fields** populated per image (including proof-first)
- 🎯 **95% accuracy** on headlines/descriptions
- 🔍 **AEO-ready** for AI search engines
- ✅ **IPTC/XMP compliant** — works with Lightroom, Capture One, PhotoMechanic
- 🛡️ **Governance-protected** — block AI-generated proof images
- 📋 **Audit-logged** — full decision history for compliance

---

# Survival Lab

## Overview
**Survival Lab** is ContextEmbed's metadata preservation testing engine. It lets photographers empirically measure what happens to their embedded metadata after files pass through real-world platforms — CMS, social media, cloud storage, CDNs, and local export tools.

## Two Modes

### Free-Form Runs
Create a test run for any platform, attach CE-embedded baselines, upload re-downloaded files, and compare. Full flexibility — no prescribed order.

### Guided Study Mode (Foundation Study)
A step-by-step wizard that walks the user through a structured testing protocol:

| Step | Purpose | Scenario Types |
|------|---------|---------------|
| **BASELINE_LOCK** | Select 1–3 verified baselines | — |
| **LOCAL_EXPORT** | Re-save locally and compare | `LOCAL_EXPORT` |
| **CDN_DERIVATIVE** | Test CDN-generated variants | `CDN_DERIVATIVE` |
| **CLOUD_STORAGE** | Google Drive, Dropbox round-trips | `CLOUD_GOOGLE_DRIVE`, `CLOUD_DROPBOX` |
| **CMS** | WordPress (original + thumb), Squarespace, Wix, Webflow, Shopify | `CMS_WP_ORIGINAL`, `CMS_WP_THUMB`, `CMS_SQUARESPACE`, `CMS_WIX`, `CMS_WEBFLOW`, `CMS_SHOPIFY` |
| **SOCIAL** | Instagram, Facebook, LinkedIn | `SOCIAL_INSTAGRAM`, `SOCIAL_FACEBOOK`, `SOCIAL_LINKEDIN` |
| **SUMMARY** | Aggregated results review | — |
| **EVIDENCE_PACK** | Generate downloadable ZIP archive | — |

Steps enforce forward-only advancement. Sessions persist across browser refreshes via URL query parameter.

## Key Concepts

- **Canonical Diff Engine** — Field-by-field metadata comparison between baseline and scenario, producing a structured diff with `added`, `removed`, `changed`, and `retained` categories.
- **Survival Classifier v2** — Weighted scoring system (scoreV2) mapping containers to classes: PRISTINE (≥95), SAFE (≥75), DEGRADED (≥50), HOSTILE (≥25), DESTRUCTIVE (<25).
- **Evidence Pack** — ZIP archive containing baselines, scenario files, comparison reports, CSV summary, and a README, stored in Supabase Storage with a signed download URL.
- **Auto-Run Management** — Guided mode transparently creates test runs per platform, so the user never manually manages run objects.

## Data Model

- **SurvivalStudySession** — Tracks session state (userId, title, status, currentStep, baselineIds[], platformSlugs[])
- **SurvivalTestRun** — Optionally linked to a session via `studySessionId`
- **SurvivalScenarioUpload** — Carries `scenarioType` label and optional `studySessionId`

## API Endpoints (Guided Mode)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/survival/study/start` | Create session |
| GET | `/survival/study` | List sessions |
| GET | `/survival/study/:id` | Session detail |
| POST | `/survival/study/:id/advance` | Advance step |
| POST | `/survival/study/:id/attach-baselines` | Lock baselines |
| POST | `/survival/study/:id/attach-platforms` | Set platforms |
| POST | `/survival/study/:id/evidence-pack` | Generate ZIP |
| POST | `/survival/study/:id/ensure-run` | Auto-create/find run |

---

# Roadmap

## Q1 2026 (Current) ✅
- ✅ Core AI pipeline (Vision + Synthesis)
- ✅ Full IPTC/XMP embedding
- ✅ Export presets system
- ✅ Quality dashboard
- ✅ **Proof-first metadata fields**
- ✅ **Visual authenticity governance**
- ✅ **Health scoring & embed tiers**
- ✅ **Manifest generation with checksums**

## Q2 2026
- 🔲 Lightroom Classic plugin
- 🔲 Capture One integration
- 🔲 Batch re-processing
- 🔲 Custom vocabulary training
- 🔲 **Electron desktop app** (offline processing)

## Q3 2026
- 🔲 Face recognition (optional)
- 🔲 DAM integrations (Canto, Bynder)
- 🔲 API for developers
- 🔲 White-label solution
- 🔲 **AI detection integration** (Hive, Illuminarty)

## Q4 2026
- 🔲 Video metadata support
- 🔲 AI-powered alt-text for accessibility
- 🔲 Multi-language metadata
- 🔲 Enterprise SSO/SAML
- 🔲 **Blockchain provenance anchoring**

---

# Appendix: Technical Specifications

## Supported File Formats
- **Input**: JPEG, PNG, TIFF, HEIC, WebP
- **Output**: JPEG (50-100%), TIFF (16-bit), PNG, Original format

## Metadata Standards
- **IPTC Core 1.3** (IIM 4.2)
- **IPTC Extension 1.5**
- **XMP 1.0** (Dublin Core, IPTC4XMP)
- **Exif 2.32**
- **XMP-contextembed v2.1** (Custom namespace)

## AI Models
- **Vision**: OpenAI GPT-4 Vision (gpt-4-vision-preview)
- **Synthesis**: OpenAI GPT-4 Turbo (gpt-4-turbo-preview)
- **Token Budget**: ~2000 tokens per image

## Export Manifest Format
```json
{
  "version": "1.0.0",
  "generated": "2026-02-06T14:30:00Z",
  "exportId": "exp_abc123",
  "projectId": "proj_xyz789",
  "totalAssets": 50,
  "healthReport": {
    "averageScore": 87,
    "tierBreakdown": {
      "AUTHORITY": 35,
      "EVIDENCE": 12,
      "BASIC": 3,
      "INCOMPLETE": 0
    }
  },
  "assets": [
    {
      "filename": "wedding_001.jpg",
      "sha256": "a1b2c3...",
      "embedTier": "AUTHORITY",
      "healthScore": 94,
      "fieldsPresent": ["headline", "caption", "keywords", "businessName", "jobType"]
    }
  ]
}
```

## Security
- End-to-end HTTPS
- Supabase Row-Level Security
- Images processed in-memory (not stored in AI)
- GDPR-compliant (EU data residency option)
- **Governance audit logs** for compliance

## Deployment
- **Frontend**: Vercel (Next.js optimized)
- **API**: Railway (Docker, persistent volumes, ExifTool)
- **Database**: Supabase PostgreSQL
- **Desktop**: Electron (planned Q2 2026)

---

**© 2026 ContextEmbed. All rights reserved.**

*This document contains confidential and proprietary information.*
*Version 2.1 — Evidence-Backed Authority Metadata*
