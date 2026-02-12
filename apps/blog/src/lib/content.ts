import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { Post, Pillar, PostFrontmatter, PillarFrontmatter, Heading } from './types';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const PILLAR_DIR = path.join(process.cwd(), 'content', 'pillars');

function extractHeadings(content: string): Heading[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const headings: Heading[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[2].trim();
    headings.push({
      depth: match[1].length,
      text,
      slug: text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-'),
    });
  }

  return headings;
}

function isPublished(draft: boolean): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return !draft;
}

// ── Blog Posts ──

function getMdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));
}

export function getAllPosts(): Post[] {
  const files = getMdxFiles(BLOG_DIR);

  const posts = files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, '');
      const filePath = path.join(BLOG_DIR, filename);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(fileContent);
      const frontmatter = data as PostFrontmatter;

      if (!isPublished(frontmatter.draft)) return null;

      return {
        slug,
        frontmatter,
        content,
        readingTime: readingTime(content).text,
        headings: extractHeadings(content),
      };
    })
    .filter(Boolean) as Post[];

  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  );
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);
  const frontmatter = data as PostFrontmatter;

  if (!isPublished(frontmatter.draft)) return null;

  return {
    slug,
    frontmatter,
    content,
    readingTime: readingTime(content).text,
    headings: extractHeadings(content),
  };
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((p) =>
    p.frontmatter.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

export function getPostsByPillar(pillarSlug: string): Post[] {
  return getAllPosts().filter((p) => p.frontmatter.pillar === pillarSlug);
}

export function getPostsBySeries(series: string): Post[] {
  return getAllPosts()
    .filter((p) => p.frontmatter.series === series)
    .sort(
      (a, b) =>
        new Date(a.frontmatter.date).getTime() -
        new Date(b.frontmatter.date).getTime()
    );
}

export function getAllTags(): { tag: string; count: number }[] {
  const tagMap = new Map<string, number>();
  getAllPosts().forEach((post) => {
    post.frontmatter.tags.forEach((tag) => {
      const lower = tag.toLowerCase();
      tagMap.set(lower, (tagMap.get(lower) ?? 0) + 1);
    });
  });
  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getAllSeries(): { name: string; count: number }[] {
  const seriesMap = new Map<string, number>();
  getAllPosts().forEach((post) => {
    if (post.frontmatter.series) {
      const s = post.frontmatter.series;
      seriesMap.set(s, (seriesMap.get(s) ?? 0) + 1);
    }
  });
  return Array.from(seriesMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getRelatedPost(current: Post): Post | null {
  const all = getAllPosts().filter((p) => p.slug !== current.slug);
  // Same pillar, earlier date
  const samePillar = all.filter(
    (p) =>
      p.frontmatter.pillar === current.frontmatter.pillar &&
      new Date(p.frontmatter.date) < new Date(current.frontmatter.date)
  );
  if (samePillar.length > 0) return samePillar[0];
  // Fallback: any shared tag
  const sharedTag = all.filter((p) =>
    p.frontmatter.tags.some((t) => current.frontmatter.tags.includes(t))
  );
  return sharedTag[0] ?? null;
}

export function getPrevNextPosts(slug: string): { prev: Post | null; next: Post | null } {
  const posts = getAllPosts();
  const index = posts.findIndex((p) => p.slug === slug);
  return {
    prev: index < posts.length - 1 ? posts[index + 1] : null,
    next: index > 0 ? posts[index - 1] : null,
  };
}

// ── Pillars ──

export function getAllPillars(): Pillar[] {
  const files = getMdxFiles(PILLAR_DIR);

  const pillars = files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, '');
      const filePath = path.join(PILLAR_DIR, filename);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(fileContent);
      const frontmatter = data as PillarFrontmatter;

      if (!isPublished(frontmatter.draft)) return null;

      return {
        slug,
        frontmatter,
        content,
        readingTime: readingTime(content).text,
        headings: extractHeadings(content),
      };
    })
    .filter(Boolean) as Pillar[];

  return pillars.sort(
    (a, b) =>
      new Date(a.frontmatter.date).getTime() -
      new Date(b.frontmatter.date).getTime()
  );
}

export function getPillarBySlug(slug: string): Pillar | null {
  const filePath = path.join(PILLAR_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);
  const frontmatter = data as PillarFrontmatter;

  if (!isPublished(frontmatter.draft)) return null;

  return {
    slug,
    frontmatter,
    content,
    readingTime: readingTime(content).text,
    headings: extractHeadings(content),
  };
}

// ── Drafts (for /studio) ──

export function getAllDrafts(): Array<{ type: 'post' | 'pillar'; slug: string; title: string; filePath: string }> {
  const drafts: Array<{ type: 'post' | 'pillar'; slug: string; title: string; filePath: string }> = [];

  if (fs.existsSync(BLOG_DIR)) {
    getMdxFiles(BLOG_DIR).forEach((filename) => {
      const filePath = path.join(BLOG_DIR, filename);
      const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
      if (data.draft) {
        drafts.push({
          type: 'post',
          slug: filename.replace(/\.mdx$/, ''),
          title: data.title,
          filePath: `content/blog/${filename}`,
        });
      }
    });
  }

  if (fs.existsSync(PILLAR_DIR)) {
    getMdxFiles(PILLAR_DIR).forEach((filename) => {
      const filePath = path.join(PILLAR_DIR, filename);
      const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
      if (data.draft) {
        drafts.push({
          type: 'pillar',
          slug: filename.replace(/\.mdx$/, ''),
          title: data.title,
          filePath: `content/pillars/${filename}`,
        });
      }
    });
  }

  return drafts.sort((a, b) => a.title.localeCompare(b.title));
}
