import Link from 'next/link';
import { Logo } from '@/components/Logo';
import MobileNav from '@/components/MobileNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | ContextEmbed',
    default: 'Pillars | ContextEmbed',
  },
  description: 'Deep-dive resources on image metadata, authorship integrity, and AI-ready publishing.',
};

export default function PillarsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="border-b border-steel-700/50 sticky top-0 bg-black/90 backdrop-blur-sm z-50">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="full" size="md" dark={true} />
          </Link>
          <MobileNav
            links={[
              { href: '/pillars', label: 'Pillars' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/governance', label: 'Governance' },
            ]}
            theme="dark"
          />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-steel-700/50 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-steel-500 font-mono">
          © {new Date().getFullYear()} ContextEmbed
        </div>
      </footer>
    </div>
  );
}
