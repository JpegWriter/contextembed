/**
 * StepRail — Vertical step progress indicator for guided study mode
 */

'use client';

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export const STUDY_STEP_META: Record<string, { label: string; shortLabel: string; description: string }> = {
  BASELINE_LOCK: {
    label: 'Baseline Lock',
    shortLabel: 'Baselines',
    description: 'Select and verify CE-embedded baselines',
  },
  LOCAL_EXPORT: {
    label: 'Local Export',
    shortLabel: 'Local',
    description: 'Verify metadata survives local save/export',
  },
  CDN_DERIVATIVE: {
    label: 'CDN Derivative',
    shortLabel: 'CDN',
    description: 'Test CDN-generated image variants',
  },
  CLOUD_STORAGE: {
    label: 'Cloud Storage',
    shortLabel: 'Cloud',
    description: 'Upload → download from Google Drive & Dropbox',
  },
  CMS: {
    label: 'CMS Platforms',
    shortLabel: 'CMS',
    description: 'Test WordPress and other CMS uploads',
  },
  SOCIAL: {
    label: 'Social Media',
    shortLabel: 'Social',
    description: 'Test Instagram, Facebook, LinkedIn',
  },
  SUMMARY: {
    label: 'Summary',
    shortLabel: 'Summary',
    description: 'Review all results across platforms',
  },
  EVIDENCE_PACK: {
    label: 'Evidence Pack',
    shortLabel: 'Export',
    description: 'Generate & download your evidence archive',
  },
};

export const STEP_ORDER = [
  'BASELINE_LOCK',
  'LOCAL_EXPORT',
  'CDN_DERIVATIVE',
  'CLOUD_STORAGE',
  'CMS',
  'SOCIAL',
  'SUMMARY',
  'EVIDENCE_PACK',
];

interface StepRailProps {
  currentStep: string;
  onStepClick?: (step: string) => void;
}

export default function StepRail({ currentStep, onStepClick }: StepRailProps) {
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <nav className="flex flex-col gap-1">
      <h3 className="text-[10px] font-bold text-steel-500 uppercase tracking-widest mb-2 px-2">
        Study Progress
      </h3>
      {STEP_ORDER.map((step, idx) => {
        const meta = STUDY_STEP_META[step];
        const isComplete = idx < currentIdx;
        const isCurrent = step === currentStep;
        const isFuture = idx > currentIdx;

        return (
          <button
            key={step}
            onClick={() => !isFuture && onStepClick?.(step)}
            disabled={isFuture}
            className={`flex items-center gap-3 px-3 py-2.5 text-left transition-all
              ${isCurrent
                ? 'bg-brand-600/20 border-l-2 border-brand-500 text-white'
                : isComplete
                  ? 'text-steel-400 hover:bg-steel-800/50 border-l-2 border-green-600/50'
                  : 'text-steel-600 border-l-2 border-steel-800 cursor-not-allowed'
              }`}
          >
            <span className="flex-shrink-0">
              {isComplete ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
              ) : (
                <Circle className="w-4 h-4 text-steel-700" />
              )}
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">
                {meta?.label ?? step}
              </span>
              {isCurrent && (
                <span className="text-[10px] text-steel-500 truncate">
                  {meta?.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
