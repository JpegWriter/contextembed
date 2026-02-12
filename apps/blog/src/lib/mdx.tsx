import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import React from 'react';

function Callout({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warning' | 'tip' }) {
  const styles = {
    info: 'border-blue-500/30 bg-blue-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    tip: 'border-emerald-500/30 bg-emerald-500/5',
  };
  const labels = { info: 'Note', warning: 'Warning', tip: 'Tip' };

  return (
    <div className={`my-6 rounded-lg border-l-4 p-4 ${styles[type]}`}>
      <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-fg-muted">
        {labels[type]}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

const mdxComponents = {
  Callout,
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-x-auto">
      <table {...props} />
    </div>
  ),
};

interface MdxContentProps {
  source: string;
}

export function MdxContent({ source }: MdxContentProps) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: 'wrap' }],
            ],
          },
        }}
      />
    </div>
  );
}
