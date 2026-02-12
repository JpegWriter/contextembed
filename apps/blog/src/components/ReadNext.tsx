import Link from 'next/link';
import type { Post, Pillar } from '@/lib/types';

interface ReadNextProps {
  pillar: Pillar | null;
  related: Post | null;
}

export function ReadNext({ pillar, related }: ReadNextProps) {
  if (!pillar && !related) return null;

  return (
    <section className="mt-12 rounded-lg border border-border p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fg-muted">
        Read next
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {pillar && (
          <Link
            href={`/pillars/${pillar.slug}`}
            className="group rounded-md border border-border p-4 hover:border-accent/50 transition-colors"
          >
            <p className="text-xs font-medium text-accent mb-1">Pillar</p>
            <p className="text-sm font-semibold text-fg group-hover:text-accent transition-colors">
              {pillar.frontmatter.title}
            </p>
          </Link>
        )}
        {related && (
          <Link
            href={`/blog/${related.slug}`}
            className="group rounded-md border border-border p-4 hover:border-accent/50 transition-colors"
          >
            <p className="text-xs font-medium text-fg-muted mb-1">Related</p>
            <p className="text-sm font-semibold text-fg group-hover:text-accent transition-colors">
              {related.frontmatter.title}
            </p>
          </Link>
        )}
      </div>
    </section>
  );
}
