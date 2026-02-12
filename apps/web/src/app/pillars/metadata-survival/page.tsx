import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ArrowLeft,
  FileSearch,
  Check,
  X,
  AlertTriangle,
  Camera,
  Globe,
  Image,
  Upload,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'What Really Survives When You Upload an Image?',
  description:
    'Platform-by-platform evidence of what gets stripped, what persists, and why most photographers lose everything on upload.',
};

const survivalMatrix = [
  {
    platform: 'Google Images',
    exif: 'partial',
    iptc: 'yes',
    xmp: 'yes',
    altText: 'n/a',
    notes: 'Reads IPTC/XMP for indexing. Primary discovery channel for embedded metadata.',
  },
  {
    platform: 'Facebook',
    exif: 'no',
    iptc: 'no',
    xmp: 'no',
    altText: 'auto-generated',
    notes: 'Strips all metadata on upload. Generates its own alt text via ML.',
  },
  {
    platform: 'Instagram',
    exif: 'no',
    iptc: 'no',
    xmp: 'no',
    altText: 'optional manual',
    notes: 'Complete metadata wipe. Heavy recompression destroys embedded data.',
  },
  {
    platform: 'Twitter / X',
    exif: 'partial',
    iptc: 'no',
    xmp: 'no',
    altText: 'optional manual',
    notes: 'Strips GPS and most EXIF. IPTC/XMP removed entirely.',
  },
  {
    platform: 'WordPress (default)',
    exif: 'partial',
    iptc: 'partial',
    xmp: 'no',
    altText: 'manual',
    notes: 'Resizing can destroy sidecar data. Alt text must be entered in media library.',
  },
  {
    platform: 'Squarespace',
    exif: 'no',
    iptc: 'no',
    xmp: 'no',
    altText: 'manual',
    notes: 'Strips and recompresses. No metadata passes through to the rendered page.',
  },
  {
    platform: 'Flickr',
    exif: 'yes',
    iptc: 'yes',
    xmp: 'yes',
    altText: 'n/a',
    notes: 'One of the few platforms that preserves and displays full metadata.',
  },
  {
    platform: 'Adobe Stock',
    exif: 'yes',
    iptc: 'yes',
    xmp: 'partial',
    altText: 'n/a',
    notes: 'Preserves IPTC Creator/Copyright. Custom XMP namespaces may be dropped.',
  },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'yes') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-900/30 text-emerald-400 text-xs font-mono">
        <Check className="w-3 h-3" /> YES
      </span>
    );
  }
  if (status === 'no') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-900/30 text-red-400 text-xs font-mono">
        <X className="w-3 h-3" /> NO
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 bg-amber-900/30 text-amber-400 text-xs font-mono">
      {status.toUpperCase()}
    </span>
  );
}

export default function MetadataSurvivalPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-900/30 text-amber-400 text-xs font-bold uppercase tracking-widest font-mono mb-6">
            <FileSearch className="h-3 w-3" />
            The Proof Engine
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            What Really Survives<br />When You Upload an Image?
          </h1>
          <p className="text-xl text-steel-400 max-w-2xl">
            You embedded the metadata. You wrote the alt text. You filled in the copyright.
            Then the platform stripped it all. Here's what actually makes it through —
            platform by platform, field by field.
          </p>
        </div>
      </section>

      {/* The Assumption That Costs You */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            The Assumption That Costs You
          </h2>

          <div className="space-y-4 text-lg text-steel-400 mb-10">
            <p>Most photographers assume metadata survives upload.</p>
            <p>Most developers assume alt text comes from the image.</p>
            <p>Most marketers assume search engines can "read" their photos.</p>
          </div>

          <div className="p-6 bg-red-900/15 border border-red-800/40">
            <p className="text-red-300 font-medium mb-2">None of this is reliably true.</p>
            <p className="text-steel-400">
              The gap between what you embed and what survives is the single biggest
              reason images fail to perform in search, fail to carry attribution,
              and fail to be understood by AI systems.
            </p>
          </div>
        </div>
      </section>

      {/* Survival Matrix */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            The Metadata Survival Matrix
          </h2>
          <p className="text-steel-400 mb-10">
            What happens to your carefully embedded data the moment you hit upload.
          </p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto mb-10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-steel-700/50">
                  <th className="text-left py-3 px-4 text-xs font-bold text-steel-500 uppercase tracking-widest">
                    Platform
                  </th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-steel-500 uppercase tracking-widest">
                    EXIF
                  </th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-steel-500 uppercase tracking-widest">
                    IPTC
                  </th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-steel-500 uppercase tracking-widest">
                    XMP
                  </th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-steel-500 uppercase tracking-widest">
                    Alt Text
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-steel-500 uppercase tracking-widest">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {survivalMatrix.map((row) => (
                  <tr key={row.platform} className="border-b border-steel-800/30">
                    <td className="py-3 px-4 text-white font-medium">{row.platform}</td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={row.exif} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={row.iptc} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={row.xmp} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={row.altText} />
                    </td>
                    <td className="py-3 px-4 text-steel-400 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4 mb-10">
            {survivalMatrix.map((row) => (
              <div key={row.platform} className="p-4 bg-steel-900/50 border border-steel-700/50">
                <h3 className="font-bold text-white mb-3">{row.platform}</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-steel-500">EXIF</span>
                    <StatusBadge status={row.exif} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-steel-500">IPTC</span>
                    <StatusBadge status={row.iptc} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-steel-500">XMP</span>
                    <StatusBadge status={row.xmp} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-steel-500">Alt</span>
                    <StatusBadge status={row.altText} />
                  </div>
                </div>
                <p className="text-steel-400 text-xs">{row.notes}</p>
              </div>
            ))}
          </div>

          <div className="p-6 bg-amber-900/15 border border-amber-800/40">
            <p className="text-amber-300 font-medium mb-2">
              The uncomfortable truth:
            </p>
            <p className="text-steel-400">
              Only two platforms in this list reliably preserve full IPTC and XMP metadata.
              The rest strip it partially or entirely — and none of them tell you they did.
            </p>
          </div>
        </div>
      </section>

      {/* Three Layers of Metadata */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            The Three Layers — and What Each One Does
          </h2>
          <p className="text-steel-400 mb-10">
            Not all metadata is created equal. Understanding the three layers
            is the first step to understanding what you're losing.
          </p>

          <div className="space-y-6">
            <div className="p-6 bg-black/40 border border-steel-800/50">
              <div className="flex items-center gap-3 mb-3">
                <Camera className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-lg">EXIF — The Camera Layer</h3>
              </div>
              <p className="text-steel-400 mb-3">
                Written by the camera at the moment of capture. Includes shutter speed,
                ISO, focal length, GPS coordinates, and date/time.
              </p>
              <p className="text-steel-500 text-sm">
                <strong className="text-steel-300">Survival rate:</strong> Moderate. GPS is often stripped for privacy.
                Technical fields sometimes survive recompression.
              </p>
            </div>

            <div className="p-6 bg-black/40 border border-brand-800/50">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-white text-lg">IPTC — The Editorial Layer</h3>
              </div>
              <p className="text-steel-400 mb-3">
                The standard for professional image metadata. Creator name, copyright notice,
                caption/description, keywords, and usage rights. This is the layer
                Google Images actually reads for indexing.
              </p>
              <p className="text-steel-500 text-sm">
                <strong className="text-brand-300">Survival rate:</strong> Low to moderate. Most social platforms strip it entirely.
                Google and Flickr preserve it. WordPress partially retains it.
              </p>
            </div>

            <div className="p-6 bg-black/40 border border-violet-800/50">
              <div className="flex items-center gap-3 mb-3">
                <Image className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-white text-lg">XMP — The Context Layer</h3>
              </div>
              <p className="text-steel-400 mb-3">
                Adobe's extensible metadata framework. Supports structured fields,
                custom namespaces, and rich context — including licensing, provenance,
                and semantic descriptions. The most powerful layer, and the most fragile.
              </p>
              <p className="text-steel-500 text-sm">
                <strong className="text-violet-300">Survival rate:</strong> Very low. Almost universally stripped on upload.
                Only specialist platforms preserve it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What This Means for You */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            What This Means in Practice
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="p-6 bg-red-900/10 border border-red-800/30">
              <Upload className="w-5 h-5 text-red-400 mb-3" />
              <h3 className="font-bold text-white mb-2">Before Upload</h3>
              <ul className="space-y-2 text-sm text-steel-400">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Creator: John Smith Photography
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Copyright: © 2025 All rights reserved
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Description: Aerial view of sustainable architecture…
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Keywords: architecture, sustainability, green building
                </li>
              </ul>
            </div>
            <div className="p-6 bg-red-900/10 border border-red-800/30">
              <Globe className="w-5 h-5 text-red-400 mb-3" />
              <h3 className="font-bold text-white mb-2">After Upload (most platforms)</h3>
              <ul className="space-y-2 text-sm text-steel-400">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  Creator: <span className="text-red-400/70 italic">stripped</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  Copyright: <span className="text-red-400/70 italic">stripped</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  Description: <span className="text-red-400/70 italic">stripped</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  Keywords: <span className="text-red-400/70 italic">stripped</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-6 bg-steel-900/50 border border-steel-700/50">
            <p className="text-white font-medium mb-2">
              This is why ContextEmbed exists.
            </p>
            <p className="text-steel-400">
              Not to fight platforms — they'll strip what they strip. But to ensure that
              every image leaves your system with the strongest possible metadata profile,
              embedded to survive wherever the standards allow it.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Stop Hoping. Start Embedding.
          </h2>
          <p className="text-steel-400 mb-8 max-w-xl mx-auto">
            ContextEmbed writes structured, standards-compliant metadata into every
            export — so what can survive, does survive.
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

      {/* Prev/Next Navigation */}
      <section className="py-12 px-6 border-t border-steel-700/50">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4">
          <Link
            href="/pillars/authorship-integrity"
            className="group flex-1 flex items-center gap-4 p-6 border border-steel-700/50 hover:border-brand-600/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:-translate-x-1 transition-all" />
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Previous
              </p>
              <p className="text-white font-bold text-sm group-hover:text-brand-300 transition-colors">
                Authorship Integrity
              </p>
            </div>
          </Link>
          <Link
            href="/pillars/ai-ready-images"
            className="group flex-1 flex items-center justify-between p-6 border border-steel-700/50 hover:border-emerald-600/50 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Next
              </p>
              <p className="text-white font-bold text-sm group-hover:text-emerald-300 transition-colors">
                AI-Ready Images
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </section>
    </>
  );
}
