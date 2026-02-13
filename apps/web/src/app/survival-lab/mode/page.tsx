/**
 * Survival Lab — Guided Study Mode (Wizard Page)
 *
 * Three-column layout:
 *  Left   → StepRail (progress indicator)
 *  Center → StepPanel (per-step instructions + uploads)
 *  Right  → LiveResultCards (real-time scores)
 *
 * Session ID is stored in URL query param (?session=<id>) so the user
 * can refresh or share the link.
 */

'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FlaskConical, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase-provider';
import { survivalLabApi } from '@/lib/api';
import StepRail, { STEP_ORDER } from '@/components/survival/StepRail';
import StepPanel from '@/components/survival/StepPanel';
import LiveResultCards from '@/components/survival/LiveResultCards';
import toast from 'react-hot-toast';

interface Baseline {
  id: string;
  label: string;
  originalFilename: string;
  verified: boolean;
}

interface SessionData {
  id: string;
  title: string;
  status: string;
  currentStep: string;
  baselineIds: string[];
  platformSlugs: string[];
}

interface ScenarioResult {
  scenarioType: string;
  survivalScore: number;
  scoreV2?: number;
  survivalClass?: string;
  creatorOk: boolean;
  rightsOk: boolean;
  creditOk: boolean;
  descriptionOk: boolean;
}

interface LiveScenario {
  scenarioType: string;
  platformName: string;
  comparison: {
    survivalScore: number;
    scoreV2?: number;
    survivalClass?: string;
    creatorOk: boolean;
    rightsOk: boolean;
    creditOk: boolean;
    descriptionOk: boolean;
  };
}

export default function GuidedModePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    }>
      <GuidedModeInner />
    </Suspense>
  );
}

function GuidedModeInner() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [allResults, setAllResults] = useState<ScenarioResult[]>([]);
  const [liveScenarios, setLiveScenarios] = useState<LiveScenario[]>([]);
  const initialized = useRef(false);

  // ── Auth + Session bootstrap ──
  useEffect(() => {
    if (!supabase || initialized.current) return;
    initialized.current = true;
    bootstrap();
  }, [supabase]);

  async function bootstrap() {
    try {
      setLoading(true);
      if (!supabase) return;

      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        router.push('/login');
        return;
      }
      const accessToken = authSession.access_token;
      setToken(accessToken);

      // Load baselines
      const baselineRes = await survivalLabApi.listBaselines(accessToken);
      setBaselines(baselineRes.baselines || []);

      if (sessionParam) {
        // Restore existing session
        await loadSession(accessToken, sessionParam);
      } else {
        // Create new session
        const { session: newSession } = await survivalLabApi.studyStart(accessToken);
        setSession(newSession);
        // Update URL without hard nav
        router.replace(`/survival-lab/mode?session=${newSession.id}`);
      }
    } catch (err: any) {
      console.error('Bootstrap failed:', err);
      toast.error(err.message || 'Failed to start guided mode');
    } finally {
      setLoading(false);
    }
  }

  async function loadSession(accessToken: string, sessionId: string) {
    const detail = await survivalLabApi.studyGet(accessToken, sessionId);
    setSession(detail.session);

    // Reconstruct results from scenariosByType
    const results: ScenarioResult[] = [];
    const live: LiveScenario[] = [];
    if (detail.scenariosByType) {
      for (const [type, uploads] of Object.entries(detail.scenariosByType as Record<string, any[]>)) {
        for (const u of uploads) {
          if (u.comparison) {
            const comp = {
              survivalScore: u.comparison.survivalScore ?? 0,
              scoreV2: u.comparison.scoreV2,
              survivalClass: u.comparison.survivalClass,
              creatorOk: u.comparison.creatorOk ?? false,
              rightsOk: u.comparison.rightsOk ?? false,
              creditOk: u.comparison.creditOk ?? false,
              descriptionOk: u.comparison.descriptionOk ?? false,
            };
            results.push({ scenarioType: type, ...comp });
            live.push({ scenarioType: type, platformName: type, comparison: comp });
          }
        }
      }
    }
    setAllResults(results);
    setLiveScenarios(live);

    // Update baselines from session
    if (detail.baselines) {
      setBaselines(prev => {
        const sessionBaselines: Baseline[] = detail.baselines.map((b: any) => ({
          id: b.id,
          label: b.label,
          originalFilename: b.originalFilename,
          verified: b.verified ?? true,
        }));
        // Merge: keep existing, add any from session not already present
        const ids = new Set(prev.map(b => b.id));
        return [...prev, ...sessionBaselines.filter(b => !ids.has(b.id))];
      });
    }
  }

  // ── Handlers ──

  const handleBaselineLocked = useCallback((ids: string[]) => {
    setSession(prev => prev ? { ...prev, baselineIds: ids } : prev);
  }, []);

  const handleUploaded = useCallback((results: ScenarioResult[]) => {
    setAllResults(prev => [...prev, ...results]);
    setLiveScenarios(prev => [
      ...results.map(r => ({
        scenarioType: r.scenarioType,
        platformName: r.scenarioType.replace(/_/g, ' '),
        comparison: {
          survivalScore: r.survivalScore,
          scoreV2: r.scoreV2,
          survivalClass: r.survivalClass,
          creatorOk: r.creatorOk,
          rightsOk: r.rightsOk,
          creditOk: r.creditOk,
          descriptionOk: r.descriptionOk,
        },
      })),
      ...prev,
    ]);
  }, []);

  const handleAdvance = useCallback(async () => {
    if (!token || !session) return;
    const currentIdx = STEP_ORDER.indexOf(session.currentStep);
    if (currentIdx < 0 || currentIdx >= STEP_ORDER.length - 1) {
      // Already at last step or COMPLETE
      if (session.currentStep === 'EVIDENCE_PACK') {
        // Advance to COMPLETE
        try {
          const { session: updated } = await survivalLabApi.studyAdvance(token, session.id, 'COMPLETE');
          setSession(updated);
          toast.success('Study complete!');
        } catch (err: any) {
          toast.error(err.message || 'Failed to advance');
        }
      }
      return;
    }
    const nextStep = STEP_ORDER[currentIdx + 1];
    try {
      const { session: updated } = await survivalLabApi.studyAdvance(token, session.id, nextStep);
      setSession(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to advance step');
    }
  }, [token, session]);

  const handleStepClick = useCallback((step: string) => {
    // Allow clicking completed steps to review (read-only view)
    // For now just show toast — full implementation could switch view
    if (session && STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(session.currentStep)) {
      toast(`Viewing ${step.replace(/_/g, ' ')}`, { icon: '📋' });
    }
  }, [session]);

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-3" />
          <p className="text-sm text-steel-500">Loading guided study…</p>
        </div>
      </div>
    );
  }

  if (!session || !token) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-steel-500 mb-3">Session not found</p>
          <Link href="/survival-lab" className="text-brand-400 text-sm underline">
            ← Back to Survival Lab
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-steel-800 bg-black/50">
        <div className="flex items-center gap-3">
          <Link
            href="/survival-lab"
            className="text-steel-500 hover:text-steel-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <FlaskConical className="w-4 h-4 text-brand-400" />
          <div>
            <h1 className="text-sm font-bold text-white">
              Foundation Study {session.title ? `— ${session.title}` : ''}
            </h1>
            <p className="text-[10px] text-steel-600 font-mono">
              {session.id.slice(0, 8)} • {session.status}
            </p>
          </div>
        </div>
        <div className="text-xs text-steel-500">
          {allResults.length} result{allResults.length !== 1 ? 's' : ''} collected
        </div>
      </header>

      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left rail — Step progress */}
        <aside className="w-56 flex-shrink-0 border-r border-steel-800 bg-black/30 overflow-y-auto py-4">
          <StepRail
            currentStep={session.currentStep}
            onStepClick={handleStepClick}
          />
        </aside>

        {/* Main panel — Step content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <StepPanel
              currentStep={session.currentStep}
              token={token}
              sessionId={session.id}
              baselines={baselines}
              baselineIds={session.baselineIds}
              allResults={allResults}
              onBaselineLocked={handleBaselineLocked}
              onUploaded={handleUploaded}
              onAdvance={handleAdvance}
            />
          </div>
        </main>

        {/* Right rail — Live results */}
        <aside className="w-60 flex-shrink-0 border-l border-steel-800 bg-black/30 overflow-y-auto p-3">
          <LiveResultCards recentScenarios={liveScenarios} />
        </aside>
      </div>
    </div>
  );
}
