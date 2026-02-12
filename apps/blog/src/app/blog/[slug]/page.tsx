import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllPosts, getPostBySlug, getPillarBySlug, getRelatedPost, getPrevNextPosts, getPostsBySeries } from '@/lib/content';
import { MdxContent } from '@/lib/mdx';
import { formatDate, SITE } from '@/lib/utils';
import { TOC } from '@/components/TOC';
import { DraftBadge } from '@/components/DraftBadge';
import { ReadNext } from '@/components/ReadNext';
import { PrevNext } from '@/components/PrevNext';
import { ArticleJsonLd } from '@/components/JsonLd';
import Link from 'next/link';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return {};

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    openGraph: {
      type: 'article',
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      publishedTime: post.frontmatter.date,
      modifiedTime: post.frontmatter.updated,
      tags: post.frontmatter.tags,
    },
    alternates: {
      canonical: post.frontmatter.canonical ?? `${SITE.url}/blog/${post.slug}`,
    },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const pillar = getPillarBySlug(post.frontmatter.pillar);
  const related = getRelatedPost(post);
  const { prev, next } = getPrevNextPosts(post.slug);
  const seriesPosts = post.frontmatter.series
    ? getPostsBySeries(post.frontmatter.series)
    : [];

  return (
    <>
      <ArticleJsonLd post={post} />
      <article className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted mb-3">
            <Link href="/blog" className="hover:text-fg transition-colors">
              Blog
            </Link>
            <span>/</span>
            {pillar && (
              <>
                <Link
                  href={`/pillars/${pillar.slug}`}
                  className="hover:text-accent transition-colors"
                >
                  {pillar.frontmatter.title}
                </Link>
                <span>/</span>
              </>
            )}
          </div>

          <h1 className="text-3xl font-bold text-fg leading-tight md:text-4xl">
            {post.frontmatter.title}
          </h1>
          <p className="mt-3 text-lg text-fg-muted">{post.frontmatter.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
            <time dateTime={post.frontmatter.date}>
              {formatDate(post.frontmatter.date)}
            </time>
            {post.frontmatter.updated && (
              <span>Updated {formatDate(post.frontmatter.updated)}</span>
            )}
            <span>{post.readingTime}</span>
            {post.frontmatter.draft && <DraftBadge />}
          </div>

          {post.frontmatter.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
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
        </header>

        {/* Series nav */}
        {seriesPosts.length > 1 && (
          <div className="mb-8 rounded-lg border border-border p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Series: {post.frontmatter.series}
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {seriesPosts.map((sp) => (
                <li key={sp.slug}>
                  {sp.slug === post.slug ? (
                    <span className="font-semibold text-fg">{sp.frontmatter.title}</span>
                  ) : (
                    <Link
                      href={`/blog/${sp.slug}`}
                      className="text-fg-muted hover:text-accent transition-colors"
                    >
                      {sp.frontmatter.title}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Body + TOC */}
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-10">
          <div className="min-w-0">
            <MdxContent source={post.content} />
            <ReadNext pillar={pillar} related={related} />
            <PrevNext prev={prev} next={next} />
          </div>
          <aside className="hidden lg:block">
            <TOC headings={post.headings} />
          </aside>
        </div>
      </article>
    </>
  );
}
