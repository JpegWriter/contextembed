/**
 * ScenarioUploader — Drag-and-drop file upload for a specific scenario type.
 *
 * Handles:
 * - File selection / drag-drop
 * - Calls ensure-run to auto-create or find the platform run
 * - Calls uploadScenario with scenarioType + studySessionId
 * - Displays result cards on completion
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { survivalLabApi } from '@/lib/api';

interface UploadResult {
  baselineLabel: string;
  baselineId: string;
  survivalScore: number;
  scoreV2?: number;
  survivalClass?: string;
  scenarioFilename: string;
}

interface ScenarioUploaderProps {
  token: string;
  sessionId: string;
  platformSlug: string;
  scenarioType: string;
  baselineIds: string[];
  baselines: Array<{ id: string; label: string; originalFilename: string }>;
  label: string;
  description: string;
  onUploaded?: (results: UploadResult[]) => void;
}

export default function ScenarioUploader({
  token,
  sessionId,
  platformSlug,
  scenarioType,
  baselineIds,
  baselines,
  label,
  description,
  onUploaded,
}: ScenarioUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    const newResults: UploadResult[] = [];

    try {
      // Ensure run exists for this platform + session
      const { run } = await survivalLabApi.studyEnsureRun(token, sessionId, platformSlug);
      const runId = run.id;

      // Upload each file for each baseline
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Match file to a baseline (1:1 if same count, otherwise use first baseline)
        const baselineIdx = Math.min(i, baselineIds.length - 1);
        const baselineId = baselineIds[baselineIdx];
        const baseline = baselines.find(b => b.id === baselineId);

        const result = await survivalLabApi.uploadScenario(
          token,
          runId,
          file,
          baselineId,
          'upload_original',
          { scenarioType, studySessionId: sessionId },
        );

        newResults.push({
          baselineLabel: baseline?.label ?? baselineId.slice(0, 8),
          baselineId,
          survivalScore: result.comparison?.survivalScore ?? 0,
          scoreV2: result.comparison?.scoreV2,
          survivalClass: result.comparison?.survivalClass,
          scenarioFilename: file.name,
        });
      }

      setResults(prev => [...prev, ...newResults]);
      onUploaded?.(newResults);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [token, sessionId, platformSlug, scenarioType, baselineIds, baselines, onUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const classColor = (cls?: string) => {
    switch (cls) {
      case 'PRISTINE': return 'text-green-400';
      case 'SAFE': return 'text-blue-400';
      case 'DEGRADED': return 'text-yellow-400';
      case 'HOSTILE': return 'text-orange-400';
      case 'DESTRUCTIVE': return 'text-red-400';
      default: return 'text-steel-400';
    }
  };

  return (
    <div className="border border-steel-700/50 bg-steel-900/30 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-white">{label}</h4>
        <p className="text-xs text-steel-500 mt-0.5">{description}</p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-steel-700 hover:border-brand-600/50 
          p-6 text-center cursor-pointer transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-brand-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Uploading & comparing…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-steel-500">
            <Upload className="w-6 h-6" />
            <span className="text-xs">
              Drop files here or click to upload ({baselineIds.length} baseline{baselineIds.length !== 1 ? 's' : ''})
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between bg-steel-800/50 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-steel-300">{r.scenarioFilename}</span>
                <span className="text-steel-600">vs {r.baselineLabel}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-steel-400">v1: {r.survivalScore}</span>
                {r.scoreV2 != null && (
                  <span className={classColor(r.survivalClass)}>
                    v2: {r.scoreV2} {r.survivalClass}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
