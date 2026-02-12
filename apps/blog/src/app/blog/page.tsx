import type { Metadata } from 'next';
import { getAllPosts, getAllTags } from '@/lib/content';
import { PostCard } from '@/components/PostCard';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Articles on image metadata, authorship integrity, and AI-ready publishing.',
};

export default function BlogIndex() {
  const posts = getAllPosts();
  const tags = getAllTags();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-fg">Blog</h1>
        <p className="mt-2 text-fg-muted">
          {posts.length} {posts.length === 1 ? 'article' : 'articles'} on image metadata,
          authorship, and AI-ready publishing.
        </p>
      </div>

      {tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {tags.slice(0, 15).map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="rounded-full border border-border px-3 py-1 text-xs text-fg-muted hover:border-accent hover:text-accent transition-colors"
            >
              {tag} ({count})
            </Link>
          ))}
        </div>
      )}

      <div className="divide-y divide-border">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      {posts.length === 0 && (
        <p className="py-20 text-center text-fg-muted">
          No published posts yet. Run <code>npm run new:post &quot;Title&quot;</code> to create one.
        </p>
      )}
    </div>
  );
}
