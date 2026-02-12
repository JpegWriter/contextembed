export function DraftBadge() {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <span className="draft-badge inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
      Draft
    </span>
  );
}
