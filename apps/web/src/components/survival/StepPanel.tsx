/**
 * StepPanel — Per-step content panel for guided study mode.
 *
 * Renders contextual instructions and upload areas for each study step.
 */

'use client';

import { useState, useMemo } from 'react';
import { Lock, CheckCircle2, Download, Loader2, AlertCircle } from 'lucide-react';
import ScenarioUploader from './ScenarioUploader';
import StudySummary from './StudySummary';
import { survivalLabApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Baseline {
  id: string;
  label: string;
  originalFilename: string;
  verified: boolean;
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

interface StepPanelProps {
  currentStep: string;
  token: string;
  sessionId: string;
  baselines: Baseline[];
  baselineIds: string[];
  allResults: ScenarioResult[];
  onBaselineLocked: (ids: string[]) => void;
  onUploaded: (results: ScenarioResult[]) => void;
  onAdvance: () => void;
}

const SOCIAL_PLATFORMS = [
  { slug: 'instagram', label: 'Instagram', type: 'SOCIAL_INSTAGRAM' },
  { slug: 'facebook', label: 'Facebook', type: 'SOCIAL_FACEBOOK' },
  { slug: 'linkedin', label: 'LinkedIn', type: 'SOCIAL_LINKEDIN' },
];

const CLOUD_PLATFORMS = [
  { slug: 'google_drive', label: 'Google Drive', type: 'CLOUD_GOOGLE_DRIVE' },
  { slug: 'dropbox', label: 'Dropbox', type: 'CLOUD_DROPBOX' },
];

const CMS_SLOTS = [
  { slug: 'wordpress_selfhosted', label: 'WordPress — Original Upload', type: 'CMS_WP_ORIGINAL',
    desc: 'Upload your CE-embedded image to WordPress and re-download the original.' },
  { slug: 'wordpress_selfhosted', label: 'WordPress — Thumbnail', type: 'CMS_WP_THUMB',
    desc: 'Re-download a WordPress-generated thumbnail (e.g. 300×300).' },
  { slug: 'squarespace', label: 'Squarespace', type: 'CMS_SQUARESPACE',
    desc: 'Upload to Squarespace and re-download the served version.' },
  { slug: 'wix', label: 'Wix', type: 'CMS_WIX',
    desc: 'Upload to Wix and re-download.' },
  { slug: 'webflow', label: 'Webflow', type: 'CMS_WEBFLOW',
    desc: 'Upload to Webflow and re-download.' },
  { slug: 'shopify', label: 'Shopify', type: 'CMS_SHOPIFY',
    desc: 'Upload to Shopify product image and re-download.' },
];

export default function StepPanel({
  currentStep,
  token,
  sessionId,
  baselines,
  baselineIds,
  allResults,
  onBaselineLocked,
  onUploaded,
  onAdvance,
}: StepPanelProps) {
  switch (currentStep) {
    case 'BASELINE_LOCK':
      return (
        <BaselineLockPanel
          token={token}
          sessionId={sessionId}
          baselines={baselines}
          baselineIds={baselineIds}
          onLocked={onBaselineLocked}
          onAdvance={onAdvance}
        />
      );
    case 'LOCAL_EXPORT':
      return (
        <SingleUploadPanel
          token={token}
          sessionId={sessionId}
          baselineIds={baselineIds}
          baselines={baselines}
          platformSlug="local_export"
          scenarioType="LOCAL_EXPORT"
          title="Local Export Test"
          instructions={[
            '1. Open your CE-embedded baseline image in your default photo viewer or editor.',
            '2. Re-save / "Save As" to a new file (JPEG → JPEG, keeping the same format).',
            '3. Upload the re-saved file below to compare against the baseline.',
          ]}
          onUploaded={onUploaded}
          onAdvance={onAdvance}
        />
      );
    case 'CDN_DERIVATIVE':
      return (
        <SingleUploadPanel
          token={token}
          sessionId={sessionId}
          baselineIds={baselineIds}
          baselines={baselines}
          platformSlug="cdn_derivative"
          scenarioType="CDN_DERIVATIVE"
          title="CDN Derivative Test"
          instructions={[
            '1. Upload your baseline to a CDN or image hosting service (e.g., Cloudflare Images, imgix).',
            '2. Request a derivative (resize, WebP conversion, etc.).',
            '3. Download the derivative and upload it below.',
          ]}
          onUploaded={onUploaded}
          onAdvance={onAdvance}
        />
      );
    case 'CLOUD_STORAGE':
      return (
        <MultiPlatformPanel
          token={token}
          sessionId={sessionId}
          baselineIds={baselineIds}
          baselines={baselines}
          platforms={CLOUD_PLATFORMS}
          title="Cloud Storage Test"
          instructions="Upload your baseline to each cloud storage service, then re-download and upload below."
          onUploaded={onUploaded}
          onAdvance={onAdvance}
        />
      );
    case 'CMS':
      return (
        <CMSPanel
          token={token}
          sessionId={sessionId}
          baselineIds={baselineIds}
          baselines={baselines}
          onUploaded={onUploaded}
          onAdvance={onAdvance}
        />
      );
    case 'SOCIAL':
      return (
        <MultiPlatformPanel
          token={token}
          sessionId={sessionId}
          baselineIds={baselineIds}
          baselines={baselines}
          platforms={SOCIAL_PLATFORMS}
          title="Social Media Test"
          instructions="Post your baseline image on each social platform, then screenshot / re-download and upload below."
          onUploaded={onUploaded}
          onAdvance={onAdvance}
        />
      );
    case 'SUMMARY':
      return (
        <div>
          <SectionHeader title="Study Summary" />
          <p className="text-sm text-steel-400 mb-4">
            Review your results across all platform types. When satisfied, advance to generate your evidence pack.
          </p>
          <StudySummary results={allResults} />
          <AdvanceButton label="Proceed to Evidence Pack →" onClick={onAdvance} />
        </div>
      );
    case 'EVIDENCE_PACK':
      return (
        <EvidencePackPanel
          token={token}
          sessionId={sessionId}
          onAdvance={onAdvance}
        />
      );
    case 'COMPLETE':
      return (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Study Complete</h2>
          <p className="text-sm text-steel-400 max-w-md mx-auto">
            Your Foundation Study is finished. You can review the summary or download
            your evidence pack at any time from the study detail page.
          </p>
        </div>
      );
    default:
      return <p className="text-steel-500 text-sm">Unknown step: {currentStep}</p>;
  }
}

// ──────────────────── Sub-panels ────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
      {title}
    </h2>
  );
}

function AdvanceButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="mt-6 flex justify-end">
      <button
        onClick={onClick}
        disabled={disabled}
        className="px-5 py-2.5 text-white text-sm font-bold
          transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-gradient-border"
      >
        {label}
      </button>
    </div>
  );
}

/** Step 1: Baseline Lock */
function BaselineLockPanel({
  token,
  sessionId,
  baselines,
  baselineIds,
  onLocked,
  onAdvance,
}: {
  token: string;
  sessionId: string;
  baselines: Baseline[];
  baselineIds: string[];
  onLocked: (ids: string[]) => void;
  onAdvance: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(baselineIds));
  const [locking, setLocking] = useState(false);
  const locked = baselineIds.length > 0;

  async function lockBaselines() {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.error('Select at least one baseline');
      return;
    }
    setLocking(true);
    try {
      await survivalLabApi.studyAttachBaselines(token, sessionId, ids);
      onLocked(ids);
      toast.success(`${ids.length} baseline(s) locked`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to lock baselines');
    } finally {
      setLocking(false);
    }
  }

  function toggle(id: string) {
    if (locked) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      else toast.error('Maximum 3 baselines');
      return next;
    });
  }

  return (
    <div>
      <SectionHeader title="Lock Baselines" />
      <p className="text-sm text-steel-400 mb-4">
        Select 1–3 CE-embedded baselines to use throughout this study.
        Once locked, the selection cannot be changed.
      </p>

      {baselines.length === 0 ? (
        <div className="bg-steel-900/50 border border-steel-700/50 p-6 text-center">
          <AlertCircle className="w-6 h-6 text-steel-600 mx-auto mb-2" />
          <p className="text-sm text-steel-500 mb-2">
            No verified baselines found. Upload and verify baselines first.
          </p>
          <a
            href="/survival-lab/baselines"
            className="text-brand-400 text-sm underline hover:text-brand-300"
          >
            Go to Baselines →
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {baselines.filter(b => b.verified).map(b => (
            <button
              key={b.id}
              onClick={() => toggle(b.id)}
              disabled={locked}
              className={`w-full flex items-center gap-3 p-3 border text-left transition-all
                ${selected.has(b.id)
                  ? 'border-brand-500 bg-brand-600/10'
                  : 'border-steel-700/50 bg-steel-900/30 hover:border-steel-600'}
                ${locked ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {selected.has(b.id) ? (
                <CheckCircle2 className="w-4 h-4 text-brand-400 flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 border border-steel-600 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{b.label}</p>
                <p className="text-xs text-steel-500 truncate">{b.originalFilename}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {!locked && baselines.filter(b => b.verified).length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={lockBaselines}
            disabled={locking || selected.size === 0}
            className="flex items-center gap-2 px-4 py-2
              text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed btn-gradient-border"
          >
            {locking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Lock {selected.size} Baseline{selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {locked && (
        <AdvanceButton label="Continue to Local Export →" onClick={onAdvance} />
      )}
    </div>
  );
}

/** Single-platform upload panel (Local Export, CDN Derivative) */
function SingleUploadPanel({
  token, sessionId, baselineIds, baselines, platformSlug, scenarioType,
  title, instructions, onUploaded, onAdvance,
}: {
  token: string;
  sessionId: string;
  baselineIds: string[];
  baselines: Baseline[];
  platformSlug: string;
  scenarioType: string;
  title: string;
  instructions: string[];
  onUploaded: (results: ScenarioResult[]) => void;
  onAdvance: () => void;
}) {
  return (
    <div>
      <SectionHeader title={title} />
      <div className="bg-steel-900/50 border border-steel-700/50 p-4 mb-4">
        <h4 className="text-xs font-bold text-steel-400 uppercase mb-2">Instructions</h4>
        <ol className="space-y-1">
          {instructions.map((line, i) => (
            <li key={i} className="text-sm text-steel-300">{line}</li>
          ))}
        </ol>
      </div>
      <ScenarioUploader
        token={token}
        sessionId={sessionId}
        platformSlug={platformSlug}
        scenarioType={scenarioType}
        baselineIds={baselineIds}
        baselines={baselines.map(b => ({ id: b.id, label: b.label, originalFilename: b.originalFilename }))}
        label={`Upload ${title} file`}
        description={`Drop the re-downloaded file here`}
        onUploaded={(res) => {
          onUploaded(res.map(r => ({
            scenarioType,
            survivalScore: r.survivalScore,
            scoreV2: r.scoreV2,
            survivalClass: r.survivalClass,
            creatorOk: false,
            rightsOk: false,
            creditOk: false,
            descriptionOk: false,
          })));
        }}
      />
      <AdvanceButton label="Next Step →" onClick={onAdvance} />
    </div>
  );
}

/** Multi-platform upload panel (Cloud Storage, Social) */
function MultiPlatformPanel({
  token, sessionId, baselineIds, baselines, platforms, title, instructions,
  onUploaded, onAdvance,
}: {
  token: string;
  sessionId: string;
  baselineIds: string[];
  baselines: Baseline[];
  platforms: Array<{ slug: string; label: string; type: string }>;
  title: string;
  instructions: string;
  onUploaded: (results: ScenarioResult[]) => void;
  onAdvance: () => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const active = platforms[activeTab];

  return (
    <div>
      <SectionHeader title={title} />
      <p className="text-sm text-steel-400 mb-4">{instructions}</p>

      {/* Tabs */}
      <div className="flex border-b border-steel-700 mb-4">
        {platforms.map((p, i) => (
          <button
            key={p.slug}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors
              ${i === activeTab
                ? 'border-brand-500 text-white'
                : 'border-transparent text-steel-500 hover:text-steel-300'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ScenarioUploader
        key={active.slug}
        token={token}
        sessionId={sessionId}
        platformSlug={active.slug}
        scenarioType={active.type}
        baselineIds={baselineIds}
        baselines={baselines.map(b => ({ id: b.id, label: b.label, originalFilename: b.originalFilename }))}
        label={`Upload from ${active.label}`}
        description={`Drop the file re-downloaded from ${active.label}`}
        onUploaded={(res) => {
          onUploaded(res.map(r => ({
            scenarioType: active.type,
            survivalScore: r.survivalScore,
            scoreV2: r.scoreV2,
            survivalClass: r.survivalClass,
            creatorOk: false,
            rightsOk: false,
            creditOk: false,
            descriptionOk: false,
          })));
        }}
      />
      <AdvanceButton label="Next Step →" onClick={onAdvance} />
    </div>
  );
}

/** CMS panel with multiple slots */
function CMSPanel({
  token, sessionId, baselineIds, baselines, onUploaded, onAdvance,
}: {
  token: string;
  sessionId: string;
  baselineIds: string[];
  baselines: Baseline[];
  onUploaded: (results: ScenarioResult[]) => void;
  onAdvance: () => void;
}) {
  return (
    <div>
      <SectionHeader title="CMS Platform Tests" />
      <p className="text-sm text-steel-400 mb-4">
        Upload your baseline to each CMS, then re-download the served file and upload below.
        Test the original upload and any generated thumbnails separately.
      </p>
      <div className="space-y-4">
        {CMS_SLOTS.map(slot => (
          <ScenarioUploader
            key={slot.type}
            token={token}
            sessionId={sessionId}
            platformSlug={slot.slug}
            scenarioType={slot.type}
            baselineIds={baselineIds}
            baselines={baselines.map(b => ({ id: b.id, label: b.label, originalFilename: b.originalFilename }))}
            label={slot.label}
            description={slot.desc}
            onUploaded={(res) => {
              onUploaded(res.map(r => ({
                scenarioType: slot.type,
                survivalScore: r.survivalScore,
                scoreV2: r.scoreV2,
                survivalClass: r.survivalClass,
                creatorOk: false,
                rightsOk: false,
                creditOk: false,
                descriptionOk: false,
              })));
            }}
          />
        ))}
      </div>
      <AdvanceButton label="Next Step →" onClick={onAdvance} />
    </div>
  );
}

/** Evidence Pack generation panel */
function EvidencePackPanel({
  token, sessionId, onAdvance,
}: {
  token: string;
  sessionId: string;
  onAdvance: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await survivalLabApi.studyEvidencePack(token, sessionId);
      setDownloadUrl(result.signedUrl);
      toast.success('Evidence pack generated!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate evidence pack');
      toast.error('Evidence pack failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <SectionHeader title="Evidence Pack" />
      <p className="text-sm text-steel-400 mb-4">
        Generate a ZIP archive containing all your baselines, scenario uploads,
        comparison reports, and a summary CSV. This is your auditable proof
        of metadata survival testing.
      </p>

      {!downloadUrl ? (
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-3
            text-white text-sm font-bold disabled:opacity-50 transition-all btn-gradient-border"
        >
          {generating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          {generating ? 'Generating…' : 'Generate Evidence Pack'}
        </button>
      ) : (
        <div className="bg-green-900/20 border border-green-700/50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Evidence pack ready!</p>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 text-sm underline hover:text-brand-300"
              >
                Download ZIP →
              </a>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <AdvanceButton
        label="Complete Study ✓"
        onClick={onAdvance}
        disabled={!downloadUrl}
      />
    </div>
  );
}
