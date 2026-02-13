/**
 * LiveResultCards — Right-rail live score + container retention display
 *
 * Shows the most recent comparison results from the current study session.
 */

'use client';

import { Shield, FileCheck, FileX } from 'lucide-react';

interface ComparisonResult {
  survivalScore: number;
  scoreV2?: number;
  survivalClass?: string;
  creatorOk: boolean;
  rightsOk: boolean;
  creditOk: boolean;
  descriptionOk: boolean;
}

interface ScenarioInfo {
  scenarioType: string;
  platformName: string;
  comparison: ComparisonResult;
}

interface LiveResultCardsProps {
  recentScenarios: ScenarioInfo[];
}

function classColor(cls?: string): string {
  switch (cls) {
    case 'PRISTINE': return 'text-green-400 border-green-600/50 bg-green-900/20';
    case 'SAFE': return 'text-blue-400 border-blue-600/50 bg-blue-900/20';
    case 'DEGRADED': return 'text-yellow-400 border-yellow-600/50 bg-yellow-900/20';
    case 'HOSTILE': return 'text-orange-400 border-orange-600/50 bg-orange-900/20';
    case 'DESTRUCTIVE': return 'text-red-400 border-red-600/50 bg-red-900/20';
    default: return 'text-steel-400 border-steel-700 bg-steel-900/30';
  }
}

function classLabel(cls?: string): string {
  switch (cls) {
    case 'PRISTINE': return '🟢 Pristine';
    case 'SAFE': return '🔵 Safe';
    case 'DEGRADED': return '🟡 Degraded';
    case 'HOSTILE': return '🟠 Hostile';
    case 'DESTRUCTIVE': return '🔴 Destructive';
    default: return '—';
  }
}

export default function LiveResultCards({ recentScenarios }: LiveResultCardsProps) {
  if (recentScenarios.length === 0) {
    return (
      <div className="text-center py-8 text-steel-600">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs">Upload scenarios to see live results</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-bold text-steel-500 uppercase tracking-widest px-1">
        Latest Results
      </h3>
      {recentScenarios.slice(0, 8).map((s, i) => (
        <div
          key={i}
          className={`border p-3 ${classColor(s.comparison.survivalClass)}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">
              {s.scenarioType.replace(/_/g, ' ')}
            </span>
            <span className="text-xs font-bold">
              {s.comparison.scoreV2 ?? s.comparison.survivalScore}
            </span>
          </div>
          <div className="text-xs mb-2">
            {classLabel(s.comparison.survivalClass)}
          </div>
          <div className="flex gap-2 text-[10px]">
            <FieldChip label="Creator" ok={s.comparison.creatorOk} />
            <FieldChip label="Rights" ok={s.comparison.rightsOk} />
            <FieldChip label="Credit" ok={s.comparison.creditOk} />
            <FieldChip label="Desc" ok={s.comparison.descriptionOk} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${ok ? 'text-green-500' : 'text-red-400'}`}>
      {ok ? <FileCheck className="w-2.5 h-2.5" /> : <FileX className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}
