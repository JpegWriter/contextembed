import Link from 'next/link';
import { Logo } from '@/components/Logo';
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
          <div className="flex items-center gap-6">
            <Link
              href="/pillars"
              className="text-xs font-bold text-steel-400 uppercase tracking-wider hover:text-white transition-colors"
            >
              Pillars
            </Link>
            <Link
              href="/pricing"
              className="text-xs font-bold text-steel-400 uppercase tracking-wider hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/governance"
              className="text-xs font-bold text-steel-400 uppercase tracking-wider hover:text-white transition-colors"
            >
              Governance
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-white text-xs font-bold uppercase tracking-wider transition-colors btn-gradient-border"
            >
              Try Free
            </Link>
          </div>
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
