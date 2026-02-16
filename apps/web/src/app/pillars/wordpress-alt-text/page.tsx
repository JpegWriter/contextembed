import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ArrowLeft,
  Code2,
  Check,
  X,
  Database,
  Settings,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  FileText,
  Plug,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Auto-Filling WordPress Alt Text from Embedded Metadata',
  description:
    'How ContextEmbed hands off structured metadata to WordPress — and why alt text should never be typed by hand again.',
};

export default function WordPressAltTextPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-900/30 text-sky-400 text-xs font-bold uppercase tracking-widest font-mono mb-6">
            <Code2 className="h-3 w-3" />
            The Integration Pillar
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Auto-Filling WordPress<br />Alt Text from Embedded<br />Metadata
          </h1>
          <p className="text-xl text-steel-400 max-w-2xl">
            Alt text is the single most important accessibility and SEO field on the web.
            It should never be an afterthought — and it should never be typed by hand
            when the image already carries the answer.
          </p>
        </div>
      </section>

      {/* The WordPress Problem */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            The WordPress Problem
          </h2>

          <div className="space-y-4 text-lg text-steel-400 mb-10">
            <p>
              WordPress powers over 40% of the web. And on almost every one of those sites,
              alt text is handled the same way:
            </p>
          </div>

          <div className="space-y-3 mb-10">
            {[
              'Upload image to media library',
              'Manually type alt text into a text field',
              'Hope someone remembers to do it for every image',
              'Discover months later that half your images have no alt text at all',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4 p-3 bg-red-900/10 border border-red-800/20">
                <span className="text-red-400 font-mono text-sm font-bold mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-steel-400">{step}</p>
              </div>
            ))}
          </div>

          <div className="p-6 bg-amber-900/15 border border-amber-800/40">
            <AlertTriangle className="w-5 h-5 text-amber-400 mb-3" />
            <p className="text-amber-300 font-medium mb-2">
              The result: broken accessibility, weak SEO, and no image discoverability.
            </p>
            <p className="text-steel-400">
              Not because the CMS is bad — but because the workflow assumes
              metadata should be entered <em>after</em> the image arrives,
              instead of traveling <em>with</em> it.
            </p>
          </div>
        </div>
      </section>

      {/* The ContextEmbed → WordPress Handshake */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            The ContextEmbed → WordPress Handshake
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            ContextEmbed embeds structured metadata directly into the image file.
            When that image is uploaded to WordPress, the metadata is already there —
            waiting to be read.
          </p>

          <div className="relative">
            {/* Flow diagram */}
            <div className="space-y-0">
              <div className="flex items-center gap-4 p-5 bg-brand-900/20 border border-brand-800/40">
                <div className="w-10 h-10 flex items-center justify-center bg-brand-900/40 flex-shrink-0">
                  <Settings className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">ContextEmbed Pipeline</p>
                  <p className="text-steel-400 text-xs">
                    AI analyses image → generates structured caption → embeds IPTC Description,
                    Keywords, Creator, Copyright into the file
                  </p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <div className="flex flex-col items-center">
                  <div className="w-px h-4 bg-steel-600" />
                  <Download className="w-4 h-4 text-steel-500" />
                  <div className="w-px h-4 bg-steel-600" />
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 bg-sky-900/20 border border-sky-800/40">
                <div className="w-10 h-10 flex items-center justify-center bg-sky-900/40 flex-shrink-0">
                  <Download className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Export & Download</p>
                  <p className="text-steel-400 text-xs">
                    Image exported with all metadata baked in. Download the file —
                    the context travels with it.
                  </p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <div className="flex flex-col items-center">
                  <div className="w-px h-4 bg-steel-600" />
                  <Upload className="w-4 h-4 text-steel-500" />
                  <div className="w-px h-4 bg-steel-600" />
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 bg-emerald-900/20 border border-emerald-800/40">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-900/40 flex-shrink-0">
                  <Plug className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">WordPress Plugin Reads Metadata</p>
                  <p className="text-steel-400 text-xs">
                    On upload, the companion plugin extracts IPTC fields and auto-populates
                    Alt Text, Caption, and Description in the media library.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Field Priority Logic */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Field Priority Logic
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            Not all metadata fields are equal. The plugin uses a clear priority chain
            to determine what goes where.
          </p>

          <div className="space-y-4 mb-10">
            <div className="p-5 bg-black/40 border border-steel-800/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white">WordPress Alt Text</h3>
                <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 text-xs font-mono">
                  PRIORITY 1
                </span>
              </div>
              <div className="space-y-2 text-sm text-steel-400">
                <p className="flex items-center gap-2">
                  <span className="text-emerald-400 font-mono text-xs">1st</span>
                  IPTC Description (ObjectName)
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-xs">2nd</span>
                  XMP dc:description
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-steel-500 font-mono text-xs">3rd</span>
                  EXIF ImageDescription
                </p>
              </div>
            </div>

            <div className="p-5 bg-black/40 border border-steel-800/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white">WordPress Caption</h3>
                <span className="px-2 py-0.5 bg-sky-900/30 text-sky-400 text-xs font-mono">
                  PRIORITY 2
                </span>
              </div>
              <div className="space-y-2 text-sm text-steel-400">
                <p className="flex items-center gap-2">
                  <span className="text-emerald-400 font-mono text-xs">1st</span>
                  IPTC Caption/Abstract
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-xs">2nd</span>
                  XMP dc:title
                </p>
              </div>
            </div>

            <div className="p-5 bg-black/40 border border-steel-800/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white">WordPress Description</h3>
                <span className="px-2 py-0.5 bg-violet-900/30 text-violet-400 text-xs font-mono">
                  PRIORITY 3
                </span>
              </div>
              <div className="space-y-2 text-sm text-steel-400">
                <p className="flex items-center gap-2">
                  <span className="text-emerald-400 font-mono text-xs">1st</span>
                  Extended IPTC Caption
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-xs">2nd</span>
                  XMP photoshop:Instructions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Controls */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Safety Controls
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            Auto-filling doesn't mean overwriting. The plugin respects existing content.
          </p>

          <div className="space-y-4 mb-10">
            {[
              {
                icon: RefreshCw,
                title: 'Never Overwrite Existing',
                description:
                  'If alt text already exists in WordPress, the plugin skips that field. Existing editorial decisions are preserved.',
                color: 'text-emerald-400',
              },
              {
                icon: Database,
                title: 'Database-Level Storage',
                description:
                  'All extracted metadata is stored in the WordPress database alongside the attachment. It persists through theme changes, plugin updates, and migrations.',
                color: 'text-sky-400',
              },
              {
                icon: FileText,
                title: 'Audit Log',
                description:
                  'Every auto-filled field is logged with a timestamp and source field. You always know what was set automatically vs. what was entered manually.',
                color: 'text-amber-400',
              },
              {
                icon: Settings,
                title: 'Configurable Behaviour',
                description:
                  'Choose which fields to auto-fill, which to skip, and whether to overwrite or append. Full control in the plugin settings.',
                color: 'text-violet-400',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-5 bg-steel-900/50 border border-steel-700/50">
                <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <h3 className="font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-steel-400 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Workflow Comparison */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-10">
            The Workflow Difference
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-red-900/10 border border-red-800/30">
              <h3 className="font-bold text-red-400 mb-4 text-sm uppercase tracking-wider">
                Without ContextEmbed
              </h3>
              <div className="space-y-3 text-sm text-steel-400">
                <p className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  Upload image
                </p>
                <p className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  Open media library
                </p>
                <p className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  Type alt text manually
                </p>
                <p className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  Type caption manually
                </p>
                <p className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  Repeat for every image
                </p>
                <p className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  Miss half of them
                </p>
              </div>
            </div>

            <div className="p-6 bg-emerald-900/10 border border-emerald-800/30">
              <h3 className="font-bold text-emerald-400 mb-4 text-sm uppercase tracking-wider">
                With ContextEmbed
              </h3>
              <div className="space-y-3 text-sm text-steel-400">
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Process images through ContextEmbed
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Export with embedded metadata
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Upload to WordPress
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Alt text auto-filled ✓
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Caption auto-filled ✓
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Done. Every image. Every time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Alt Text Should Travel With the Image
          </h2>
          <p className="text-steel-400 mb-8 max-w-xl mx-auto">
            Stop typing alt text by hand. Start embedding it at the source.
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

      {/* Prev/Next Navigation */}
      <section className="py-12 px-6 border-t border-steel-700/50">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4">
          <Link
            href="/pillars/ai-ready-images"
            className="group flex-1 flex items-center gap-4 p-6 border border-steel-700/50 hover:border-emerald-600/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:-translate-x-1 transition-all" />
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Previous
              </p>
              <p className="text-white font-bold text-sm group-hover:text-emerald-300 transition-colors">
                AI-Ready Images
              </p>
            </div>
          </Link>
          <Link
            href="/pillars/image-governance"
            className="group flex-1 flex items-center justify-between p-6 border border-steel-700/50 hover:border-violet-600/50 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Next
              </p>
              <p className="text-white font-bold text-sm group-hover:text-violet-300 transition-colors">
                Image Governance
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </section>
    </>
  );
}
