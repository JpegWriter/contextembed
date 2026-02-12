import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  AlertTriangle,
  X,
  Check,
  Eye,
  EyeOff,
  Scale,
  FileWarning,
  Bot,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Authorship Integrity in the Age of AI',
  description:
    'Why metadata stripping is the biggest unspoken threat to image ownership — and what ContextEmbed does about it.',
};

export default function AuthorshipIntegrityPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/pillars"
            className="inline-flex items-center gap-2 text-xs font-bold text-steel-500 uppercase tracking-widest hover:text-steel-300 transition-colors mb-8"
          >
            <ArrowLeft className="h-3 w-3" />
            All Pillars
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-900/30 text-brand-400 text-xs font-bold uppercase tracking-widest font-mono mb-6">
            <Shield className="h-3 w-3" />
            The Manifesto
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Authorship Integrity<br />in the Age of AI
          </h1>
          <p className="text-xl text-steel-400 max-w-2xl">
            Every time an image is uploaded, shared, or processed, its identity is at risk.
            Not its pixels — its provenance. The invisible data that says who made it,
            why it exists, and what rights it carries.
          </p>
        </div>
      </section>

      {/* The Silent Erasure */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            The Silent Erasure
          </h2>

          <div className="space-y-4 text-lg text-steel-400 mb-10">
            <p>
              When you upload a photograph to most platforms, something invisible happens.
            </p>
            <p>
              The EXIF data — camera model, GPS, date — gets stripped.
            </p>
            <p>
              The IPTC fields — creator, copyright, description — get silently deleted.
            </p>
            <p>
              The XMP sidecar — structured context, keywords, licensing — disappears.
            </p>
          </div>

          <div className="p-6 bg-red-900/15 border border-red-800/40 mb-10">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <p className="text-red-300 font-medium mb-2">
                  The result is an orphaned image.
                </p>
                <p className="text-steel-400">
                  It looks the same. But it carries no memory of who created it, no context
                  for why it exists, and no legal signal for how it should be used.
                </p>
              </div>
            </div>
          </div>

          <p className="text-white font-medium text-lg">
            This isn't a bug. It's the default behaviour of the modern web.
          </p>
        </div>
      </section>

      {/* Who's Stripping What */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Who's Stripping What — and Why
          </h2>
          <p className="text-steel-400 mb-10">
            Every platform has its own approach to metadata. Almost none of them preserve it all.
          </p>

          <div className="space-y-4 mb-10">
            {[
              {
                platform: 'Facebook / Instagram',
                strips: ['EXIF', 'IPTC', 'XMP'],
                reason: 'Privacy policy — removes all embedded data on upload.',
              },
              {
                platform: 'Twitter / X',
                strips: ['EXIF (partial)', 'IPTC', 'XMP'],
                reason: 'Recompresses and strips most metadata. GPS removed entirely.',
              },
              {
                platform: 'WordPress (default)',
                strips: ['IPTC (partial)', 'XMP'],
                reason: 'Resizing destroys sidecar data. Alt text must be entered manually.',
              },
              {
                platform: 'Google Images',
                strips: [],
                reason: "Reads IPTC/XMP for indexing — but only if it's already embedded.",
              },
              {
                platform: 'Stock platforms',
                strips: ['Varies'],
                reason: 'Some preserve IPTC Creator. Most strip custom XMP entirely.',
              },
            ].map((item) => (
              <div
                key={item.platform}
                className="p-5 bg-steel-900/50 border border-steel-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">{item.platform}</h3>
                  <div className="flex gap-2">
                    {item.strips.length === 0 ? (
                      <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 text-xs font-mono">
                        PRESERVES
                      </span>
                    ) : (
                      item.strips.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs font-mono"
                        >
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <p className="text-sm text-steel-400">{item.reason}</p>
              </div>
            ))}
          </div>

          <div className="p-6 bg-amber-900/15 border border-amber-800/40">
            <p className="text-amber-300 font-medium">
              The pattern is clear: if your authorship lives only in metadata,
              most platforms will erase it before anyone sees it.
            </p>
          </div>
        </div>
      </section>

      {/* The AI Ingestion Risk */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            The AI Ingestion Risk
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            Metadata stripping was bad enough when it just affected search.
            Now it affects something bigger: AI training sets.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="p-6 bg-steel-900/50 border border-steel-700/50">
              <Bot className="w-6 h-6 text-brand-400 mb-4" />
              <h3 className="font-bold text-white mb-2">Training Data</h3>
              <p className="text-steel-400 text-sm">
                Large language models and image generators scrape billions of images.
                If yours has no embedded authorship, it enters the dataset as anonymous material —
                free to be remixed, reproduced, or used as training signal with zero attribution.
              </p>
            </div>
            <div className="p-6 bg-steel-900/50 border border-steel-700/50">
              <EyeOff className="w-6 h-6 text-red-400 mb-4" />
              <h3 className="font-bold text-white mb-2">Orphan Works</h3>
              <p className="text-steel-400 text-sm">
                Under many jurisdictions, an image with no identifiable author may be
                treated as an "orphan work" — eligible for use without licensing.
                Stripping metadata accelerates this process.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-steel-400">
            <p>
              The question is no longer <span className="text-white font-medium">"will my image get stolen?"</span>
            </p>
            <p>
              It's <span className="text-white font-medium">"will my image be trainable?"</span>
            </p>
            <p>
              And if it carries no embedded context — the answer is already yes.
            </p>
          </div>
        </div>
      </section>

      {/* The Legal Dimension */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            The Legal Dimension
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            Metadata isn't just a convenience — it's evidence.
          </p>

          <div className="space-y-6 mb-10">
            <div className="flex items-start gap-4">
              <Scale className="w-5 h-5 text-brand-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-1">DMCA Takedowns</h3>
                <p className="text-steel-400 text-sm">
                  Embedded copyright and creator fields provide first-party evidence
                  in dispute resolution. Without them, you're arguing from outside the file.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <FileWarning className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-1">EU Directive on Copyright</h3>
                <p className="text-steel-400 text-sm">
                  Article 17 places responsibility on platforms to verify rights.
                  Machine-readable rights information embedded in the image
                  is the strongest form of compliance.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Eye className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-1">C2PA & Content Credentials</h3>
                <p className="text-steel-400 text-sm">
                  The emerging standard for provenance tracking relies on embedded
                  metadata as the anchor. Images without it cannot participate
                  in the trust layer.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-steel-900/50 border border-steel-700/50">
            <p className="text-white font-medium mb-2">
              Authorship integrity is not a philosophical position.
            </p>
            <p className="text-steel-400">
              It's a technical requirement — one that becomes more urgent as AI systems
              scale, as rights disputes increase, and as the line between "original"
              and "generated" continues to blur.
            </p>
          </div>
        </div>
      </section>

      {/* What ContextEmbed Does */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            What ContextEmbed Does About It
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            ContextEmbed treats authorship as infrastructure — not decoration.
          </p>

          <div className="space-y-4 mb-10">
            {[
              {
                label: 'Structured Embedding',
                description:
                  'Every exported image carries IPTC Creator, Copyright, Description, and Rights Usage — machine-readable, not guessed.',
              },
              {
                label: 'Context-Aware Generation',
                description:
                  'AI-generated captions are tied to the project context, not generic descriptions. Your image says what it means.',
              },
              {
                label: 'Survival-First Design',
                description:
                  'Fields are written into the binary using ExifTool-grade standards. What survives upload survives because it was embedded correctly.',
              },
              {
                label: 'Governance Layer',
                description:
                  "Optional rules prevent export without required fields. No image leaves without authorship if you don't want it to.",
              },
              {
                label: 'Audit Trail',
                description:
                  'Every processing step is logged. Every export is timestamped. Every decision is traceable.',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-4 p-4 bg-black/40 border border-steel-800/50">
                <Check className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium mb-1">{item.label}</p>
                  <p className="text-steel-400 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Position */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Authorship Should Be Structural
          </h2>
          <div className="space-y-4 text-lg text-steel-400 max-w-2xl mx-auto mb-10">
            <p>
              Not something you hope survives a platform's upload pipeline.
            </p>
            <p>
              Not something you type into a CMS field after the fact.
            </p>
            <p>
              Not something you lose because a social network decided privacy
              means erasing your name from your own work.
            </p>
          </div>
          <p className="text-xl text-white font-bold mb-10">
            Authorship should be embedded. Persistent. Machine-readable. Yours.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 border border-brand-500 text-white font-bold uppercase tracking-wider hover:bg-brand-500 transition-colors shadow-glow-green"
          >
            Try ContextEmbed Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-steel-500 font-mono text-xs mt-4">
            3 exports • live web app • no guessing
          </p>
        </div>
      </section>

      {/* Next Pillar */}
      <section className="py-12 px-6 border-t border-steel-700/50">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/pillars/metadata-survival"
            className="group flex items-center justify-between p-6 border border-steel-700/50 hover:border-amber-600/50 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Next Pillar
              </p>
              <p className="text-white font-bold group-hover:text-amber-300 transition-colors">
                What Really Survives When You Upload an Image?
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </section>
    </>
  );
}
