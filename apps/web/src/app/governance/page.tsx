import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { 
  ArrowRight, 
  Check,
  Shield,
  AlertTriangle,
  Lock,
  FileCheck,
  Eye,
  Ban,
  FileText,
  Scale,
  Building,
} from 'lucide-react';

export default function GovernancePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="full" size="md" dark={false} />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors"
            >
              Try Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium mb-8">
              <Shield className="h-4 w-4" />
              Enterprise Feature
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
              When Discovery<br />Isn't Enough
            </h1>
            <p className="text-xl text-slate-500 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Some teams don't just need metadata. They need control.
            </p>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-12">
              ContextEmbed includes an optional governance layer that enforces rules <span className="text-slate-900 dark:text-white font-medium">before export</span> — not after damage.
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6">
              The Risk Nobody Talks About
            </h2>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              Metadata embedding solves discoverability. But for some organisations, the wrong image leaving the building is worse than no image at all.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <div className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mb-3" />
                <p className="text-slate-900 dark:text-white font-medium mb-2">Someone uploaded the wrong thing</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">An image with legal restrictions went live.</p>
              </div>
              <div className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mb-3" />
                <p className="text-slate-900 dark:text-white font-medium mb-2">Usage context was ignored</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Editorial-only content used commercially.</p>
              </div>
              <div className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mb-3" />
                <p className="text-slate-900 dark:text-white font-medium mb-2">Attribution was missing</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Licensed content went out without credit.</p>
              </div>
              <div className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mb-3" />
                <p className="text-slate-900 dark:text-white font-medium mb-2">Nobody can prove what happened</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">When legal asks, the trail goes cold.</p>
              </div>
            </div>
            
            <p className="text-slate-900 dark:text-white font-medium text-center text-lg">
              Governance isn't about adding more work.<br />
              <span className="text-brand-600 dark:text-brand-400">It's about preventing the work you'll regret.</span>
            </p>
          </div>
        </section>

        {/* What Governance Does */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6">
              What the Governance Layer Does
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 mb-10">
              Think of it as a quality gate between your images and the outside world. It checks each file before export against your rules — and blocks anything that shouldn't leave.
            </p>
            
            <div className="space-y-4 mb-10">
              <div className="flex items-start gap-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <Ban className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Block risky images from leaving</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">If an image doesn't meet your export criteria, it doesn't export. Simple.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Enforce usage intent</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Define what's allowed vs. restricted — commercial, editorial, internal only.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <Lock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Keep ownership & rights consistent</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Automatically embed copyright, attribution, and licensing data.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <Eye className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Full audit trail</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Every export, every rule check, every decision — logged and queryable.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Extend beyond IPTC limits</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Add custom governance fields that don't fit standard metadata specs.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-10">
              Who Needs This
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <Building className="h-6 w-6 text-slate-600 dark:text-slate-400 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Media & Publishing</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Enforce editorial vs. commercial usage. Ensure attribution travels with every file.</p>
              </div>
              
              <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <Scale className="h-6 w-6 text-slate-600 dark:text-slate-400 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Legal & Compliance</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Prove what was embedded, when, and under what rules. Full provenance for audits.</p>
              </div>
              
              <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <FileText className="h-6 w-6 text-slate-600 dark:text-slate-400 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Brand & Marketing</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Prevent unapproved assets from reaching partners or public channels.</p>
              </div>
              
              <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <Shield className="h-6 w-6 text-slate-600 dark:text-slate-400 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">AI Training Controls</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Flag images that shouldn't be used for machine learning or AI training.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-10">
              How It Works
            </h2>
            
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                  <span className="text-white dark:text-slate-900 font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Define your rules</h3>
                  <p className="text-slate-600 dark:text-slate-400">Set up governance policies during onboarding or project setup. Define what must be present, what's forbidden, and what triggers a block.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                  <span className="text-white dark:text-slate-900 font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Images are checked pre-export</h3>
                  <p className="text-slate-600 dark:text-slate-400">Before any file leaves ContextEmbed, the governance layer validates it against your rules. If it fails, it's held back with a clear reason.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                  <span className="text-white dark:text-slate-900 font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Everything is logged</h3>
                  <p className="text-slate-600 dark:text-slate-400">Exports, blocks, overrides — every decision creates an audit record. When someone asks "who approved this?", you'll have the answer.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                  <span className="text-white dark:text-slate-900 font-bold">4</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Clean exports, every time</h3>
                  <p className="text-slate-600 dark:text-slate-400">Files that pass governance are exported with full context and compliance data embedded. No post-processing needed.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Not For Everyone */}
        <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6">
              This Isn't for Everyone
            </h2>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              If you just need smart metadata, the core product is enough.<br />
              Governance is optional — designed for teams where "oops" isn't acceptable.
            </p>
            
            <div className="inline-flex flex-wrap justify-center gap-3 mb-10">
              <span className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm border border-slate-200 dark:border-slate-700">Not bundled by default</span>
              <span className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm border border-slate-200 dark:border-slate-700">Not more admin</span>
              <span className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm border border-slate-200 dark:border-slate-700">Guardrails that actually work</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6">
              Ready to Add Governance?
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 mb-10">
              Governance is available for teams and enterprise customers.<br />
              Let's talk about your requirements.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="mailto:hello@contextembed.com?subject=Governance%20Inquiry"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors"
              >
                Contact Us
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/pricing"
                className="px-6 py-3 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-slate-500 dark:text-slate-500">
          © {new Date().getFullYear()} ContextEmbed
        </div>
      </footer>
    </div>
  );
}
