'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Upload, CheckCircle2, XCircle, Download,
  Loader2, AlertCircle, Plus, FileImage, ChevronRight
} from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { survivalLabApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Platform {
  id: string;
  slug: string;
  name: string;
  category: string;
}

interface BaselineImage {
  id: string;
  label: string;
  originalFilename: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
}

interface MetadataReport {
  exifPresent: boolean;
  xmpPresent: boolean;
  iptcPresent: boolean;
  creatorValue: string | null;
  rightsValue: string | null;
  encodingOk: boolean;
  notes: string | null;
}

interface Comparison {
  survivalScore: number;
  creatorOk: boolean;
  rightsOk: boolean;
  creditOk: boolean;
  descriptionOk: boolean;
  dimsChanged: boolean;
  filenameChanged: boolean;
  fieldsMissing: string[];
}

interface ScenarioUpload {
  id: string;
  baselineImageId: string;
  baselineLabel: string;
  scenario: string;
  originalFilename: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  metadata: MetadataReport | null;
  comparison: Comparison | null;
}

interface TestRunAsset {
  id: string;
  baselineImageId: string;
  baselineImage: BaselineImage;
}

interface TestRun {
  id: string;
  title: string;
  status: string;
  accountType: string | null;
  createdAt: string;
  platform: Platform;
  assets: TestRunAsset[];
}

const SCENARIOS = [
  { value: 'upload_original', label: 'Upload Original' },
  { value: 'download_original', label: 'Download Original' },
  { value: 'download_preview', label: 'Download Preview' },
  { value: 'share_link_download', label: 'Share Link Download' },
  { value: 'right_click_save', label: 'Right-Click Save' },
  { value: 'platform_export', label: 'Platform Export' },
  { value: 'other', label: 'Other' },
];

export default function TestRunPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const params = useParams();
  const runId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [run, setRun] = useState<TestRun | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioUpload[]>([]);
  const [availableBaselines, setAvailableBaselines] = useState<BaselineImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'baselines' | 'scenarios' | 'results'>('baselines');
  
  // Attach baselines state
  const [selectedBaselines, setSelectedBaselines] = useState<Set<string>>(new Set());
  const [attaching, setAttaching] = useState(false);
  
  // Upload scenario state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBaselineId, setUploadBaselineId] = useState('');
  const [uploadScenario, setUploadScenario] = useState('download_original');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadRunData();
  }, [runId]);

  async function loadRunData() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const [runRes, baselinesRes, resultsRes] = await Promise.all([
        survivalLabApi.getRun(session.access_token, runId),
        survivalLabApi.listBaselines(session.access_token),
        survivalLabApi.getResults(session.access_token, runId).catch(() => ({ scenarios: [] })),
      ]);
      
      setRun(runRes.run);
      setAvailableBaselines(baselinesRes.baselines || []);
      setScenarios(resultsRes.scenarios || []);
      
      // Determine current step
      if (runRes.run.assets.length === 0) {
        setStep('baselines');
      } else if ((resultsRes.scenarios || []).length === 0) {
        setStep('scenarios');
      } else {
        setStep('results');
      }
      
      // Pre-select attached baselines
      const attached = new Set<string>(runRes.run.assets.map((a: TestRunAsset) => a.baselineImageId));
      setSelectedBaselines(attached);
    } catch (error) {
      console.error('Failed to load run:', error);
      toast.error('Failed to load test run');
    } finally {
      setLoading(false);
    }
  }

  async function attachBaselines() {
    if (selectedBaselines.size === 0) {
      toast.error('Please select at least one baseline');
      return;
    }
    
    try {
      setAttaching(true);
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) return;
      
      await survivalLabApi.attachBaselines(
        session.access_token,
        runId,
        Array.from(selectedBaselines)
      );
      
      toast.success('Baselines attached!');
      await loadRunData();
      setStep('scenarios');
    } catch (error) {
      console.error('Failed to attach baselines:', error);
      toast.error('Failed to attach baselines');
    } finally {
      setAttaching(false);
    }
  }

  async function uploadScenarioFile() {
    if (!uploadFile || !uploadBaselineId || !uploadScenario) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      setUploading(true);
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) return;
      
      const result = await survivalLabApi.uploadScenario(
        session.access_token,
        runId,
        uploadFile,
        uploadBaselineId,
        uploadScenario
      );
      
      toast.success(`Uploaded! Survival Score: ${result.comparison.survivalScore}/100`);
      setShowUploadModal(false);
      setUploadFile(null);
      await loadRunData();
    } catch (error: any) {
      console.error('Failed to upload scenario:', error);
      toast.error(error.message || 'Failed to upload scenario');
    } finally {
      setUploading(false);
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-6 text-center">
        <p className="text-steel-400">Test run not found</p>
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
          <div>
            <h1 className="text-xl font-bold text-white">{run.title}</h1>
            <p className="text-sm text-steel-500">
              {run.platform.name} • {run.accountType || 'Default'} • {run.status}
            </p>
          </div>
        </div>
        
        {scenarios.length > 0 && (
          <a
            href={survivalLabApi.exportCsv('', runId)}
            onClick={async (e) => {
              e.preventDefault();
              const { data: { session } } = await supabase!.auth.getSession();
              if (session) {
                window.location.href = survivalLabApi.exportCsv(session.access_token, runId);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-steel-800 border border-steel-700
              text-white text-sm font-medium hover:bg-steel-700 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {['baselines', 'scenarios', 'results'].map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              onClick={() => setStep(s as any)}
              className={`px-3 py-1.5 text-xs font-medium uppercase transition-colors
                ${step === s 
                  ? 'bg-brand-600 text-white' 
                  : 'bg-steel-800 text-steel-400 hover:bg-steel-700'
                }`}
            >
              {i + 1}. {s}
            </button>
            {i < 2 && <ChevronRight className="w-4 h-4 text-steel-600 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Attach Baselines */}
      {step === 'baselines' && (
        <div className="bg-steel-900/50 border border-steel-700/50 p-6">
          <h2 className="text-sm font-bold text-white uppercase mb-4">
            Step 1: Select Baseline Images
          </h2>
          <p className="text-sm text-steel-400 mb-4">
            Choose which CE-embedded baselines to test with {run.platform.name}.
          </p>
          
          {availableBaselines.length === 0 ? (
            <div className="text-center py-8">
              <FileImage className="h-10 w-10 text-steel-600 mx-auto mb-3" />
              <p className="text-sm text-steel-400 mb-4">No baselines available</p>
              <Link
                href="/survival-lab/baselines"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-bold"
              >
                <Plus className="w-4 h-4" />
                Upload Baselines First
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {availableBaselines.map(b => (
                  <label
                    key={b.id}
                    className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors
                      ${selectedBaselines.has(b.id) 
                        ? 'bg-brand-900/20 border-brand-600' 
                        : 'bg-steel-900 border-steel-700 hover:border-steel-600'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBaselines.has(b.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedBaselines);
                        if (e.target.checked) {
                          newSet.add(b.id);
                        } else {
                          newSet.delete(b.id);
                        }
                        setSelectedBaselines(newSet);
                      }}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-brand-400">{b.label}</span>
                      <span className="text-xs text-steel-500 ml-2">{b.originalFilename}</span>
                    </div>
                    <span className="text-xs text-steel-500">
                      {b.width}×{b.height} • {formatBytes(b.bytes)}
                    </span>
                  </label>
                ))}
              </div>
              
              <button
                onClick={attachBaselines}
                disabled={attaching || selectedBaselines.size === 0}
                className="px-4 py-2 bg-brand-600 border border-brand-500 text-white text-sm font-bold
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {attaching ? <Loader2 className="w-4 h-4 animate-spin" /> : `Attach ${selectedBaselines.size} Baseline(s)`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 2: Upload Scenarios */}
      {step === 'scenarios' && (
        <div className="bg-steel-900/50 border border-steel-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase">
                Step 2: Upload Scenario Files
              </h2>
              <p className="text-sm text-steel-400 mt-1">
                Upload files downloaded from {run.platform.name} for each scenario.
              </p>
            </div>
            <button
              onClick={() => {
                setUploadBaselineId(run.assets[0]?.baselineImageId || '');
                setShowUploadModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 border border-brand-500
                text-white text-sm font-bold hover:bg-brand-500 transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload Scenario
            </button>
          </div>
          
          {run.assets.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
              <p className="text-sm text-steel-400">
                No baselines attached. Go back to Step 1 to attach baselines.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {run.assets.map(asset => {
                const assetScenarios = scenarios.filter(s => s.baselineImageId === asset.baselineImageId);
                return (
                  <div key={asset.id} className="border border-steel-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-brand-400">
                          {asset.baselineImage.label}
                        </span>
                        <span className="text-xs text-steel-500 ml-2">
                          {asset.baselineImage.originalFilename}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setUploadBaselineId(asset.baselineImageId);
                          setShowUploadModal(true);
                        }}
                        className="text-xs text-brand-400 hover:text-brand-300"
                      >
                        + Add Scenario
                      </button>
                    </div>
                    
                    {assetScenarios.length === 0 ? (
                      <p className="text-xs text-steel-500">No scenarios uploaded yet</p>
                    ) : (
                      <div className="space-y-1">
                        {assetScenarios.map(s => (
                          <ScenarioRow key={s.id} scenario={s} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {scenarios.length > 0 && (
            <button
              onClick={() => setStep('results')}
              className="mt-4 px-4 py-2 bg-steel-800 border border-steel-700 text-white text-sm font-medium"
            >
              View Results →
            </button>
          )}
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && (
        <div className="bg-steel-900/50 border border-steel-700/50 p-6">
          <h2 className="text-sm font-bold text-white uppercase mb-4">
            Step 3: Results
          </h2>
          
          {scenarios.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
              <p className="text-sm text-steel-400">
                No scenarios uploaded yet. Go back to Step 2 to upload scenario files.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-steel-500 uppercase border-b border-steel-700">
                    <th className="pb-2">Baseline</th>
                    <th className="pb-2">Scenario</th>
                    <th className="pb-2">Score</th>
                    <th className="pb-2">EXIF</th>
                    <th className="pb-2">XMP</th>
                    <th className="pb-2">IPTC</th>
                    <th className="pb-2">Creator</th>
                    <th className="pb-2">Rights</th>
                    <th className="pb-2">Dims</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map(s => (
                    <tr key={s.id} className="border-b border-steel-800">
                      <td className="py-2 text-brand-400">{s.baselineLabel}</td>
                      <td className="py-2 text-steel-300">{s.scenario}</td>
                      <td className={`py-2 font-bold ${getScoreColor(s.comparison?.survivalScore || 0)}`}>
                        {s.comparison?.survivalScore || 0}/100
                      </td>
                      <td className="py-2"><StatusBadge ok={s.metadata?.exifPresent} /></td>
                      <td className="py-2"><StatusBadge ok={s.metadata?.xmpPresent} /></td>
                      <td className="py-2"><StatusBadge ok={s.metadata?.iptcPresent} /></td>
                      <td className="py-2"><StatusBadge ok={s.comparison?.creatorOk} /></td>
                      <td className="py-2"><StatusBadge ok={s.comparison?.rightsOk} /></td>
                      <td className="py-2"><StatusBadge ok={!s.comparison?.dimsChanged} inverted /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload Scenario Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-steel-900 border border-steel-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Upload Scenario File</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-steel-400 uppercase mb-1">Baseline</label>
                <select
                  value={uploadBaselineId}
                  onChange={(e) => setUploadBaselineId(e.target.value)}
                  className="w-full bg-black border border-steel-700 text-white px-3 py-2 text-sm"
                >
                  {run.assets.map(a => (
                    <option key={a.baselineImageId} value={a.baselineImageId}>
                      {a.baselineImage.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-steel-400 uppercase mb-1">Scenario</label>
                <select
                  value={uploadScenario}
                  onChange={(e) => setUploadScenario(e.target.value)}
                  className="w-full bg-black border border-steel-700 text-white px-3 py-2 text-sm"
                >
                  {SCENARIOS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-steel-400 uppercase mb-1">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-black border border-steel-700 text-steel-400 px-3 py-4 text-sm
                    hover:border-brand-600 transition-colors"
                >
                  {uploadFile ? (
                    <span className="text-white">{uploadFile.name}</span>
                  ) : (
                    <span>Click to select image...</span>
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="flex-1 px-4 py-2 bg-steel-800 border border-steel-700 text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={uploadScenarioFile}
                disabled={uploading || !uploadFile}
                className="flex-1 px-4 py-2 bg-brand-600 border border-brand-500 text-white text-sm font-bold
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Upload & Compare'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioRow({ scenario }: { scenario: ScenarioUpload }) {
  const score = scenario.comparison?.survivalScore || 0;
  
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-steel-800/50">
      <div className="flex items-center gap-3">
        <span className="text-xs text-steel-400 uppercase">{scenario.scenario}</span>
        <span className="text-xs text-steel-500">{scenario.originalFilename}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold ${
          score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {score}/100
        </span>
        <div className="flex gap-1">
          <MicroBadge label="E" ok={scenario.metadata?.exifPresent} />
          <MicroBadge label="X" ok={scenario.metadata?.xmpPresent} />
          <MicroBadge label="I" ok={scenario.metadata?.iptcPresent} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ ok, inverted = false }: { ok?: boolean; inverted?: boolean }) {
  const isOk = inverted ? ok : ok;
  if (isOk === undefined) return <span className="text-steel-600">-</span>;
  
  return isOk ? (
    <CheckCircle2 className="w-4 h-4 text-green-400" />
  ) : (
    <XCircle className="w-4 h-4 text-red-400" />
  );
}

function MicroBadge({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold
      ${ok ? 'bg-green-900/50 text-green-400' : 'bg-steel-700 text-steel-500'}`}
    >
      {label}
    </span>
  );
}
