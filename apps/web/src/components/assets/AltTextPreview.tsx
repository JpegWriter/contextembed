'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Tag,
  AlertTriangle,
  FileText,
  Eye,
  Search,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { altTextApi } from '@/lib/api';
import { useSupabase } from '@/lib/supabase-provider';
import toast from 'react-hot-toast';

// ============================================================================
// Types
// ============================================================================

interface AltTextOutput {
  alt_text_short: string;
  alt_text_accessibility: string;
  caption: string;
  description: string;
  focus_keyphrase: string;
  safety_notes?: string | null;
}

type AltTextMode = 'seo' | 'accessibility' | 'editorial' | 'social';

interface AltTextPreviewProps {
  /** Project ID */
  projectId: string;
  /** Asset ID */
  assetId: string;
  /** Pre-loaded alt text from metadata result (if already generated) */
  existingAltText?: AltTextOutput | null;
  /** Callback when alt text is generated/updated */
  onGenerated?: (output: AltTextOutput) => void;
}

// ============================================================================
// Mode config
// ============================================================================

const MODE_OPTIONS: { value: AltTextMode; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'seo', label: 'SEO', icon: Search, description: 'Keyword-rich, Google-optimised' },
  { value: 'accessibility', label: 'Accessible', icon: Eye, description: 'WCAG-aligned, screen-reader friendly' },
  { value: 'editorial', label: 'Editorial', icon: FileText, description: 'Story-driven, brand voice' },
  { value: 'social', label: 'Social', icon: MessageSquare, description: 'Scroll-stopping, engagement-focused' },
];

// ============================================================================
// Field Card
// ============================================================================

function FieldCard({
  label,
  value,
  charRange,
  icon: Icon,
}: {
  label: string;
  value: string;
  charRange: string;
  icon: React.ElementType;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 2000);
  };

  const charCount = value.length;

  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-3 hover:border-blue-300 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {charCount} chars <span className="text-gray-300">({charRange})</span>
          </span>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-gray-400" />
            )}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-800 leading-relaxed">{value}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AltTextPreview({
  projectId,
  assetId,
  existingAltText,
  onGenerated,
}: AltTextPreviewProps) {
  const { supabase } = useSupabase();
  const [output, setOutput] = useState<AltTextOutput | null>(existingAltText || null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AltTextMode>('seo');
  const [focusKeyphrase, setFocusKeyphrase] = useState('');
  const [isOpen, setIsOpen] = useState(!!existingAltText);
  const [usedFallback, setUsedFallback] = useState(false);
  const [stats, setStats] = useState<{ durationMs: number; tokensUsed: number } | null>(null);

  // Sync existingAltText prop changes
  useEffect(() => {
    if (existingAltText) {
      setOutput(existingAltText);
      setIsOpen(true);
    }
  }, [existingAltText]);

  const handleGenerate = useCallback(async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please log in to generate alt text');
      return;
    }
    const token = session.access_token;
    setLoading(true);
    try {
      const result = await altTextApi.generate(token, projectId, assetId, {
        mode,
        focusKeyphrase: focusKeyphrase.trim() || undefined,
      });

      if (result.output) {
        setOutput(result.output);
        setUsedFallback(result.usedFallback || false);
        setStats({ durationMs: result.durationMs, tokensUsed: result.tokensUsed });
        setIsOpen(true);
        onGenerated?.(result.output);
        toast.success(
          result.usedFallback
            ? 'Alt text generated (fallback used)'
            : 'Alt text generated successfully',
        );
      } else {
        toast.error(result.error || 'Generation failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate alt text');
    } finally {
      setLoading(false);
    }
  }, [supabase, projectId, assetId, mode, focusKeyphrase, onGenerated]);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-semibold text-gray-900">Alt Text Engine</span>
          {output && (
            <span className="text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
              Generated
            </span>
          )}
          {usedFallback && (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Fallback
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {/* Controls row */}
          <div className="flex items-end gap-3">
            {/* Mode selector */}
            <div className="flex-1">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Mode
              </label>
              <div className="flex gap-1">
                {MODE_OPTIONS.map((opt) => {
                  const isActive = mode === opt.value;
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setMode(opt.value)}
                      title={opt.description}
                      className={`
                        flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${isActive
                          ? 'bg-purple-100 text-purple-700 border border-purple-300'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      <OptIcon className="h-3 w-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg
                hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium
                shadow-sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : output ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {output ? 'Regenerate' : 'Generate'}
            </button>
          </div>

          {/* Focus keyphrase input */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Focus Keyphrase <span className="text-gray-400">(optional, max 4 words)</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={focusKeyphrase}
                onChange={(e) => setFocusKeyphrase(e.target.value)}
                placeholder="e.g. luxury wedding photography"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                  focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              />
            </div>
          </div>

          {/* Output fields */}
          {output && (
            <div className="space-y-2">
              <FieldCard
                label="Alt Text (Short)"
                value={output.alt_text_short}
                charRange="30-140"
                icon={Search}
              />
              <FieldCard
                label="Alt Text (Accessible)"
                value={output.alt_text_accessibility}
                charRange="60-240"
                icon={Eye}
              />
              <FieldCard
                label="Caption"
                value={output.caption}
                charRange="20-200"
                icon={MessageSquare}
              />
              <FieldCard
                label="Description"
                value={output.description}
                charRange="80-900"
                icon={FileText}
              />

              {/* Keyphrase badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
                <Tag className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs font-medium text-purple-700">Focus Keyphrase:</span>
                <span className="text-xs text-purple-900 font-semibold">
                  {output.focus_keyphrase}
                </span>
              </div>

              {/* Safety notes */}
              {output.safety_notes && (
                <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">{output.safety_notes}</p>
                </div>
              )}

              {/* Stats */}
              {stats && (
                <div className="flex items-center gap-4 text-[10px] text-gray-400 pt-1">
                  <span>⏱ {stats.durationMs}ms</span>
                  <span>🪙 {stats.tokensUsed} tokens</span>
                  <span>🎯 Mode: {mode}</span>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!output && !loading && (
            <div className="text-center py-6">
              <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Click <strong>Generate</strong> to create structured alt text for this image
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Uses the processed metadata + vision analysis to produce SEO and accessibility-ready text
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
