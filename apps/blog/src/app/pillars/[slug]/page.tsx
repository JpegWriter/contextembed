import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllPillars, getPillarBySlug, getPostsByPillar } from '@/lib/content';
import { MdxContent } from '@/lib/mdx';
import { formatDate, SITE } from '@/lib/utils';
import { TOC } from '@/components/TOC';
import { DraftBadge } from '@/components/DraftBadge';
import { ArticleJsonLd } from '@/components/JsonLd';
import Link from 'next/link';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllPillars().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const pillar = getPillarBySlug(params.slug);
  if (!pillar) return {};

  return {
    title: pillar.frontmatter.title,
    description: pillar.frontmatter.description,
    openGraph: {
      type: 'article',
      title: pillar.frontmatter.title,
      description: pillar.frontmatter.description,
      publishedTime: pillar.frontmatter.date,
    },
    alternates: {
      canonical: pillar.frontmatter.canonical ?? `${SITE.url}/pillars/${pillar.slug}`,
    },
  };
}

export default function PillarPage({ params }: Props) {
  const pillar = getPillarBySlug(params.slug);
  if (!pillar) notFound();

  const clusterPosts = getPostsByPillar(pillar.slug);

  return (
    <>
      <ArticleJsonLd post={pillar} type="Article" />
      <article className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-10">
          <div className="flex items-center gap-2 text-xs text-fg-muted mb-3">
            <Link href="/pillars" className="hover:text-fg transition-colors">
              Pillars
            </Link>
            <span>/</span>
          </div>

          <h1 className="text-3xl font-bold text-fg leading-tight md:text-4xl">
            {pillar.frontmatter.title}
          </h1>
          <p className="mt-3 text-lg text-fg-muted">{pillar.frontmatter.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
            <time dateTime={pillar.frontmatter.date}>
              {formatDate(pillar.frontmatter.date)}
            </time>
            <span>{pillar.readingTime}</span>
            {pillar.frontmatter.draft && <DraftBadge />}
          </div>
        </header>

        {/* Start here — cluster posts */}
        {clusterPosts.length > 0 && (
          <div className="mb-10 rounded-lg border border-border p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Start here &mdash; posts in this pillar
            </p>
            <ul className="space-y-2 text-sm">
              {clusterPosts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-fg hover:text-accent transition-colors"
                  >
                    {post.frontmatter.title}
                  </Link>
                  <span className="ml-2 text-xs text-fg-muted">{post.readingTime}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Body + TOC */}
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-10">
          <div className="min-w-0">
            <MdxContent source={pillar.content} />
          </div>
          <aside className="hidden lg:block">
            <TOC headings={pillar.headings} />
          </aside>
        </div>
      </article>
    </>
  );
}
