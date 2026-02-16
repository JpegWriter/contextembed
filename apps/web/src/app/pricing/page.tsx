import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { 
  ArrowRight, 
  Check,
  Sparkles,
  Download,
  Camera,
  Shield,
} from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="full" size="md" dark={false} />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/governance"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Governance
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
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
              Own the Workflow.<br />Not the Subscription.
            </h1>
            <p className="text-2xl text-slate-600 dark:text-slate-400 mb-8">
              No metered usage. No per-image anxiety.
            </p>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
              ContextEmbed is built to be <span className="text-slate-900 dark:text-white font-medium">owned</span> — not rented.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
              <span>Pay once.</span>
              <span className="hidden sm:inline">•</span>
              <span>Bring your own OpenAI key.</span>
              <span className="hidden sm:inline">•</span>
              <span>Use it forever.</span>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Free Tier */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Start Free</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Web App</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">€0</span>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Perfect for trying it properly.
                </p>
                
                <div className="space-y-3 mb-8">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Includes</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      3 image exports per project
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Full context embedding
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Live onboarding & discovery
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      BYOK (Bring Your Own OpenAI Key)
                    </li>
                  </ul>
                </div>
                
                <p className="text-xs text-slate-500 dark:text-slate-500 mb-4">
                  No card. No pressure.
                </p>
                
                <Link
                  href="/login"
                  className="block w-full py-3 text-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors"
                >
                  Try Free
                </Link>
              </div>

              {/* Lifetime Pro */}
              <div className="p-6 bg-brand-50 dark:bg-brand-900/20 rounded-2xl border-2 border-brand-500 dark:border-brand-400 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-brand-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center">
                    <Download className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Lifetime License</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Pay Once, Own Forever</p>
                  </div>
                </div>
                
                <div className="mb-2">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">€249</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2">one-time</span>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Own the software. Use your own API key.
                </p>
                
                <div className="space-y-3 mb-8">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Includes</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Unlimited exports
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      BYOK: Bring Your Own OpenAI Key
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Elite-grade context embedding
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Full IPTC/XMP compliance
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Persistent memory per project
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Desktop app (coming soon)
                    </li>
                  </ul>
                </div>
                
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  No subscriptions. No usage limits. Your key, your costs.
                </p>
                
                <Link
                  href="/login?plan=pro"
                  className="block w-full py-3 text-center text-white font-medium transition-colors btn-gradient-border"
                >
                  Buy Lifetime License
                </Link>
              </div>

              {/* Lifetime + RAW */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Studio License</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Teams & Advanced Use</p>
                  </div>
                </div>
                
                <div className="mb-2">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">€499</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2">one-time</span>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  For teams who need governance & control.
                </p>
                
                <div className="space-y-3 mb-8">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Everything in Lifetime, plus</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Governance layer access
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Pre-export rule enforcement
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Full audit trails
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Usage intent enforcement
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                      Priority support
                    </li>
                  </ul>
                </div>
                
                <p className="text-xs text-slate-500 dark:text-slate-500 mb-4">
                  The version for teams where "oops" isn't acceptable.
                </p>
                
                <Link
                  href="/login?plan=studio"
                  className="block w-full py-3 text-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors"
                >
                  Buy Studio License
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* BYOK Explainer */}
        <section className="py-16 px-6 bg-brand-50 dark:bg-brand-900/20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Why "Bring Your Own Key"?
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              ContextEmbed uses OpenAI's vision models to understand your images. Instead of charging you per-image, we let you use your own API key.
            </p>
            
            <div className="grid sm:grid-cols-3 gap-6 mb-8">
              <div className="p-5 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-3xl font-bold text-brand-600 dark:text-brand-400 mb-2">~€0.01</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">per image (typical cost)</p>
              </div>
              <div className="p-5 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-3xl font-bold text-brand-600 dark:text-brand-400 mb-2">No markup</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">pay OpenAI directly</p>
              </div>
              <div className="p-5 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-3xl font-bold text-brand-600 dark:text-brand-400 mb-2">No limits</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">process as many as you want</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-500">
              You control your costs. We handle the workflow.
            </p>
          </div>
        </section>

        {/* Optional Add-ons */}
        <section className="py-16 px-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              What About Updates?
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Your license never expires. New features and improvements are included for the first year. After that, updates are optional — your version keeps working forever.
            </p>
            
            <div className="inline-flex flex-wrap justify-center gap-3">
              <span className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm border border-slate-200 dark:border-slate-700">No forced upgrades</span>
              <span className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm border border-slate-200 dark:border-slate-700">No subscription traps</span>
              <span className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm border border-slate-200 dark:border-slate-700">Your software, your terms</span>
            </div>
          </div>
        </section>

        {/* Governance & API */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="p-8 bg-slate-100 dark:bg-slate-800/50 rounded-2xl text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Governance & API <span className="text-slate-400 font-normal">(Advanced Use)</span>
              </h2>
              
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Some teams need more than exports.
              </p>
              
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                <span className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm">Governance rules</span>
                <span className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm">Usage enforcement</span>
                <span className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm">API access</span>
                <span className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm">Custom workflows</span>
              </div>
              
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
                These are not forced into the base product.
              </p>
              
              <div className="flex items-center justify-center gap-4">
                <Link href="/governance" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                  Governance →
                </Link>
                <Link href="/api" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                  API →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Summary Table */}
        <section className="py-16 px-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">
              Pricing Summary
            </h2>
            
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Plan</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Best For</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800/50">
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">Free (Web App)</td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">€0</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">Trying it properly</td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-700 bg-brand-50/50 dark:bg-brand-900/10">
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 font-medium">Lifetime License</td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">€249</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">Most users (BYOK)</td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">Studio License</td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">€499</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">Teams + Governance</td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">OpenAI API (BYOK)</td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">~€0.01/image</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">You pay OpenAI directly</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* One Last Thing */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
              One Last Thing
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 mb-6">You'll never need to:</p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">Learn IPTC</span>
              <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">Guess what to write</span>
              <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">Copy captions again</span>
              <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">Redo this work later</span>
            </div>
            
            <div className="space-y-2 text-slate-600 dark:text-slate-400 mb-10">
              <p>You do it once.</p>
              <p>It sticks.</p>
              <p className="text-slate-900 dark:text-white font-medium">Your images carry it forever.</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors"
              >
                Try Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="px-6 py-3 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                View Features
              </Link>
              <Link
                href="/login?plan=pro"
                className="px-6 py-3 text-brand-600 dark:text-brand-400 font-medium hover:underline transition-colors"
              >
                Buy Lifetime
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
