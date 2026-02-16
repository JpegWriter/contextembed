import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  FileSearch,
  Brain,
  Code2,
  Building,
  Archive,
} from 'lucide-react';

const pillars = [
  {
    slug: 'authorship-integrity',
    title: 'Authorship Integrity in the Age of AI',
    subtitle: 'The manifesto.',
    description:
      'Why metadata stripping is the biggest unspoken threat to image ownership — and what ContextEmbed does about it.',
    icon: Shield,
    accent: 'brand',
  },
  {
    slug: 'metadata-survival',
    title: 'What Really Survives When You Upload an Image?',
    subtitle: 'The proof engine.',
    description:
      'Platform-by-platform evidence of what gets stripped, what persists, and why most photographers lose everything on upload.',
    icon: FileSearch,
    accent: 'amber',
  },
  {
    slug: 'ai-ready-images',
    title: 'How to Prepare Images for AI Systems',
    subtitle: 'The readiness framework.',
    description:
      'Structured captions, context layering, and semantic consistency — making your images legible to the machines that decide visibility.',
    icon: Brain,
    accent: 'emerald',
  },
  {
    slug: 'wordpress-alt-text',
    title: 'Auto-Filling WordPress Alt Text from Embedded Metadata',
    subtitle: 'The integration pillar.',
    description:
      'How ContextEmbed hands off structured metadata to WordPress — and why alt text should never be typed by hand again.',
    icon: Code2,
    accent: 'sky',
  },
  {
    slug: 'image-governance',
    title: 'Image Governance for Businesses and Agencies',
    subtitle: 'The control layer.',
    description:
      'Brand consistency, credit enforcement, export profiles, and DAM compatibility — built for teams that ship images at scale.',
    icon: Building,
    accent: 'violet',
  },
  {
    slug: 'provenance-archive',
    title: 'Building a Verified Image Archive from Day One',
    subtitle: 'The long game.',
    description:
      'Opt-in authorship records, versioned exports, timeline evidence, and legal defensibility — the archive that proves you were first.',
    icon: Archive,
    accent: 'rose',
  },
];

const accentMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  brand: {
    bg: 'bg-brand-900/20',
    text: 'text-brand-400',
    border: 'border-brand-800/50',
    glow: 'hover:border-brand-600/60',
  },
  amber: {
    bg: 'bg-amber-900/20',
    text: 'text-amber-400',
    border: 'border-amber-800/50',
    glow: 'hover:border-amber-600/60',
  },
  emerald: {
    bg: 'bg-emerald-900/20',
    text: 'text-emerald-400',
    border: 'border-emerald-800/50',
    glow: 'hover:border-emerald-600/60',
  },
  sky: {
    bg: 'bg-sky-900/20',
    text: 'text-sky-400',
    border: 'border-sky-800/50',
    glow: 'hover:border-sky-600/60',
  },
  violet: {
    bg: 'bg-violet-900/20',
    text: 'text-violet-400',
    border: 'border-violet-800/50',
    glow: 'hover:border-violet-600/60',
  },
  rose: {
    bg: 'bg-rose-900/20',
    text: 'text-rose-400',
    border: 'border-rose-800/50',
    glow: 'hover:border-rose-600/60',
  },
};

export default function PillarsIndexPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-4 font-mono">
            Deep Dives
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            The Pillars of<br />Image Authority
          </h1>
          <p className="text-xl text-steel-400 max-w-2xl mx-auto">
            Six foundational resources that explain why metadata matters,
            what survives the modern web, and how to make images
            machine-legible from day one.
          </p>
        </div>
      </section>

      {/* Pillar Grid */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto grid gap-6">
          {pillars.map((pillar) => {
            const colors = accentMap[pillar.accent];
            const Icon = pillar.icon;
            return (
              <Link
                key={pillar.slug}
                href={`/pillars/${pillar.slug}`}
                className={`group block p-8 border ${colors.border} ${colors.glow} bg-steel-900/30 transition-all duration-300`}
              >
                <div className="flex items-start gap-6">
                  <div
                    className={`w-12 h-12 flex items-center justify-center ${colors.bg} flex-shrink-0`}
                  >
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-widest ${colors.text} mb-2 font-mono`}>
                      {pillar.subtitle}
                    </p>
                    <h2 className="text-xl font-bold text-white mb-3 group-hover:text-steel-200 transition-colors">
                      {pillar.title}
                    </h2>
                    <p className="text-steel-400 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-steel-400 mb-6">
            Ready to make your images speak for themselves?
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 text-white font-bold uppercase tracking-wider transition-colors btn-gradient-border"
          >
            Try ContextEmbed Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-steel-500 font-mono text-xs mt-4">
            3 exports • live web app • no guessing
          </p>
        </div>
      </section>
    </>
  );
}
