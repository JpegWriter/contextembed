import type { MetadataRoute } from 'next';
import { getAllPosts, getAllPillars, getAllTags } from '@/lib/content';
import { SITE } from '@/lib/utils';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const pillars = getAllPillars();
  const tags = getAllTags();

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE.url}/blog/${p.slug}`,
    lastModified: p.frontmatter.updated ?? p.frontmatter.date,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const pillarEntries: MetadataRoute.Sitemap = pillars.map((p) => ({
    url: `${SITE.url}/pillars/${p.slug}`,
    lastModified: p.frontmatter.updated ?? p.frontmatter.date,
    changeFrequency: 'monthly',
    priority: 0.9,
  }));

  const tagEntries: MetadataRoute.Sitemap = tags.map((t) => ({
    url: `${SITE.url}/tags/${t.tag}`,
    changeFrequency: 'weekly' as const,
    priority: 0.4,
  }));

  return [
    {
      url: SITE.url,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE.url}/blog`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE.url}/pillars`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...pillarEntries,
    ...postEntries,
    ...tagEntries,
  ];
}
