import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-bold tracking-tight text-fg">
          ContextEmbed<span className="text-fg-muted font-normal"> / blog</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-fg-muted">
          <Link href="/blog" className="hover:text-fg transition-colors">
            Posts
          </Link>
          <Link href="/pillars" className="hover:text-fg transition-colors">
            Pillars
          </Link>
          <Link href="/studio" className="hover:text-fg transition-colors">
            Studio
          </Link>
          <a
            href="/rss.xml"
            className="hover:text-fg transition-colors"
            title="RSS Feed"
          >
            RSS
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto max-w-4xl px-4 text-center text-xs text-fg-muted">
        &copy; {new Date().getFullYear()} ContextEmbed. All rights reserved.
      </div>
    </footer>
  );
}
