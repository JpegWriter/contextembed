'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/types';

export function TOC({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    headings.forEach((heading) => {
      const el = document.getElementById(heading.slug);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-24" aria-label="Table of contents">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
        On this page
      </p>
      <ul className="space-y-1.5 text-sm">
        {headings.map((heading) => (
          <li
            key={heading.slug}
            style={{ paddingLeft: `${(heading.depth - 2) * 12}px` }}
          >
            <a
              href={`#${heading.slug}`}
              className={`block py-0.5 transition-colors ${
                activeId === heading.slug
                  ? 'text-accent font-medium'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
