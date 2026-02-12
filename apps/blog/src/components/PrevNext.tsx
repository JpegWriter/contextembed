import Link from 'next/link';
import type { Post } from '@/lib/types';

interface PrevNextProps {
  prev: Post | null;
  next: Post | null;
}

export function PrevNext({ prev, next }: PrevNextProps) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-10 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/blog/${prev.slug}`}
          className="group rounded-md border border-border p-4 hover:border-accent/50 transition-colors"
        >
          <p className="text-xs text-fg-muted mb-1">&larr; Previous</p>
          <p className="text-sm font-semibold text-fg group-hover:text-accent transition-colors line-clamp-2">
            {prev.frontmatter.title}
          </p>
        </Link>
      ) : (
        <div />
      )}
      {next && (
        <Link
          href={`/blog/${next.slug}`}
          className="group rounded-md border border-border p-4 text-right hover:border-accent/50 transition-colors"
        >
          <p className="text-xs text-fg-muted mb-1">Next &rarr;</p>
          <p className="text-sm font-semibold text-fg group-hover:text-accent transition-colors line-clamp-2">
            {next.frontmatter.title}
          </p>
        </Link>
      )}
    </nav>
  );
}
