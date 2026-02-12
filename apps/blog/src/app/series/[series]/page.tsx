import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllSeries, getPostsBySeries } from '@/lib/content';
import { PostCard } from '@/components/PostCard';
import Link from 'next/link';

interface Props {
  params: { series: string };
}

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ series: s.name }));
}

export function generateMetadata({ params }: Props): Metadata {
  const name = decodeURIComponent(params.series);
  return {
    title: `Series: ${name}`,
    description: `All posts in the "${name}" series.`,
  };
}

export default function SeriesPage({ params }: Props) {
  const name = decodeURIComponent(params.series);
  const posts = getPostsBySeries(name);
  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <Link href="/blog" className="text-xs text-fg-muted hover:text-fg transition-colors">
          &larr; All posts
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-fg">Series: {name}</h1>
        <p className="mt-2 text-fg-muted">
          {posts.length} {posts.length === 1 ? 'part' : 'parts'}
        </p>
      </div>

      <div className="divide-y divide-border">
        {posts.map((post, i) => (
          <div key={post.slug} className="flex gap-4 items-start">
            <span className="mt-8 text-2xl font-bold text-border tabular-nums">{i + 1}</span>
            <div className="flex-1">
              <PostCard post={post} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
