import RSS from 'rss';
import { getAllPosts } from '@/lib/content';
import { SITE } from '@/lib/utils';

export async function GET() {
  const posts = getAllPosts();

  const feed = new RSS({
    title: SITE.name,
    description: SITE.description,
    site_url: SITE.url,
    feed_url: `${SITE.url}/rss.xml`,
    language: 'en',
    pubDate: posts[0]?.frontmatter.date,
    copyright: `© ${new Date().getFullYear()} ${SITE.author}`,
  });

  for (const post of posts) {
    feed.item({
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url: `${SITE.url}/blog/${post.slug}`,
      date: post.frontmatter.date,
      categories: post.frontmatter.tags,
    });
  }

  return new Response(feed.xml({ indent: true }), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
