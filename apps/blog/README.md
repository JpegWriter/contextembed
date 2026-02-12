# ContextEmbed Blog

A statically-generated blog built with **Next.js 14**, **MDX** and **Tailwind CSS**.  
Content lives in local `.mdx` files under `content/`.

## Quick start

```bash
# From the monorepo root
pnpm install
pnpm --filter blog dev        # http://localhost:3100
```

## Project structure

```
apps/blog/
├── content/
│   ├── blog/          ← 24 blog posts (MDX)
│   └── pillars/       ← 6 pillar pages (MDX)
├── scripts/
│   ├── new-post.ts    ← CLI: create a new blog post
│   └── new-pillar.ts  ← CLI: create a new pillar page
├── src/
│   ├── app/           ← Next.js App Router pages
│   ├── components/    ← React components
│   └── lib/           ← Content pipeline, MDX renderer, utilities
├── next.config.js
├── tailwind.config.js
└── package.json
```

## Routes

| Route | Description |
|-------|-------------|
| `/blog` | Blog index — all published posts |
| `/blog/[slug]` | Individual blog post with TOC, series nav, related posts |
| `/pillars` | Pillar index — foundational guides |
| `/pillars/[slug]` | Pillar page with cluster post links |
| `/tags/[tag]` | Posts filtered by tag |
| `/series/[series]` | Posts filtered by series |
| `/studio` | Draft dashboard (hidden from robots) |
| `/rss.xml` | RSS feed |
| `/sitemap.xml` | Auto-generated sitemap |

## Creating content

### New blog post

```bash
pnpm --filter blog new:post "My Post Title"
```

Creates `content/blog/my-post-title.mdx` with frontmatter template.

### New pillar page

```bash
pnpm --filter blog new:pillar "My Pillar Title"
```

Creates `content/pillars/my-pillar-title.mdx` with frontmatter template.

## Frontmatter

### Blog post

```yaml
---
title: "Post Title"
description: "A short description for SEO and cards."
date: "2026-01-15"
updated: "2026-01-20"          # optional
tags: ["metadata", "seo"]
pillar: "authorship-integrity"  # slug of parent pillar
series: "my-series"             # optional
draft: true                     # hidden in production
canonical: "https://..."        # optional
---
```

### Pillar page

```yaml
---
title: "Pillar Title"
description: "A short description."
date: "2026-01-15"
tags: ["metadata"]
draft: true
---
```

## Draft system

- In development (`NODE_ENV !== 'production'`), all posts are visible including drafts.
- In production (`next build`), posts with `draft: true` are excluded from every listing, feed and sitemap.
- The `/studio` page lists all drafts with their file paths for easy editing.

## SEO

- Dynamic `<title>` and `<meta>` tags via Next.js Metadata API
- OpenGraph and Twitter Card meta tags
- Article JSON-LD structured data on every post/pillar page
- Auto-generated `sitemap.xml` with all published content
- `robots.txt` blocking `/studio`
- RSS feed at `/rss.xml`

## Content pipeline

1. MDX files are read from disk using `gray-matter` for frontmatter parsing
2. Reading time is calculated with the `reading-time` package
3. Headings are extracted via regex for the table of contents
4. Content is rendered server-side using `next-mdx-remote/rsc`
5. Syntax highlighting is provided by `rehype-pretty-code` + `shiki`
6. Heading anchors are added by `rehype-slug` + `rehype-autolink-headings`
7. GFM (tables, strikethrough) is enabled by `remark-gfm`

## Tech stack

- **Next.js 14** — App Router, static generation
- **TypeScript** — strict mode
- **Tailwind CSS** — with `@tailwindcss/typography` for prose styling
- **next-mdx-remote** — RSC-compatible MDX rendering
- **gray-matter** — frontmatter parsing
- **reading-time** — estimated read time
- **rss** — RSS feed generation
- **shiki** — syntax highlighting
