'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, BarChart3, Shield, ShieldAlert, ShieldCheck,
  ShieldX, Loader2, TrendingUp, Database,
} from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { survivalLabApi } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Types ─────────────────────────────────────────────────────

interface FieldSurvival {
  survived: number;
  total: number;
  rate: number;
}

interface PlatformSummary {
  platformId: string;
  platformSlug: string;
  platformName: string;
  platformCategory: string;
  totalRuns: number;
  totalScenarios: number;
  avgScore: number;
  avgScoreV2: number;
  bestScore: number;
  worstScore: number;
  exifRetention: number;
  xmpRetention: number;
  iptcRetention: number;
  fieldSurvival: {
    creator: FieldSurvival;
    copyright: FieldSurvival;
    credit: FieldSurvival;
    description: FieldSurvival;
  };
}

interface DashboardData {
  totalPlatforms: number;
  totalRuns: number;
  totalScenarios: number;
  globalAvgScore: number;
  globalAvgScoreV2: number;
  platforms: PlatformSummary[];
}

// ─── Helpers ───────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-900/30 border-green-700/50';
  if (score >= 50) return 'bg-yellow-900/30 border-yellow-700/50';
  if (score >= 20) return 'bg-orange-900/30 border-orange-700/50';
  return 'bg-red-900/30 border-red-700/50';
}

function retentionBar(rate: number): string {
  if (rate >= 0.8) return 'bg-green-500';
  if (rate >= 0.5) return 'bg-yellow-500';
  if (rate >= 0.2) return 'bg-orange-500';
  return 'bg-red-500';
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

// ─── Component ─────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    loadAnalytics();
  }, [supabase]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const result = await survivalLabApi.getAnalyticsSummary(session.access_token);
      setData(result);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-steel-400">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/survival-lab" className="p-2 hover:bg-steel-800 transition-colors">
            <ArrowLeft className="h-5 w-5 text-steel-400" />
          </Link>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Survival Analytics</h1>
              <p className="text-sm text-steel-500">
                Cross-platform metadata preservation overview
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <StatCard label="Platforms Tested" value={data.totalPlatforms} />
        <StatCard label="Test Runs" value={data.totalRuns} />
        <StatCard label="Scenarios" value={data.totalScenarios} />
        <StatCard
          label="Avg Score (v1)"
          value={data.globalAvgScore.toFixed(1)}
          color={scoreColor(data.globalAvgScore)}
        />
        <StatCard
          label="Avg Score (v2)"
          value={data.globalAvgScoreV2.toFixed(1)}
          color={scoreColor(data.globalAvgScoreV2)}
        />
      </div>

      {/* Platform Leaderboard */}
      {data.platforms.length === 0 ? (
        <div className="bg-steel-900/50 border border-steel-700/50 p-8 text-center">
          <Database className="h-10 w-10 text-steel-600 mx-auto mb-3" />
          <p className="text-sm text-steel-400 mb-2">
            No analytics data yet.
          </p>
          <p className="text-xs text-steel-500">
            Upload scenario files in your test runs to start seeing platform comparisons.
          </p>
        </div>
      ) : (
        <>
          {/* Leaderboard Table */}
          <div className="mb-8">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Platform Leaderboard
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-steel-500 uppercase border-b border-steel-700">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Platform</th>
                    <th className="pb-2 pr-4">Category</th>
                    <th className="pb-2 pr-4">Scenarios</th>
                    <th className="pb-2 pr-4">Avg v2</th>
                    <th className="pb-2 pr-4">Best</th>
                    <th className="pb-2 pr-4">Worst</th>
                    <th className="pb-2 pr-4">EXIF</th>
                    <th className="pb-2 pr-4">XMP</th>
                    <th className="pb-2">IPTC</th>
                  </tr>
                </thead>
                <tbody>
                  {data.platforms.map((p, i) => (
                    <tr key={p.platformId} className="border-b border-steel-800 hover:bg-steel-900/50">
                      <td className="py-3 pr-4 text-steel-500 font-mono">{i + 1}</td>
                      <td className="py-3 pr-4">
                        <span className="text-brand-400 font-medium">{p.platformName}</span>
                      </td>
                      <td className="py-3 pr-4 text-steel-400">{p.platformCategory}</td>
                      <td className="py-3 pr-4 text-steel-300">{p.totalScenarios}</td>
                      <td className={`py-3 pr-4 font-bold ${scoreColor(p.avgScoreV2)}`}>
                        {p.avgScoreV2.toFixed(1)}
                      </td>
                      <td className={`py-3 pr-4 ${scoreColor(p.bestScore)}`}>{p.bestScore}</td>
                      <td className={`py-3 pr-4 ${scoreColor(p.worstScore)}`}>{p.worstScore}</td>
                      <td className="py-3 pr-4">
                        <RetentionBadge rate={p.exifRetention} />
                      </td>
                      <td className="py-3 pr-4">
                        <RetentionBadge rate={p.xmpRetention} />
                      </td>
                      <td className="py-3">
                        <RetentionBadge rate={p.iptcRetention} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Field Survival Rates */}
          <div className="mb-8">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Field Survival by Platform
            </h2>
            <div className="space-y-3">
              {data.platforms.map(p => (
                <div
                  key={p.platformId}
                  className={`border p-4 ${scoreBg(p.avgScoreV2)}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ScoreIcon score={p.avgScoreV2} />
                      <span className="text-sm font-medium text-white">{p.platformName}</span>
                      <span className="text-xs text-steel-500">{p.platformCategory}</span>
                    </div>
                    <span className={`text-lg font-bold ${scoreColor(p.avgScoreV2)}`}>
                      {p.avgScoreV2.toFixed(1)}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FieldBar
                      label="Creator"
                      rate={p.fieldSurvival.creator.rate}
                      survived={p.fieldSurvival.creator.survived}
                      total={p.fieldSurvival.creator.total}
                    />
                    <FieldBar
                      label="Copyright"
                      rate={p.fieldSurvival.copyright.rate}
                      survived={p.fieldSurvival.copyright.survived}
                      total={p.fieldSurvival.copyright.total}
                    />
                    <FieldBar
                      label="Credit"
                      rate={p.fieldSurvival.credit.rate}
                      survived={p.fieldSurvival.credit.survived}
                      total={p.fieldSurvival.credit.total}
                    />
                    <FieldBar
                      label="Description"
                      rate={p.fieldSurvival.description.rate}
                      survived={p.fieldSurvival.description.survived}
                      total={p.fieldSurvival.description.total}
                    />
                  </div>

                  {/* Container Retention */}
                  <div className="flex gap-4 mt-3 pt-3 border-t border-steel-700/30">
                    <ContainerChip label="EXIF" rate={p.exifRetention} />
                    <ContainerChip label="XMP" rate={p.xmpRetention} />
                    <ContainerChip label="IPTC" rate={p.iptcRetention} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function StatCard({
  label,
  value,
  color = 'text-white',
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-steel-900/50 border border-steel-700/50 p-4">
      <p className="text-xs text-steel-500 uppercase mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function RetentionBadge({ rate }: { rate: number }) {
  const color =
    rate >= 0.8 ? 'text-green-400 bg-green-900/50' :
    rate >= 0.5 ? 'text-yellow-400 bg-yellow-900/50' :
    rate >= 0.2 ? 'text-orange-400 bg-orange-900/50' :
    'text-red-400 bg-red-900/50';

  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold ${color}`}>
      {pct(rate)}
    </span>
  );
}

function ScoreIcon({ score }: { score: number }) {
  if (score >= 80) return <ShieldCheck className="w-5 h-5 text-green-400" />;
  if (score >= 50) return <Shield className="w-5 h-5 text-yellow-400" />;
  if (score >= 20) return <ShieldAlert className="w-5 h-5 text-orange-400" />;
  return <ShieldX className="w-5 h-5 text-red-400" />;
}

function FieldBar({
  label,
  rate,
  survived,
  total,
}: {
  label: string;
  rate: number;
  survived: number;
  total: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-steel-400">{label}</span>
        <span className="text-xs text-steel-300">
          {survived}/{total}
        </span>
      </div>
      <div className="h-2 bg-steel-800 w-full overflow-hidden">
        <div
          className={`h-full transition-all ${retentionBar(rate)}`}
          style={{ width: `${Math.round(rate * 100)}%` }}
        />
      </div>
    </div>
  );
}

function ContainerChip({ label, rate }: { label: string; rate: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-steel-500 uppercase font-medium">{label}</span>
      <div className="h-1.5 w-16 bg-steel-800 overflow-hidden">
        <div
          className={`h-full ${retentionBar(rate)}`}
          style={{ width: `${Math.round(rate * 100)}%` }}
        />
      </div>
      <span className="text-[10px] text-steel-400">{pct(rate)}</span>
    </div>
  );
}
