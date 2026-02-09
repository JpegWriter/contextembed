# ContextEmbed v2

A context-driven metadata embedding tool for images. Upload images, let AI analyze them, and automatically generate SEO-friendly IPTC/EXIF/XMP metadata tailored to your brand.

## Features

- 🔍 **Vision Analysis** - GPT-4o analyzes your images to understand subjects, colors, composition
- 🎯 **Smart Synthesis** - Your brand context is merged with vision insights to create professional metadata
- 📝 **IPTC/EXIF Embedding** - Metadata is written directly into files using industry standards
- 🌐 **Web App** - Upload and process images from any browser
- 🔐 **Secure** - Supabase authentication with project-level isolation

## Prerequisites

- Node.js 20+
- pnpm 8.14+
- PostgreSQL database (Supabase recommended)
- ExifTool installed on your system
- OpenAI API key

### Installing ExifTool

**Windows:**
```powershell
# Using Chocolatey
choco install exiftool

# Or download from https://exiftool.org/
```

**macOS:**
```bash
brew install exiftool
```

**Linux:**
```bash
sudo apt-get install libimage-exiftool-perl
```

## Quick Start

### 1. Clone and Install

```bash
git clone <repository>
cd ContextEmbed
pnpm install
```

### 2. Configure Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection (for Prisma)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - Your OpenAI API key

### 3. Setup Database

```bash
cd packages/db
pnpm prisma generate
pnpm prisma db push
```

### 4. Start Development

```bash
# From root directory
pnpm dev
```

This starts:
- API server at http://localhost:3001
- Web app at http://localhost:3000

## Project Structure

```
ContextEmbed/
├── apps/
│   ├── api/          # Express API server
│   └── web/          # Next.js web application
├── packages/
│   ├── core/         # Shared types, schemas, pipeline
│   ├── db/           # Prisma schema & repositories
│   ├── metadata/     # ExifTool writer
│   └── providers/    # AI provider implementations
└── package.json      # Root monorepo config
```

## Architecture

### Pipeline Flow

1. **Upload** - Images are uploaded and stored
2. **Preprocess** - Thumbnails and analysis images are generated
3. **Vision Analysis** - GPT-4o analyzes the image content
4. **Metadata Synthesis** - AI generates metadata using vision + brand context
5. **Embedding** - ExifTool writes metadata to file copy
6. **Export** - Download embedded files as ZIP

### Packages

- **@contextembed/core** - Platform-agnostic types, interfaces, and pipeline logic
- **@contextembed/providers** - AI provider implementations (OpenAI)
- **@contextembed/metadata** - ExifTool integration for reading/writing metadata
- **@contextembed/db** - Prisma client and repository layer

## API Endpoints

### Authentication
- `GET /auth/me` - Get current user
- `PATCH /auth/me` - Update user profile

### Projects
- `GET /projects` - List user's projects
- `POST /projects` - Create new project
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Onboarding
- `POST /onboarding/:projectId/init` - Initialize onboarding profile
- `GET /onboarding/:projectId` - Get profile
- `POST /onboarding/:projectId/audit-url` - Audit website for context
- `PATCH /onboarding/:projectId/context` - Update business context
- `PATCH /onboarding/:projectId/rights` - Update rights info
- `PATCH /onboarding/:projectId/preferences` - Update preferences
- `POST /onboarding/:projectId/complete` - Complete onboarding

### Assets
- `GET /assets/project/:projectId` - List project assets
- `GET /assets/:id` - Get asset with results
- `POST /assets/upload/:projectId` - Upload files
- `PATCH /assets/:id` - Update asset
- `DELETE /assets/:id` - Delete asset
- `POST /assets/process` - Start processing jobs
- `GET /assets/:id/file/:type` - Get asset file

### Jobs
- `GET /jobs/project/:projectId` - List project jobs
- `GET /jobs/:id` - Get job details
- `POST /jobs/:id/cancel` - Cancel job
- `POST /jobs/:id/retry` - Retry failed job
- `GET /jobs/project/:projectId/stats` - Get job statistics

### Exports
- `GET /exports/project/:projectId` - List exports
- `POST /exports` - Create export
- `GET /exports/:id/download` - Download export ZIP

## Development

### Commands

```bash
# Install dependencies
pnpm install

# Start all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint

# Database commands
cd packages/db
pnpm prisma generate  # Generate client
pnpm prisma db push   # Push schema to database
pnpm prisma studio    # Open Prisma Studio
```

### Adding a New Provider

1. Create provider class implementing `IVisionProvider` or `ILLMProvider`
2. Add to factory in `packages/providers/src/factory.ts`
3. Update config types if needed

## Testing

```bash
# Run all tests
pnpm test

# Test specific package
pnpm --filter @contextembed/core test
```

## Deployment

### API Server

The API can be deployed to any Node.js hosting:
- Railway
- Render
- AWS ECS
- Google Cloud Run

Ensure ExifTool is installed in your container.

### Web App

The Next.js app can be deployed to:
- Vercel (recommended)
- Netlify
- Any Node.js host

## License

MIT

---

## IA Content OS

ContextEmbed includes a built-in Information Architecture (IA) Content OS for managing site structure, content calendars, and internal linking strategies.

### Features

- 📊 **IA Plan Management** - Import and validate JSON-based IA plans
- 📅 **12-Month Content Calendar** - Weekly content scheduling with themes
- 🔗 **Internal Link Rules** - Enforce linking requirements between pages
- 📈 **Coverage Score** - Automated scoring of IA completeness
- ⚠️ **Brand Mention Policies** - Track and limit brand mentions (e.g., Adobe)
- 📤 **CSV Export** - Export calendar, pages, and rules to CSV

### IA Plan Structure

The IA plan is stored in `/data/ia/contextembed_ia_plan_v1.json` and includes:

- **Product Positioning** - One-liner, differentiators, guardrails
- **Page Roles** - Money, Pillar, Trust, Support, Case Study, Release
- **Site Map** - All pages organized by role with internal links
- **Content Calendar** - 12 months of scheduled content
- **Brand Mention Strategy** - Rules for mentioning other brands

### How to Import a Plan

1. **Place your plan file** at `/data/ia/contextembed_ia_plan_v1.json`

2. **Start the app**:
   ```bash
   pnpm dev
   ```

3. **Navigate to the Admin UI**: http://localhost:3002/admin/ia

4. **Validate the plan** - Click "Validate Plan" to check for errors

5. **Import to database** - Click "Import to Database" to persist the plan

### Admin Routes

| Route | Description |
|-------|-------------|
| `/admin/ia` | Overview with stats, coverage score, and import controls |
| `/admin/ia/pages` | List and edit all IA pages |
| `/admin/ia/calendar` | Month-by-month calendar view with filters |
| `/admin/ia/link-rules` | View global and page-specific link rules |

### Public Routes

| Route | Description |
|-------|-------------|
| `/sitemap-ia` | Human-readable sitemap grouped by page role |
| `/content-calendar` | Public preview of the 12-month content schedule |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/ia` | GET | Get current plan status and stats |
| `/admin/ia/validate` | POST | Full validation with suggestions |
| `/admin/ia/import` | POST | Import plan from file to database |
| `/admin/ia/pages` | GET | List all pages (with filters) |
| `/admin/ia/pages/:id` | GET/PUT | Get or update a page |
| `/admin/ia/calendar` | GET | List calendar items (with filters) |
| `/admin/ia/calendar/:id` | PUT | Update a calendar item |
| `/admin/ia/link-rules` | GET | List internal link rules |
| `/admin/ia/mentions-policies` | GET | List brand mention policies |
| `/admin/ia/export/calendar` | GET | Download calendar as CSV |
| `/admin/ia/export/pages` | GET | Download pages as CSV |
| `/admin/ia/export/link-rules` | GET | Download link rules as CSV |
| `/admin/ia/sitemap` | GET | Get sitemap entries as JSON |

### IA Validation Rules

The validator checks:

1. **Schema Validation** - All required fields present and correctly typed
2. **Broken Slugs** - All internal link references point to existing pages
3. **Pillar Coverage** - Each pillar has 5+ supporting topics
4. **Money Page Links** - Money pages have adequate inbound links planned
5. **Adobe Mentions** - No more than 1 title per month mentions Adobe
6. **Calendar Cadence** - Each month has the expected number of items

### Coverage Score

The IA Coverage Score (0-100) is calculated based on:

| Factor | Points |
|--------|--------|
| 3+ pillars defined | 20 |
| 5+ topics per pillar | 20 |
| 12 months of calendar | 20 |
| No broken internal links | 20 |
| 3+ trust pages linked | 10 |
| No Adobe violations | 10 |

### Page Roles

| Role | Description |
|------|-------------|
| `money` | Primary conversion pages (pricing, use-cases, downloads) |
| `pillar` | Cornerstone authority hubs defining topic clusters |
| `support` | How-to guides, comparisons, FAQs, templates |
| `trust` | About, security, compliance, methodology pages |
| `caseStudy` | Real workflows with before/after examples |
| `release` | Changelog and product updates |

### Content Calendar Types

Each calendar item has a type matching the weekly pattern:

- Week 1: `money` - Product-focused content
- Week 2: `support` - Educational how-to
- Week 3: `support` - More educational content
- Week 4: `trust_or_release` - Trust content or changelog

### Editing the Plan

To modify the IA plan:

1. **Edit the JSON file** directly at `/data/ia/contextembed_ia_plan_v1.json`
2. **Validate** in the admin UI to check for errors
3. **Re-import** to update the database

Or use the admin UI to edit individual pages and calendar items (changes are saved to the database, not the JSON file).

### Extending the Schema

The Zod schema is defined in `/packages/core/src/ia/planSchema.ts`. To add new fields:

1. Update the Zod schema
2. Update the Prisma schema in `/packages/db/prisma/schema.prisma`
3. Run `pnpm prisma generate` and `pnpm prisma db push`
4. Update the importer in `/packages/core/src/ia/importer.ts`
