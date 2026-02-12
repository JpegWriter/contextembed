#!/usr/bin/env tsx
/**
 * Create a new blog post.
 * Usage: npm run new:post "My Post Title"
 */

import fs from 'node:fs';
import path from 'node:path';

const title = process.argv[2];
if (!title) {
  console.error('Usage: npm run new:post "My Post Title"');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const today = new Date().toISOString().split('T')[0];

const content = `---
title: "${title}"
description: ""
date: "${today}"
tags: []
pillar: ""
series: ""
draft: true
---

Start writing here.
`;

const dir = path.join(process.cwd(), 'content', 'blog');
fs.mkdirSync(dir, { recursive: true });

const filePath = path.join(dir, `${slug}.mdx`);

if (fs.existsSync(filePath)) {
  console.error(`File already exists: ${filePath}`);
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log(`✓ Created ${path.relative(process.cwd(), filePath)}`);
