import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { 
  ArrowRight, 
  X,
  Check,
  Eye,
  EyeOff,
  Brain,
  Shield,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="border-b border-steel-700/50">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo variant="full" size="md" dark={true} />
          </div>
          <div className="flex items-center gap-6">
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
              className="px-4 py-2 bg-brand-600 border border-brand-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-brand-500 transition-colors"
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
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Embed Authority.<br />Not Just Metadata.
            </h1>
            <p className="text-xl text-steel-400 mb-12 max-w-2xl mx-auto">
              Because copying one caption onto 1,000 images isn't strategy.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 border border-brand-500 text-white font-bold uppercase tracking-wider hover:bg-brand-500 transition-colors shadow-glow-green"
            >
              Try ContextEmbed Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Let's Be Honest */}
        <section className="py-20 px-6 bg-steel-900/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-10">
              Let's be honest.
            </h2>
            
            <div className="space-y-4 text-lg text-steel-400 mb-10">
              <p>Most people rush metadata.</p>
              <p>Some ignore it completely.</p>
              <p>Almost nobody understands it.</p>
              <p>And everyone hopes they never have to think about it again.</p>
            </div>
            
            <p className="text-white font-medium text-lg mb-6">
              That's why most images look great —<br />
              and then quietly disappear.
            </p>
            
            <div className="mt-10 p-6 bg-black border border-steel-700/50">
              <p className="text-white font-medium mb-3">
                ContextEmbed fixes the job everyone hates
              </p>
              <p className="text-steel-400">
                and turns your images into clear, authoritative signals that machines actually understand.
              </p>
              <p className="text-brand-400 font-medium mt-4">
                Not later. Not manually. Not with guesswork.
              </p>
            </div>
          </div>
        </section>

        {/* The Problem Nobody Wants to Own */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              The Problem Nobody Wants to Own
            </h2>
            <p className="text-xl text-steel-400 mb-10">Metadata became a chore.</p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="p-4 bg-steel-800/50 ">
                <p className="text-steel-400 italic">"What is IPTC anyway?"</p>
              </div>
              <div className="p-4 bg-steel-800/50 ">
                <p className="text-steel-400 italic">"What am I supposed to write here?"</p>
              </div>
              <div className="p-4 bg-steel-800/50 ">
                <p className="text-steel-400 italic">"This will do for now…"</p>
              </div>
              <div className="p-4 bg-steel-800/50 ">
                <p className="text-steel-400 italic">"I'll come back to it later."</p>
              </div>
            </div>
            
            <div className="space-y-3 text-steel-400 mb-10">
              <p>Adobe didn't help.</p>
              <p>Legacy tools didn't evolve.</p>
              <p>Presets tried to force square answers into round images.</p>
            </div>
            
            <p className="text-white font-medium mb-4">So metadata became:</p>
            <div className="flex flex-wrap gap-3 mb-10">
              <span className="px-4 py-2 bg-red-900/30 text-red-400  text-sm font-medium">Generic</span>
              <span className="px-4 py-2 bg-red-900/30 text-red-400  text-sm font-medium">Repetitive</span>
              <span className="px-4 py-2 bg-red-900/30 text-red-400  text-sm font-medium">Disposable</span>
            </div>
            
            <div className="p-6 bg-amber-900/20 border border-amber-800/50 ">
              <p className="text-amber-200 font-medium mb-2">And the result?</p>
              <p className="text-amber-300">
                Over <span className="font-bold">70% of images</span> are effectively invisible to search engines, AI systems, and discovery layers — not because they're bad, but because they carry no usable meaning.
              </p>
            </div>
          </div>
        </section>

        {/* Context Is What Makes Images Work */}
        <section className="py-20 px-6 bg-steel-900/20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Context Is What Makes Images Work
            </h2>
            
            <div className="space-y-3 text-lg text-steel-400 mb-10">
              <p>Search engines don't admire aesthetics.</p>
              <p>AI systems don't guess intent.</p>
              <p className="text-white font-medium">Machines rely on signals.</p>
            </div>
            
            <div className="p-6 bg-steel-800/50  border border-steel-700/50 mb-10">
              <p className="font-semibold text-white mb-4">A properly embedded image:</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-brand-400 flex-shrink-0" />
                  <span className="text-steel-300">Explains what it shows</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-brand-400 flex-shrink-0" />
                  <span className="text-steel-300">Declares why it exists</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-brand-400 flex-shrink-0" />
                  <span className="text-steel-300">Signals relevance and ownership</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-brand-400 flex-shrink-0" />
                  <span className="text-steel-300">Survives reuse and re-upload</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-brand-400 flex-shrink-0" />
                  <span className="text-steel-300">Gets understood, not misread</span>
                </li>
              </ul>
            </div>
            
            <div className="text-center">
              <p className="text-steel-400 mb-2">This is the difference between:</p>
              <div className="flex items-center justify-center gap-4 text-lg">
                <span className="text-steel-400">an image being <span className="font-medium">seen</span></span>
                <span className="text-steel-400">and</span>
                <span className="text-white font-bold">an image being understood</span>
              </div>
            </div>
          </div>
        </section>

        {/* What ContextEmbed Actually Does */}
        <section id="how-it-works" className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              What ContextEmbed Actually Does
            </h2>
            <p className="text-steel-400 mb-10">
              ContextEmbed doesn't "add a caption".
            </p>
            
            <p className="text-lg text-white font-medium mb-6">
              It understands each image and embeds elite-grade context directly into the file:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-10">
              <div className="flex items-start gap-3 p-4 bg-steel-800/30 ">
                <Eye className="h-5 w-5 text-brand-400 mt-0.5 flex-shrink-0" />
                <span className="text-steel-300">Clear subject interpretation</span>
              </div>
              <div className="flex items-start gap-3 p-4 bg-steel-800/30 ">
                <Brain className="h-5 w-5 text-brand-400 mt-0.5 flex-shrink-0" />
                <span className="text-steel-300">Intent and use-case alignment</span>
              </div>
              <div className="flex items-start gap-3 p-4 bg-steel-800/30 ">
                <Sparkles className="h-5 w-5 text-brand-400 mt-0.5 flex-shrink-0" />
                <span className="text-steel-300">Descriptions tuned for machines, not fluff</span>
              </div>
              <div className="flex items-start gap-3 p-4 bg-steel-800/30 ">
                <Shield className="h-5 w-5 text-brand-400 mt-0.5 flex-shrink-0" />
                <span className="text-steel-300">Consistent IPTC / XMP embedding</span>
              </div>
            </div>
            
            <p className="text-white font-medium text-center text-lg mb-6">
              One image, one voice.
            </p>
            
            <div className="text-center text-steel-400 mb-6">
              <p>No bulk guessing.</p>
              <p>No one-size-fits-all presets.</p>
            </div>
            
            <p className="text-brand-400 font-medium text-center text-lg">
              Every image leaves the system ready to perform.
            </p>
          </div>
        </section>

        {/* Try It Right Now */}
        <section className="py-20 px-6 bg-brand-950/20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Try It Right Now <span className="text-brand-400">(Free)</span>
            </h2>
            <p className="text-steel-400 mb-8">
              ContextEmbed is a live web app — not a concept.
            </p>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-sm">
              <div className="p-4 bg-steel-800/50 ">
                <p className="font-medium text-white">3 free exports</p>
                <p className="text-steel-400">per domain</p>
              </div>
              <div className="p-4 bg-steel-800/50 ">
                <p className="font-medium text-white">Instant onboarding</p>
                <p className="text-steel-400">or discovery</p>
              </div>
              <div className="p-4 bg-steel-800/50 ">
                <p className="font-medium text-white">No setup manuals</p>
                <p className="text-steel-400">just upload</p>
              </div>
              <div className="p-4 bg-steel-800/50 ">
                <p className="font-medium text-white">No expertise</p>
                <p className="text-steel-400">required</p>
              </div>
            </div>
            
            <div className="space-y-2 text-steel-400 mb-8">
              <p>Upload an image.</p>
              <p>Export it properly embedded.</p>
              <p className="font-medium text-white">See the difference immediately.</p>
            </div>
            
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium  hover:bg-slate-800 dark:hover:bg-brand-500 transition-colors"
            >
              Try ContextEmbed Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* You'll Never Have to Think About This Again */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              You'll Never Have to Think About This Again
            </h2>
            
            <p className="text-steel-400 mb-6">
              While you use ContextEmbed, it quietly learns:
            </p>
            
            <div className="flex flex-wrap gap-3 mb-10">
              <span className="px-4 py-2 bg-steel-800/50 text-steel-300 ">Your style</span>
              <span className="px-4 py-2 bg-steel-800/50 text-steel-300 ">Your intent</span>
              <span className="px-4 py-2 bg-steel-800/50 text-steel-300 ">Your typical image use-cases</span>
            </div>
            
            <p className="text-white font-medium mb-6">
              That knowledge is stored as persistent memory.
            </p>
            
            <div className="p-6 bg-steel-800/30  mb-6">
              <p className="font-semibold text-white mb-4">So next time?</p>
              <ul className="space-y-2 text-steel-400">
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-steel-400" />
                  You don't explain anything
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-steel-400" />
                  You don't rewrite anything
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-steel-400" />
                  You don't guess what to type
                </li>
              </ul>
            </div>
            
            <p className="text-lg text-white font-medium">
              You just export.
            </p>
            <p className="text-brand-400 font-medium">
              The system remembers — so you don't have to.
            </p>
          </div>
        </section>

        {/* When the Signals Start Working */}
        <section className="py-20 px-6 bg-steel-900/20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              When the Signals Start Working
            </h2>
            <p className="text-steel-400 mb-10">
              This is the part people notice later.
            </p>
            
            <p className="text-lg text-white font-medium mb-6">
              Your images don't just look good anymore.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <div className="flex items-center gap-3 p-4 bg-steel-800/50 ">
                <Check className="h-5 w-5 text-brand-400 flex-shrink-0" />
                <span className="text-steel-300">Explain themselves to machines</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-steel-800/50 ">
                <Check className="h-5 w-5 text-brand-400 flex-shrink-0" />
                <span className="text-steel-300">Get indexed correctly</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-steel-800/50 ">
                <Check className="h-5 w-5 text-brand-400 flex-shrink-0" />
                <span className="text-steel-300">Resurface where they should</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-steel-800/50 ">
                <Check className="h-5 w-5 text-brand-400 flex-shrink-0" />
                <span className="text-steel-300">Travel with consistent meaning</span>
              </div>
            </div>
            
            <div className="space-y-2 text-steel-400 mb-6">
              <p>Visibility improves.</p>
              <p>Reuse gets cleaner.</p>
              <p>Mistakes drop.</p>
            </div>
            
            <p className="text-white mb-6">
              Not because you worked harder —<br />
              but because your images finally say the right thing.
            </p>
            
            <div className="text-center">
              <p className="text-steel-400">They don't whisper.</p>
              <p className="text-2xl font-bold text-brand-400 mt-2">They sing.</p>
            </div>
          </div>
        </section>

        {/* Governance */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Governance <span className="text-steel-400 font-normal">(When "Oops" Isn't Acceptable)</span>
            </h2>
            
            <div className="space-y-3 text-steel-400 mb-8">
              <p>Some teams need more than discovery.</p>
              <p className="text-white font-medium">They need control.</p>
            </div>
            
            <p className="text-steel-400 mb-6">
              ContextEmbed includes an optional governance layer that helps enforce rules before export, not after damage:
            </p>
            
            <ul className="space-y-3 mb-10">
              <li className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-brand-400 mt-0.5 flex-shrink-0" />
                <span className="text-steel-300">Block risky images from leaving the workflow</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-brand-400 mt-0.5 flex-shrink-0" />
                <span className="text-steel-300">Enforce usage intent (what's allowed vs not)</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-brand-400 mt-0.5 flex-shrink-0" />
                <span className="text-steel-300">Keep ownership, rights, and attribution consistent</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-brand-400 mt-0.5 flex-shrink-0" />
                <span className="text-steel-300">Reduce "someone uploaded the wrong thing" incidents</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-brand-400 mt-0.5 flex-shrink-0" />
                <span className="text-steel-300">Extend beyond the limits of traditional metadata</span>
              </li>
            </ul>
            
            <p className="text-white font-medium">
              It's not more admin.<br />
              <span className="text-brand-400">It's guardrails that actually work.</span>
            </p>
          </div>
        </section>

        {/* Built for People Who Ship Images */}
        <section className="py-20 px-6 bg-steel-900/20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-10">
              Built for People Who Ship Images
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <div className="p-6 bg-steel-800/50  border border-steel-700/50">
                <h3 className="font-semibold text-steel-400 mb-4 text-sm uppercase tracking-wide">
                  Legacy Tools
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <X className="h-5 w-5 text-steel-400 flex-shrink-0 mt-0.5" />
                    <span className="text-steel-400">Optional metadata panels</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="h-5 w-5 text-steel-400 flex-shrink-0 mt-0.5" />
                    <span className="text-steel-400">Generic presets</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="h-5 w-5 text-steel-400 flex-shrink-0 mt-0.5" />
                    <span className="text-steel-400">Easy to skip</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="h-5 w-5 text-steel-400 flex-shrink-0 mt-0.5" />
                    <span className="text-steel-400">Easy to mess up</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-brand-950/20 border border-cyan-200 dark:border-cyan-800 ">
                <h3 className="font-semibold text-brand-400 mb-4 text-sm uppercase tracking-wide">
                  ContextEmbed
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-brand-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white font-medium">Intent captured once</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-brand-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white font-medium">Every image evaluated</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-brand-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white font-medium">Meaning embedded automatically</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-brand-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white font-medium">No cleanup later</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-center text-steel-400">
              No policing. No judgement. Just images that leave your system ready to perform.
            </p>
          </div>
        </section>

        {/* If Images Represent Your Business */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              If Images Represent Your Business
            </h2>
            <p className="text-xl text-steel-400 mb-10">
              They shouldn't be silent.
            </p>
            
            <p className="text-steel-300 mb-6">ContextEmbed turns images into:</p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <span className="px-5 py-2 bg-brand-900/30 text-brand-400  font-medium">Discoverable assets</span>
              <span className="px-5 py-2 bg-brand-900/30 text-brand-400  font-medium">Trustable signals</span>
              <span className="px-5 py-2 bg-brand-900/30 text-brand-400  font-medium">Long-term authority carriers</span>
            </div>
            
            <p className="text-steel-400 mb-2">
              Metadata was never the goal.
            </p>
            <p className="text-xl font-bold text-white">
              Understanding is.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-6 bg-steel-900">
          <div className="max-w-3xl mx-auto text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 border border-brand-500 text-white font-bold uppercase tracking-wider hover:bg-brand-500 transition-colors text-lg mb-6 shadow-glow-green-lg"
            >
              Try ContextEmbed Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="text-steel-400 font-mono text-sm">
              3 exports • live web app • no guessing
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-steel-700/50 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-steel-500 font-mono">
          © {new Date().getFullYear()} ContextEmbed
        </div>
      </footer>
    </div>
  );
}
