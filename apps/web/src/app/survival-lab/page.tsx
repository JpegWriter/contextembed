'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, FlaskConical, Database, PlayCircle, 
  CheckCircle2, Loader2, AlertCircle, RefreshCw, BarChart3,
  BookOpen, ArrowRight
} from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { survivalLabApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Platform {
  id: string;
  slug: string;
  name: string;
  category: string;
  freeTier: boolean;
  notes: string | null;
}

interface TestRun {
  id: string;
  title: string;
  status: string;
  accountType: string | null;
  createdAt: string;
  platform: Platform;
  assetCount: number;
}

export default function SurvivalLabPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeStudySession, setActiveStudySession] = useState<{ id: string; title: string; currentStep: string } | null>(null);
  
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [runTitle, setRunTitle] = useState('');
  const [accountType, setAccountType] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    loadData();
  }, [supabase]);

  async function loadData() {
    try {
      setLoading(true);
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const [platformsRes, runsRes, studyRes] = await Promise.all([
        survivalLabApi.listPlatforms(session.access_token),
        survivalLabApi.listRuns(session.access_token),
        survivalLabApi.studyList(session.access_token).catch(() => ({ sessions: [] })),
      ]);
      
      setPlatforms(platformsRes.platforms || []);
      setRuns(runsRes.runs || []);

      // Find most recent IN_PROGRESS study session
      const inProgress = (studyRes.sessions || []).find(
        (s: any) => s.status === 'IN_PROGRESS'
      );
      setActiveStudySession(inProgress || null);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load survival lab data');
    } finally {
      setLoading(false);
    }
  }

  async function seedPlatforms() {
    try {
      setSeeding(true);
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      await survivalLabApi.seedPlatforms(session.access_token);
      toast.success('Phase 1 platforms seeded!');
      await loadData();
    } catch (error) {
      console.error('Failed to seed platforms:', error);
      toast.error('Failed to seed platforms');
    } finally {
      setSeeding(false);
    }
  }

  async function createTestRun() {
    if (!selectedPlatform || !runTitle.trim()) {
      toast.error('Please select a platform and enter a title');
      return;
    }
    
    try {
      setCreating(true);
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const result = await survivalLabApi.createRun(session.access_token, {
        platformSlug: selectedPlatform,
        title: runTitle.trim(),
        accountType: accountType.trim() || undefined,
      });
      
      toast.success('Test run created!');
      router.push(`/survival-lab/runs/${result.run.id}`);
    } catch (error) {
      console.error('Failed to create test run:', error);
      toast.error('Failed to create test run');
    } finally {
      setCreating(false);
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-steel-700 text-steel-300',
    running: 'bg-yellow-900 text-yellow-300',
    complete: 'bg-green-900 text-green-300',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-brand-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Survival Lab</h1>
            <p className="text-sm text-steel-500">
              Test metadata preservation across platforms
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/survival-lab/analytics"
            className="flex items-center gap-2 px-4 py-2 bg-steel-800 border border-steel-700
              text-white text-sm font-medium hover:bg-steel-700 transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Link>
          <Link
            href="/survival-lab/baselines"
            className="flex items-center gap-2 px-4 py-2 bg-steel-800 border border-steel-700
              text-white text-sm font-medium hover:bg-steel-700 transition-all"
          >
            <Database className="w-4 h-4" />
            Baselines
          </Link>
          <button
            onClick={() => setShowNewRunModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 border border-brand-500
              text-white text-sm font-bold hover:bg-brand-500 transition-all shadow-glow-green"
          >
            <Plus className="w-4 h-4" />
            New Test Run
          </button>
          <Link
            href="/survival-lab/mode"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 border border-emerald-600
              text-white text-sm font-bold hover:bg-emerald-600 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Guided Mode
          </Link>
        </div>
      </div>

      {/* Continue Study Banner */}
      {activeStudySession && (
        <Link
          href={`/survival-lab/mode?session=${activeStudySession.id}`}
          className="flex items-center justify-between mb-6 p-4 bg-emerald-900/20 border border-emerald-700/50
            hover:border-emerald-600/70 transition-all group"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-white">
                Continue Study{activeStudySession.title ? `: ${activeStudySession.title}` : ''}
              </p>
              <p className="text-xs text-steel-500">
                Current step: {activeStudySession.currentStep.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {/* Platforms Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Phase 1 Platforms
          </h2>
          {platforms.length === 0 && (
            <button
              onClick={seedPlatforms}
              disabled={seeding}
              className="flex items-center gap-2 px-3 py-1.5 bg-steel-800 border border-steel-700
                text-steel-300 text-xs font-medium hover:bg-steel-700 transition-all disabled:opacity-50"
            >
              {seeding ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Seed Platforms
            </button>
          )}
        </div>
        
        {platforms.length === 0 ? (
          <div className="bg-steel-900/50 border border-steel-700/50 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-steel-600 mx-auto mb-2" />
            <p className="text-sm text-steel-500">
              No platforms configured. Click "Seed Platforms" to add Phase 1 platforms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {platforms.map(platform => (
              <div
                key={platform.id}
                className="bg-steel-900/50 border border-steel-700/50 p-3"
              >
                <p className="text-sm font-medium text-white">{platform.name}</p>
                <p className="text-xs text-steel-500">{platform.category}</p>
                {platform.freeTier && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-900/50 text-green-400 text-[10px] uppercase">
                    Free Tier
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Runs Section */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Test Runs
        </h2>
        
        {runs.length === 0 ? (
          <div className="bg-steel-900/50 border border-steel-700/50 p-8 text-center">
            <PlayCircle className="h-10 w-10 text-steel-600 mx-auto mb-3" />
            <p className="text-sm text-steel-400 mb-4">
              No test runs yet. Create one to start testing metadata survival.
            </p>
            <button
              onClick={() => setShowNewRunModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 border border-brand-500
                text-white text-sm font-bold hover:bg-brand-500 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Test Run
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map(run => (
              <Link
                key={run.id}
                href={`/survival-lab/runs/${run.id}`}
                className="block bg-steel-900/50 border border-steel-700/50 p-4 
                  hover:border-brand-600/50 hover:bg-steel-900 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white group-hover:text-brand-400">
                      {run.title}
                    </h3>
                    <p className="text-xs text-steel-500">
                      {run.platform.name} • {run.assetCount} baselines
                      {run.accountType && ` • ${run.accountType}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-[10px] uppercase font-medium ${statusColors[run.status] || statusColors.draft}`}>
                      {run.status}
                    </span>
                    <span className="text-xs text-steel-600">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New Run Modal */}
      {showNewRunModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-steel-900 border border-steel-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">New Test Run</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-steel-400 uppercase mb-1">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full bg-black border border-steel-700 text-white px-3 py-2 text-sm"
                >
                  <option value="">Select a platform...</option>
                  {platforms.map(p => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-steel-400 uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={runTitle}
                  onChange={(e) => setRunTitle(e.target.value)}
                  placeholder="e.g., Phase 1 - Instagram - Feb 2026"
                  className="w-full bg-black border border-steel-700 text-white px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs text-steel-400 uppercase mb-1">Account Type (optional)</label>
                <input
                  type="text"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  placeholder="e.g., Free, Pro, Business"
                  className="w-full bg-black border border-steel-700 text-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewRunModal(false)}
                className="flex-1 px-4 py-2 bg-steel-800 border border-steel-700 text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={createTestRun}
                disabled={creating || !selectedPlatform || !runTitle.trim()}
                className="flex-1 px-4 py-2 bg-brand-600 border border-brand-500 text-white text-sm font-bold
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
