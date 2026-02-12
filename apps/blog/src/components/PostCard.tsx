import Link from 'next/link';
import type { Post } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { DraftBadge } from './DraftBadge';

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="group border-b border-border py-8 first:pt-0 last:border-b-0">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-fg group-hover:text-accent transition-colors">
              {post.frontmatter.title}
            </h2>
            <p className="mt-1.5 text-sm text-fg-muted line-clamp-2">
              {post.frontmatter.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
              <time dateTime={post.frontmatter.date}>
                {formatDate(post.frontmatter.date)}
              </time>
              <span>{post.readingTime}</span>
              {post.frontmatter.series && (
                <span className="rounded bg-bg-secondary px-2 py-0.5">
                  {post.frontmatter.series}
                </span>
              )}
            </div>
          </div>
          {post.frontmatter.draft && <DraftBadge />}
        </div>
      </Link>
      {post.frontmatter.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.frontmatter.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag.toLowerCase()}`}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted hover:border-accent hover:text-accent transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
