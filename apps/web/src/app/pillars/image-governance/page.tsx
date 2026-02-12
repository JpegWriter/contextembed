import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ArrowLeft,
  Building,
  Check,
  Shield,
  Users,
  Lock,
  FileCheck,
  Palette,
  Download,
  AlertTriangle,
  BarChart3,
  Workflow,
  Layers,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Image Governance for Businesses and Agencies',
  description:
    'Brand consistency, credit enforcement, export profiles, and DAM compatibility — built for teams that ship images at scale.',
};

export default function ImageGovernancePage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-900/30 text-violet-400 text-xs font-bold uppercase tracking-widest font-mono mb-6">
            <Building className="h-3 w-3" />
            The Control Layer
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Image Governance<br />for Businesses<br />and Agencies
          </h1>
          <p className="text-xl text-steel-400 max-w-2xl">
            Metadata embedding solves discoverability. But for organisations that ship
            hundreds of images a month, discoverability isn't enough. You need control.
            Over what leaves. Over how it's credited. Over what it says about your brand.
          </p>
        </div>
      </section>

      {/* The Risk */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            The Risk Nobody Budgets For
          </h2>

          <div className="space-y-4 text-lg text-steel-400 mb-10">
            <p>
              When images leave your system without governance, the damage is invisible — until it isn't.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {[
              {
                icon: AlertTriangle,
                title: 'Brand Inconsistency',
                description:
                  "Different departments export images with different metadata standards. Some carry credits. Some don't. Externally, it looks like chaos.",
                color: 'text-red-400',
                bg: 'bg-red-900/15',
                border: 'border-red-800/30',
              },
              {
                icon: Users,
                title: 'Credit Omission',
                description:
                  "A photographer's name gets dropped. A contributor isn't credited. A licensing field is empty. The legal email arrives three months later.",
                color: 'text-amber-400',
                bg: 'bg-amber-900/15',
                border: 'border-amber-800/30',
              },
              {
                icon: Download,
                title: 'Uncontrolled Export',
                description:
                  'Anyone can download and re-upload without quality or compliance checks. The image carries whatever metadata it had — or nothing at all.',
                color: 'text-orange-400',
                bg: 'bg-orange-900/15',
                border: 'border-orange-800/30',
              },
              {
                icon: Lock,
                title: 'Compliance Gaps',
                description:
                  'EU copyright requirements, accessibility standards, rights declarations — all depend on metadata being present and correct at the point of export.',
                color: 'text-violet-400',
                bg: 'bg-violet-900/15',
                border: 'border-violet-800/30',
              },
            ].map((item) => (
              <div key={item.title} className={`p-5 ${item.bg} border ${item.border}`}>
                <item.icon className={`w-5 h-5 ${item.color} mb-3`} />
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-steel-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="p-6 bg-steel-900/50 border border-steel-700/50">
            <p className="text-white font-medium">
              Governance isn't about slowing teams down.
              It's about making sure every image that leaves represents the standard you set.
            </p>
          </div>
        </div>
      </section>

      {/* What Governance Looks Like */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            What Image Governance Actually Looks Like
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            ContextEmbed's governance layer is optional, configurable, and enforced
            at the only moment that matters — before export.
          </p>

          <div className="space-y-6">
            <div className="p-6 bg-steel-900/50 border border-steel-700/50">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-violet-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-white mb-2">Export Rules</h3>
                  <p className="text-steel-400 mb-3">
                    Define what must be present before an image can be exported.
                    No copyright field? Export blocked. No description? Export blocked.
                    Rules are project-level — different projects, different requirements.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-violet-900/20 text-violet-400 text-xs font-mono">
                      REQUIRE: Creator
                    </span>
                    <span className="px-2 py-1 bg-violet-900/20 text-violet-400 text-xs font-mono">
                      REQUIRE: Copyright
                    </span>
                    <span className="px-2 py-1 bg-violet-900/20 text-violet-400 text-xs font-mono">
                      REQUIRE: Description
                    </span>
                    <span className="px-2 py-1 bg-violet-900/20 text-violet-400 text-xs font-mono">
                      REQUIRE: Keywords ≥ 3
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-steel-900/50 border border-steel-700/50">
              <div className="flex items-start gap-4">
                <Palette className="w-6 h-6 text-brand-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-white mb-2">Brand Consistency</h3>
                  <p className="text-steel-400 mb-3">
                    Set default values for copyright holder, credit line format,
                    and usage terms across all projects. Every image that leaves
                    carries your brand's metadata signature.
                  </p>
                  <div className="p-3 bg-black/40 border border-steel-800/50 font-mono text-xs text-steel-400">
                    <p>Copyright: © 2025 Acme Studio. All rights reserved.</p>
                    <p>Credit: Acme Studio / [Photographer Name]</p>
                    <p>Usage: Licensed for editorial use only.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-steel-900/50 border border-steel-700/50">
              <div className="flex items-start gap-4">
                <FileCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-white mb-2">Export Profiles</h3>
                  <p className="text-steel-400 mb-3">
                    Different destinations need different metadata. Define profiles
                    for web, print, stock submission, and internal archive — each with
                    its own field requirements and format rules.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Web Export', fields: 'IPTC + Keywords' },
                      { name: 'Print Archive', fields: 'Full IPTC + XMP' },
                      { name: 'Stock Submit', fields: 'IPTC + Model Release' },
                      { name: 'Internal', fields: 'All + Audit Trail' },
                    ].map((profile) => (
                      <div key={profile.name} className="p-2 bg-black/30 border border-steel-800/30">
                        <p className="text-white text-xs font-bold">{profile.name}</p>
                        <p className="text-steel-500 text-xs">{profile.fields}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-steel-900/50 border border-steel-700/50">
              <div className="flex items-start gap-4">
                <BarChart3 className="w-6 h-6 text-sky-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-white mb-2">Audit & Reporting</h3>
                  <p className="text-steel-400">
                    Every export is logged. Every governance check is recorded.
                    When compliance questions come — and they will — you have
                    a timestamped trail of what was checked, what passed, and what was blocked.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DAM Compatibility */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            DAM Compatibility
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            ContextEmbed isn't a DAM. It's the metadata layer that makes your DAM work properly.
          </p>

          <div className="space-y-4 mb-10">
            <div className="flex items-start gap-4 p-4 bg-black/40 border border-steel-800/50">
              <Workflow className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">Upstream Processing</p>
                <p className="text-steel-400 text-sm">
                  Process images through ContextEmbed before they enter your DAM.
                  Every file arrives with structured, standards-compliant metadata already embedded.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-black/40 border border-steel-800/50">
              <Layers className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">Standards-First</p>
                <p className="text-steel-400 text-sm">
                  IPTC Core, IPTC Extension, XMP Dublin Core — written by ExifTool.
                  Compatible with Adobe Bridge, Photo Mechanic, Capture One,
                  and any DAM that reads standard metadata.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-black/40 border border-steel-800/50">
              <Download className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">Batch Export</p>
                <p className="text-steel-400 text-sm">
                  Export entire projects as metadata-enriched archives.
                  Web Packs, case study packs, and raw exports — all with
                  governance checks applied.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-10">
            Built For Teams That Ship At Scale
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                title: 'Creative Agencies',
                points: [
                  'Multi-client metadata standards',
                  'Per-project governance rules',
                  'Branded export profiles',
                ],
              },
              {
                title: 'Media Companies',
                points: [
                  'Rights enforcement at export',
                  'Contributor credit tracking',
                  'Compliance audit trails',
                ],
              },
              {
                title: 'Enterprise Marketing',
                points: [
                  'Brand metadata consistency',
                  'Cross-department standards',
                  'DAM integration pipeline',
                ],
              },
            ].map((persona) => (
              <div key={persona.title} className="p-5 bg-steel-900/50 border border-steel-700/50">
                <h3 className="font-bold text-white mb-4">{persona.title}</h3>
                <ul className="space-y-2">
                  {persona.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-steel-400">
                      <Check className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Control What Leaves Your System
          </h2>
          <p className="text-steel-400 mb-8 max-w-xl mx-auto">
            Governance isn't overhead. It's the difference between
            shipping images and shipping assets.
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
            href="/pillars/wordpress-alt-text"
            className="group flex-1 flex items-center gap-4 p-6 border border-steel-700/50 hover:border-sky-600/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:-translate-x-1 transition-all" />
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Previous
              </p>
              <p className="text-white font-bold text-sm group-hover:text-sky-300 transition-colors">
                WordPress Alt Text
              </p>
            </div>
          </Link>
          <Link
            href="/pillars/provenance-archive"
            className="group flex-1 flex items-center justify-between p-6 border border-steel-700/50 hover:border-rose-600/50 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Next
              </p>
              <p className="text-white font-bold text-sm group-hover:text-rose-300 transition-colors">
                Provenance Archive
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </section>
    </>
  );
}
