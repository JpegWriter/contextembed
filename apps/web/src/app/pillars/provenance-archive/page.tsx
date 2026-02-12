import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ArrowLeft,
  Archive,
  Check,
  Clock,
  FileText,
  Shield,
  Fingerprint,
  GitBranch,
  Scale,
  Globe,
  Lock,
  Eye,
  Database,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Building a Verified Image Archive from Day One',
  description:
    'Opt-in authorship records, versioned exports, timeline evidence, and legal defensibility — the archive that proves you were first.',
};

export default function ProvenanceArchivePage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-900/30 text-rose-400 text-xs font-bold uppercase tracking-widest font-mono mb-6">
            <Archive className="h-3 w-3" />
            The Long Game
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Building a Verified<br />Image Archive<br />from Day One
          </h1>
          <p className="text-xl text-steel-400 max-w-2xl">
            Authorship isn't something you prove after a dispute.
            It's something you establish before one ever happens.
            The provenance archive is the record that says — with timestamps,
            metadata snapshots, and export history — you were here first.
          </p>
        </div>
      </section>

      {/* The Problem With "Proof" */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            The Problem With Proving Anything After the Fact
          </h2>

          <div className="space-y-4 text-lg text-steel-400 mb-10">
            <p>
              Someone uses your image without credit. You want to prove it's yours.
            </p>
            <p>Where's the evidence?</p>
          </div>

          <div className="space-y-3 mb-10">
            {[
              {
                label: 'Original file on your hard drive',
                problem: 'Easy to fabricate. Timestamps can be modified.',
              },
              {
                label: 'Social media post date',
                problem: 'Platforms strip metadata. No embedded proof of authorship.',
              },
              {
                label: 'Lightroom catalogue',
                problem: 'Local database. Not independently verifiable.',
              },
              {
                label: 'Email to yourself',
                problem: 'Weak evidence. No structured metadata snapshot.',
              },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-red-900/10 border border-red-800/20">
                <p className="text-white font-medium text-sm mb-1">{item.label}</p>
                <p className="text-steel-500 text-xs">{item.problem}</p>
              </div>
            ))}
          </div>

          <div className="p-6 bg-amber-900/15 border border-amber-800/40">
            <p className="text-amber-300 font-medium mb-2">
              The truth is uncomfortable:
            </p>
            <p className="text-steel-400">
              Most photographers have no verifiable, structured, timestamped record
              of their authorship. They only realise this when they need one.
            </p>
          </div>
        </div>
      </section>

      {/* The Archive Model */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            The Provenance Archive Model
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            ContextEmbed is building toward an opt-in archive that creates a
            verifiable record of authorship — not after the fact, but at the
            moment of processing.
          </p>

          <div className="space-y-6">
            <div className="p-6 bg-steel-900/50 border border-steel-700/50">
              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-rose-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-white mb-2">Timeline Records</h3>
                  <p className="text-steel-400 mb-3">
                    Every image processed through ContextEmbed gets a timestamped
                    record: when it was uploaded, when it was analysed, when metadata
                    was generated, and when it was exported. This creates a chronological
                    chain of evidence.
                  </p>
                  <div className="p-3 bg-black/40 border border-steel-800/50 font-mono text-xs space-y-1">
                    <p className="text-steel-500">2025-06-14T09:32:11Z — uploaded</p>
                    <p className="text-steel-500">2025-06-14T09:32:18Z — AI analysis complete</p>
                    <p className="text-steel-500">2025-06-14T09:32:24Z — metadata embedded</p>
                    <p className="text-steel-500">2025-06-14T09:33:01Z — exported (Web Pack)</p>
                    <p className="text-emerald-400">2025-06-14T09:33:01Z — archive record created</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-steel-900/50 border border-steel-700/50">
              <div className="flex items-start gap-4">
                <GitBranch className="w-6 h-6 text-brand-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-white mb-2">Versioned Exports</h3>
                  <p className="text-steel-400">
                    Each export creates a new version record. If you re-process an image
                    with updated context, both versions are retained — the original
                    and the revision. The archive shows the evolution, not just the
                    final state.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-steel-900/50 border border-steel-700/50">
              <div className="flex items-start gap-4">
                <Fingerprint className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-white mb-2">Content Fingerprinting</h3>
                  <p className="text-steel-400">
                    A cryptographic hash of the image content is stored alongside
                    the metadata snapshot. This links the visual content to the
                    authorship record in a way that can't be retroactively fabricated.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-steel-900/50 border border-steel-700/50">
              <div className="flex items-start gap-4">
                <FileText className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-white mb-2">Metadata Snapshots</h3>
                  <p className="text-steel-400">
                    The full metadata state at the time of export is captured and stored:
                    every IPTC field, every XMP property, every keyword.
                    Not just that metadata existed — what it contained.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Defensibility */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Legal Defensibility
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            An archive is only useful if it's defensible. That means structure,
            immutability, and independent verifiability.
          </p>

          <div className="space-y-4">
            {[
              {
                icon: Scale,
                title: 'First-Party Evidence',
                description:
                  'Timestamped metadata snapshots stored in a system you control — not a social platform that can change its terms or delete your account.',
                color: 'text-rose-400',
              },
              {
                icon: Lock,
                title: 'Immutable Records',
                description:
                  'Once an archive record is created, it cannot be modified or deleted. Revisions create new records — the original always persists.',
                color: 'text-amber-400',
              },
              {
                icon: Eye,
                title: 'Exportable Evidence',
                description:
                  'Archive records can be exported as structured JSON, CSV, or PDF — suitable for legal proceedings, DMCA claims, or copyright registration.',
                color: 'text-brand-400',
              },
              {
                icon: Database,
                title: 'Independent Storage',
                description:
                  'Archive data is stored separately from the image files themselves. Even if you delete a project, the provenance record remains.',
                color: 'text-emerald-400',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-5 bg-black/40 border border-steel-800/50">
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

      {/* The Vision */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            The Long-Term Vision
          </h2>
          <p className="text-steel-400 text-lg mb-10">
            The provenance archive is being built in stages. Here's where it's heading.
          </p>

          <div className="space-y-4 mb-10">
            {[
              {
                phase: 'Now',
                title: 'Processing Logs & Audit Trail',
                description:
                  'Every image processed through ContextEmbed is logged with timestamps, status changes, and export records. Available today.',
                status: 'live',
              },
              {
                phase: 'Next',
                title: 'Metadata Snapshots & Content Hashing',
                description:
                  'Full field-level snapshots at export time. Cryptographic hashes linking content to authorship records.',
                status: 'building',
              },
              {
                phase: 'Future',
                title: 'Public Verification & C2PA Integration',
                description:
                  'Optional public verification endpoints. Integration with C2PA/Content Credentials for cross-platform provenance.',
                status: 'planned',
              },
            ].map((item) => (
              <div key={item.phase} className="p-6 bg-steel-900/50 border border-steel-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider ${
                      item.status === 'live'
                        ? 'bg-emerald-900/30 text-emerald-400'
                        : item.status === 'building'
                          ? 'bg-amber-900/30 text-amber-400'
                          : 'bg-steel-800/50 text-steel-400'
                    }`}
                  >
                    {item.phase}
                  </span>
                  <h3 className="font-bold text-white">{item.title}</h3>
                </div>
                <p className="text-steel-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="p-6 bg-rose-900/15 border border-rose-800/40">
            <p className="text-rose-300 font-medium mb-2">
              This isn't a blockchain pitch.
            </p>
            <p className="text-steel-400">
              It's a practical, standards-based approach to provenance: structured metadata,
              timestamped records, cryptographic hashes, and exportable evidence.
              No tokens. No gas fees. Just proof that you were first.
            </p>
          </div>
        </div>
      </section>

      {/* Why Start Now */}
      <section className="py-20 px-6 bg-steel-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <Globe className="w-8 h-8 text-rose-400 mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Why Start Now?
          </h2>
          <div className="space-y-4 text-lg text-steel-400 max-w-2xl mx-auto mb-10">
            <p>
              Because the archive starts from the first image you process.
            </p>
            <p>
              Every image you don't process is a gap in your provenance record.
            </p>
            <p className="text-white font-medium">
              The best time to start building a verified archive was years ago.
              The second best time is today.
            </p>
          </div>

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
            href="/pillars/image-governance"
            className="group flex-1 flex items-center gap-4 p-6 border border-steel-700/50 hover:border-violet-600/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:-translate-x-1 transition-all" />
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Previous
              </p>
              <p className="text-white font-bold text-sm group-hover:text-violet-300 transition-colors">
                Image Governance
              </p>
            </div>
          </Link>
          <Link
            href="/pillars"
            className="group flex-1 flex items-center justify-between p-6 border border-steel-700/50 hover:border-brand-600/50 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-1 font-mono">
                Back to
              </p>
              <p className="text-white font-bold text-sm group-hover:text-brand-300 transition-colors">
                All Pillars
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-steel-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </section>
    </>
  );
}
