/**
 * StudySummary — Aggregated results view for a completed (or in-progress) study session.
 *
 * Shows:
 * - Container retention averages across all scenario types
 * - Per-scenarioType table with avg scoreV2, class distribution, field retention bars
 * - Overall survival class for the session
 */

'use client';

import { useMemo } from 'react';
import { BarChart3, Shield, FileCheck, FileX } from 'lucide-react';

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

interface StudySummaryProps {
  /** Flat array of all comparison results from the session */
  results: ScenarioResult[];
}

interface TypeAgg {
  type: string;
  count: number;
  avgScore: number;
  avgScoreV2: number;
  creatorPct: number;
  rightsPct: number;
  creditPct: number;
  descPct: number;
  classDist: Record<string, number>;
}

function classify(score: number): string {
  if (score >= 95) return 'PRISTINE';
  if (score >= 75) return 'SAFE';
  if (score >= 50) return 'DEGRADED';
  if (score >= 25) return 'HOSTILE';
  return 'DESTRUCTIVE';
}

function classColor(cls: string): string {
  switch (cls) {
    case 'PRISTINE': return 'text-green-400';
    case 'SAFE': return 'text-blue-400';
    case 'DEGRADED': return 'text-yellow-400';
    case 'HOSTILE': return 'text-orange-400';
    case 'DESTRUCTIVE': return 'text-red-400';
    default: return 'text-steel-400';
  }
}

function classBg(cls: string): string {
  switch (cls) {
    case 'PRISTINE': return 'bg-green-500';
    case 'SAFE': return 'bg-blue-500';
    case 'DEGRADED': return 'bg-yellow-500';
    case 'HOSTILE': return 'bg-orange-500';
    case 'DESTRUCTIVE': return 'bg-red-500';
    default: return 'bg-steel-600';
  }
}

export default function StudySummary({ results }: StudySummaryProps) {
  const { byType, overall, overallClass, fieldRetention } = useMemo(() => {
    if (results.length === 0) {
      return {
        byType: [] as TypeAgg[],
        overall: 0,
        overallClass: 'N/A',
        fieldRetention: { creator: 0, rights: 0, credit: 0, desc: 0 },
      };
    }

    const groups: Record<string, ScenarioResult[]> = {};
    for (const r of results) {
      const key = r.scenarioType || 'UNKNOWN';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }

    const aggs: TypeAgg[] = Object.entries(groups).map(([type, items]) => {
      const n = items.length;
      const avgScore = items.reduce((s, i) => s + i.survivalScore, 0) / n;
      const avgScoreV2 = items.reduce((s, i) => s + (i.scoreV2 ?? i.survivalScore), 0) / n;
      const creatorPct = items.filter(i => i.creatorOk).length / n * 100;
      const rightsPct = items.filter(i => i.rightsOk).length / n * 100;
      const creditPct = items.filter(i => i.creditOk).length / n * 100;
      const descPct = items.filter(i => i.descriptionOk).length / n * 100;

      const classDist: Record<string, number> = {};
      for (const i of items) {
        const c = i.survivalClass ?? classify(i.scoreV2 ?? i.survivalScore);
        classDist[c] = (classDist[c] || 0) + 1;
      }

      return { type, count: n, avgScore, avgScoreV2, creatorPct, rightsPct, creditPct, descPct, classDist };
    });

    // Sort by avgScoreV2 ascending (worst first)
    aggs.sort((a, b) => a.avgScoreV2 - b.avgScoreV2);

    const totalV2 = results.reduce((s, r) => s + (r.scoreV2 ?? r.survivalScore), 0) / results.length;
    const oc = classify(totalV2);

    const fr = {
      creator: results.filter(r => r.creatorOk).length / results.length * 100,
      rights: results.filter(r => r.rightsOk).length / results.length * 100,
      credit: results.filter(r => r.creditOk).length / results.length * 100,
      desc: results.filter(r => r.descriptionOk).length / results.length * 100,
    };

    return { byType: aggs, overall: totalV2, overallClass: oc, fieldRetention: fr };
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-steel-600">
        <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No results yet. Complete steps to see your summary.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="flex items-center gap-6 bg-steel-900/50 border border-steel-700/50 p-5">
        <div className="flex-shrink-0 text-center">
          <Shield className="w-8 h-8 mx-auto mb-1 text-brand-400" />
          <span className={`text-3xl font-bold ${classColor(overallClass)}`}>
            {overall.toFixed(0)}
          </span>
          <p className={`text-xs font-medium mt-0.5 ${classColor(overallClass)}`}>
            {overallClass}
          </p>
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-bold text-white">Overall Container Survival</h3>
          <p className="text-xs text-steel-500">
            Across {results.length} scenario{results.length !== 1 ? 's' : ''} and{' '}
            {byType.length} platform type{byType.length !== 1 ? 's' : ''}
          </p>
          {/* Field retention bars */}
          <div className="grid grid-cols-4 gap-3 mt-3">
            <FieldBar label="Creator" pct={fieldRetention.creator} />
            <FieldBar label="Rights" pct={fieldRetention.rights} />
            <FieldBar label="Credit" pct={fieldRetention.credit} />
            <FieldBar label="Description" pct={fieldRetention.desc} />
          </div>
        </div>
      </div>

      {/* Per-Type Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-steel-700 text-steel-500 text-left">
              <th className="py-2 px-3 font-medium">Scenario Type</th>
              <th className="py-2 px-3 font-medium text-center">#</th>
              <th className="py-2 px-3 font-medium text-center">Avg v2</th>
              <th className="py-2 px-3 font-medium text-center">Creator</th>
              <th className="py-2 px-3 font-medium text-center">Rights</th>
              <th className="py-2 px-3 font-medium text-center">Credit</th>
              <th className="py-2 px-3 font-medium text-center">Desc</th>
              <th className="py-2 px-3 font-medium">Class Distribution</th>
            </tr>
          </thead>
          <tbody>
            {byType.map(t => {
              const rowClass = classify(t.avgScoreV2);
              return (
                <tr key={t.type} className="border-b border-steel-800/50 hover:bg-steel-900/40">
                  <td className="py-2.5 px-3 font-medium text-white">
                    {t.type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 px-3 text-center text-steel-400">{t.count}</td>
                  <td className={`py-2.5 px-3 text-center font-bold ${classColor(rowClass)}`}>
                    {t.avgScoreV2.toFixed(0)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <RetentionPill pct={t.creatorPct} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <RetentionPill pct={t.rightsPct} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <RetentionPill pct={t.creditPct} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <RetentionPill pct={t.descPct} />
                  </td>
                  <td className="py-2.5 px-3">
                    <ClassDistBar dist={t.classDist} total={t.count} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function FieldBar({ label, pct }: { label: string; pct: number }) {
  const color = pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-steel-500">{label}</span>
        <span className="text-[10px] text-steel-400">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1 bg-steel-800 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RetentionPill({ pct }: { pct: number }) {
  const color = pct >= 90
    ? 'text-green-400 bg-green-900/30'
    : pct >= 60
      ? 'text-yellow-400 bg-yellow-900/30'
      : 'text-red-400 bg-red-900/30';
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      {pct.toFixed(0)}%
    </span>
  );
}

function ClassDistBar({ dist, total }: { dist: Record<string, number>; total: number }) {
  const order = ['PRISTINE', 'SAFE', 'DEGRADED', 'HOSTILE', 'DESTRUCTIVE'];
  return (
    <div className="flex h-3 overflow-hidden w-28">
      {order.map(cls => {
        const count = dist[cls] ?? 0;
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={cls}
            className={`${classBg(cls)} opacity-80`}
            style={{ width: `${pct}%` }}
            title={`${cls}: ${count}`}
          />
        );
      })}
    </div>
  );
}
