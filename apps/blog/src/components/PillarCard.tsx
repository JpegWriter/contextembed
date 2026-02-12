import Link from 'next/link';
import type { Pillar } from '@/lib/types';
import { DraftBadge } from './DraftBadge';

export function PillarCard({ pillar, postCount }: { pillar: Pillar; postCount: number }) {
  return (
    <Link
      href={`/pillars/${pillar.slug}`}
      className="group block rounded-lg border border-border p-6 hover:border-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg group-hover:text-accent transition-colors">
          {pillar.frontmatter.title}
        </h2>
        {pillar.frontmatter.draft && <DraftBadge />}
      </div>
      <p className="mt-2 text-sm text-fg-muted line-clamp-3">
        {pillar.frontmatter.description}
      </p>
      <div className="mt-4 flex items-center gap-3 text-xs text-fg-muted">
        <span>{pillar.readingTime}</span>
        <span className="rounded bg-bg-secondary px-2 py-0.5">
          {postCount} {postCount === 1 ? 'post' : 'posts'}
        </span>
      </div>
    </Link>
  );
}
