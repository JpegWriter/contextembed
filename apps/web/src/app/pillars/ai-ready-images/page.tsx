import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ArrowLeft,
  Brain,
  Check,
  Layers,
  Type,
  Tags,
  Sparkles,
  Target,
  Zap,
  Search,
  Bot,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How to Prepare Images for AI Systems',
  description:
    'Structured captions, context layering, and semantic consistency — making your images legible to the machines that decide visibility.',
};

export default function AiReadyImagesPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-900/30 text-emerald-400 text-xs font-bold uppercase tracking-widest font-mono mb-6">
            <Brain className="h-3 w-3" />
            The Readiness Framework
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            How to Prepare Images<br />for AI Systems
          </h1>
          <p className="text-xl text-steel-400 max-w-2xl">
            Search engines don't admire composition. AI models don't guess intent.
            If your image doesn't carry structured, machine-readable context,
            it doesn't exist to the systems that decide who gets discovered.
          </p>
        </div>
      </section>

      {/* The Readability Gap */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            The Readability Gap
          </h2>

          <div className="space-y-4 text-lg text-steel-400 mb-10">
            <p>
              There are billions of images on the web. Most of them are invisible.
            </p>
            <p>
              Not because they're bad — because they carry no usable signal.
            </p>
            <p>
              No structured caption. No semantic keywords. No contextual description
              that a machine can parse, classify, and index.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-5 bg-red-900/15 border border-red-800/30 text-center">
              <p className="text-3xl font-bold text-red-400 mb-2">70%+</p>
              <p className="text-steel-400 text-sm">
                of images have no meaningful metadata
              </p>
            </div>
            <div className="p-5 bg-amber-900/15 border border-amber-800/30 text-center">
              <p className="text-3xl font-bold text-amber-400 mb-2">90%+</p>
              <p className="text-steel-400 text-sm">
                of alt text is generic or missing entirely
              </p>
            </div>
            <div className="p-5 bg-emerald-900/15 border border-emerald-800/30 text-center">
              <p className="text-3xl font-bold text-emerald-400 mb-2">&lt;5%</p>
              <p className="text-steel-400 text-sm">
                carry structured IPTC + XMP context
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What AI Systems Need */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            What AI Systems Actually Need
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            An "AI-ready" image isn't about resolution or format.
            It's about structured signals that machines can consume.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-5 p-6 bg-steel-900/50 border border-steel-700/50">
              <Type className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-2">Structured Captions</h3>
                <p className="text-steel-400 mb-3">
                  Not "beautiful sunset over mountains." Instead: a caption that
                  describes the subject, the context, the intent, and the rights — in a format
                  that Google, Bing, and AI crawlers can parse without guessing.
                </p>
                <div className="p-3 bg-black/40 border border-steel-800/50 font-mono text-xs">
                  <p className="text-steel-500 mb-1">// Generic (useless to machines)</p>
                  <p className="text-red-400 mb-3">"A photo of a building"</p>
                  <p className="text-steel-500 mb-1">// Structured (AI-readable)</p>
                  <p className="text-emerald-400">
                    "Aerial view of cross-laminated timber office complex in Copenhagen,
                    showing green roof system and rainwater harvesting infrastructure.
                    Photographed for Nordic Sustainable Architecture Review, 2025."
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-5 p-6 bg-steel-900/50 border border-steel-700/50">
              <Layers className="w-6 h-6 text-brand-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-2">Context Layering</h3>
                <p className="text-steel-400 mb-3">
                  A single image should carry multiple layers of context:
                  what it shows (visual), why it matters (editorial), who owns it (legal),
                  and where it fits (semantic). Each layer serves a different system.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { layer: 'Visual', field: 'IPTC Description', color: 'text-sky-400' },
                    { layer: 'Editorial', field: 'XMP Context', color: 'text-brand-400' },
                    { layer: 'Legal', field: 'IPTC Copyright', color: 'text-amber-400' },
                    { layer: 'Semantic', field: 'IPTC Keywords', color: 'text-emerald-400' },
                  ].map((item) => (
                    <div key={item.layer} className="p-2 bg-black/30 border border-steel-800/30">
                      <p className={`text-xs font-bold ${item.color}`}>{item.layer}</p>
                      <p className="text-steel-500 text-xs font-mono">{item.field}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-5 p-6 bg-steel-900/50 border border-steel-700/50">
              <Tags className="w-6 h-6 text-violet-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-2">Semantic Consistency</h3>
                <p className="text-steel-400">
                  Keywords, descriptions, and captions should reinforce each other —
                  not contradict. If your description says "corporate headquarters"
                  but your keywords say "nature landscape," the machine doesn't know
                  what to believe. Consistency is signal. Contradiction is noise.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who Needs This */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-10">
            Who This Is For
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-black/40 border border-steel-800/50">
              <Target className="w-5 h-5 text-brand-400 mb-3" />
              <h3 className="font-bold text-white mb-2">Agencies & Studios</h3>
              <p className="text-steel-400 text-sm">
                Shipping hundreds of images per client. Need every export to carry
                context, credit, and searchability without manual field-filling.
              </p>
            </div>
            <div className="p-6 bg-black/40 border border-steel-800/50">
              <Search className="w-5 h-5 text-emerald-400 mb-3" />
              <h3 className="font-bold text-white mb-2">SEO Professionals</h3>
              <p className="text-steel-400 text-sm">
                Image SEO is no longer optional. Google's visual search relies on
                structured metadata. If your images don't carry it, they don't rank.
              </p>
            </div>
            <div className="p-6 bg-black/40 border border-steel-800/50">
              <Zap className="w-5 h-5 text-amber-400 mb-3" />
              <h3 className="font-bold text-white mb-2">WordPress Publishers</h3>
              <p className="text-steel-400 text-sm">
                Alt text, captions, and descriptions should flow from the image into
                the CMS — not be typed by hand into every media library entry.
              </p>
            </div>
            <div className="p-6 bg-black/40 border border-steel-800/50">
              <Bot className="w-5 h-5 text-violet-400 mb-3" />
              <h3 className="font-bold text-white mb-2">AI System Builders</h3>
              <p className="text-steel-400 text-sm">
                If you're building on top of image data, you need images that come
                pre-structured — not raw pixels with missing context.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How ContextEmbed Makes Images AI-Ready */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            How ContextEmbed Makes Images AI-Ready
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            The pipeline takes your raw images and transforms them into
            structured, context-rich assets — automatically.
          </p>

          <div className="space-y-4">
            {[
              {
                step: '01',
                title: 'Upload & Analyse',
                description:
                  'AI examines the image content, the project context, and any existing metadata to understand what the image actually shows.',
              },
              {
                step: '02',
                title: 'Generate Structured Context',
                description:
                  'Captions, descriptions, and keywords are generated from project-level signals — not generic ML labels. Every field reinforces the others.',
              },
              {
                step: '03',
                title: 'Embed into the Binary',
                description:
                  'IPTC, XMP, and EXIF fields are written directly into the image file using ExifTool-grade standards. The context travels with the pixel data.',
              },
              {
                step: '04',
                title: 'Validate & Export',
                description:
                  'Governance rules check that required fields are present. The image leaves your system AI-ready, search-optimised, and legally attributed.',
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-5 p-5 bg-steel-900/50 border border-steel-700/50">
                <span className="text-2xl font-bold text-emerald-400/40 font-mono flex-shrink-0">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-steel-400 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Standard */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            The New Standard Is Legibility
          </h2>
          <div className="space-y-4 text-lg text-steel-400 max-w-2xl mx-auto mb-10">
            <p>
              Beautiful images are everywhere. Discoverable images are rare.
            </p>
            <p>
              The difference isn't aesthetics. It's structure.
            </p>
            <p className="text-white font-medium">
              AI-ready means structured, persistent, and machine-readable.
            </p>
          </div>

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

      {/* Prev/Next Navigation */}
      <section className="py-12 px-6 border-t border-steel-700/50">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4">
          <Link
            href="/pillars/metadata-survival"
            className="group flex-1 flex items-center gap-4 p-6 border border-steel-700/50 hover:border-amber-600/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:-translate-x-1 transition-all" />
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Previous
              </p>
              <p className="text-white font-bold text-sm group-hover:text-amber-300 transition-colors">
                Metadata Survival Study
              </p>
            </div>
          </Link>
          <Link
            href="/pillars/wordpress-alt-text"
            className="group flex-1 flex items-center justify-between p-6 border border-steel-700/50 hover:border-sky-600/50 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Next
              </p>
              <p className="text-white font-bold text-sm group-hover:text-sky-300 transition-colors">
                WordPress Alt Text Automation
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </section>
    </>
  );
}
