import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllTags, getPostsByTag } from '@/lib/content';
import { PostCard } from '@/components/PostCard';
import Link from 'next/link';

interface Props {
  params: { tag: string };
}

export function generateStaticParams() {
  return getAllTags().map((t) => ({ tag: t.tag }));
}

export function generateMetadata({ params }: Props): Metadata {
  return {
    title: `#${params.tag}`,
    description: `All posts tagged "${params.tag}".`,
  };
}

export default function TagPage({ params }: Props) {
  const posts = getPostsByTag(params.tag);
  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <Link href="/blog" className="text-xs text-fg-muted hover:text-fg transition-colors">
          &larr; All posts
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-fg">#{params.tag}</h1>
        <p className="mt-2 text-fg-muted">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </p>
      </div>

      <div className="divide-y divide-border">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
