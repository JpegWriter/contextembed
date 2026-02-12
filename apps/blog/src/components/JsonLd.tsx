import type { Post, Pillar } from '@/lib/types';
import { SITE } from '@/lib/utils';

export function ArticleJsonLd({
  post,
  type = 'BlogPosting',
}: {
  post: Post | Pillar;
  type?: 'BlogPosting' | 'Article';
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': type,
    headline: post.frontmatter.title,
    description: post.frontmatter.description,
    datePublished: post.frontmatter.date,
    dateModified: ('updated' in post.frontmatter && post.frontmatter.updated) || post.frontmatter.date,
    author: {
      '@type': 'Organization',
      name: SITE.author,
      url: SITE.url,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.author,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE.url}/blog/${post.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
