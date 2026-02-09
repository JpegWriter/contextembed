'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  RefreshCw,
  Lightbulb,
  BarChart3,
} from 'lucide-react';

interface IAStatus {
  fileExists: boolean;
  fileError?: string;
  filePath?: string;
  summary?: {
    version: string;
    product: string;
    stats: {
      moneyPages: number;
      pillars: number;
      trustPages: number;
      supportPages: number;
      caseStudies: number;
      releaseNotes: number;
      calendarMonths: number;
      totalCalendarItems: number;
    };
    monthlyThemes: Array<{ month: string; theme: string; itemCount: number }>;
  };
  validation?: {
    valid: boolean;
    errorCount: number;
    warningCount: number;
    coverageScore: number;
  };
  dbPlan?: {
    id: string;
    version: string;
    productName: string;
    coverageScore: number;
    importedAt: string;
    counts: {
      pages: number;
      calendarItems: number;
      linkRules: number;
      mentionsPolicies: number;
    };
  } | null;
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string; code: string }>;
  warnings: Array<{ type: string; message: string }>;
  stats: {
    moneyPagesCount: number;
    pillarsCount: number;
    trustPagesCount: number;
    supportPagesCount: number;
    caseStudiesCount: number;
    releaseNotesCount: number;
    calendarItemsCount: number;
    totalMonths: number;
    adobeMentionsPerMonth: Record<string, number>;
  };
  coverageScore: number;
  suggestions: Array<{ type: string; priority: string; message: string; action?: string }>;
  linkAnalysis: {
    orphanedPages: string[];
    highlyLinkedPages: Array<{ id: string; count: number }>;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminIAPage() {
  const [status, setStatus] = useState<IAStatus | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/ia`);
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch IA status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    try {
      setValidating(true);
      setMessage(null);
      const res = await fetch(`${API_BASE}/admin/ia/validate`, { method: 'POST' });
      const data = await res.json();
      setValidation(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Validation failed' });
    } finally {
      setValidating(false);
    }
  }

  async function handleImport() {
    try {
      setImporting(true);
      setMessage(null);
      const res = await fetch(`${API_BASE}/admin/ia/import`, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Plan imported successfully!' });
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Import failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Import failed' });
    } finally {
      setImporting(false);
    }
  }

  function getCoverageScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  }

  function getCoverageScoreBg(score: number): string {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-amber-100';
    return 'bg-red-100';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* File Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Plan Status</h2>
          
          {status?.fileExists ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-slate-600">
                  Plan file found: <code className="text-xs bg-slate-100 px-2 py-1 rounded">{status.filePath}</code>
                </span>
              </div>
              
              {status.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <StatCard
                    label="Money Pages"
                    value={status.summary.stats.moneyPages}
                    icon={<FileText className="w-4 h-4" />}
                  />
                  <StatCard
                    label="Pillars"
                    value={status.summary.stats.pillars}
                    icon={<FileText className="w-4 h-4" />}
                  />
                  <StatCard
                    label="Calendar Months"
                    value={status.summary.stats.calendarMonths}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                  <StatCard
                    label="Calendar Items"
                    value={status.summary.stats.totalCalendarItems}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                </div>
              )}

              {/* Coverage Score */}
              {status.validation && (
                <div className={`mt-4 p-4 rounded-lg ${getCoverageScoreBg(status.validation.coverageScore)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BarChart3 className={`w-5 h-5 ${getCoverageScoreColor(status.validation.coverageScore)}`} />
                      <span className="font-medium text-slate-900">IA Coverage Score</span>
                    </div>
                    <span className={`text-3xl font-bold ${getCoverageScoreColor(status.validation.coverageScore)}`}>
                      {status.validation.coverageScore}/100
                    </span>
                  </div>
                  {status.validation.warningCount > 0 && (
                    <p className="text-sm text-slate-600 mt-2">
                      {status.validation.warningCount} warning(s) found
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <span>{status?.fileError || 'No plan file found'}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex gap-3">
          <button
            onClick={handleValidate}
            disabled={!status?.fileExists || validating}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {validating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Validate Plan
          </button>
          <button
            onClick={handleImport}
            disabled={!status?.fileExists || importing}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import to Database
          </button>
        </div>
      </div>

      {/* Database Status */}
      {status?.dbPlan && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Database Status</h2>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-slate-600">
              Plan imported on {new Date(status.dbPlan.importedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Pages" value={status.dbPlan.counts.pages} icon={<FileText className="w-4 h-4" />} />
            <StatCard label="Calendar Items" value={status.dbPlan.counts.calendarItems} icon={<Calendar className="w-4 h-4" />} />
            <StatCard label="Link Rules" value={status.dbPlan.counts.linkRules} icon={<Link2 className="w-4 h-4" />} />
            <StatCard label="Coverage Score" value={status.dbPlan.coverageScore} icon={<BarChart3 className="w-4 h-4" />} />
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validation && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Validation Results</h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Money Pages" value={validation.stats.moneyPagesCount} icon={<FileText className="w-4 h-4" />} />
              <StatCard label="Pillars" value={validation.stats.pillarsCount} icon={<FileText className="w-4 h-4" />} />
              <StatCard label="Trust Pages" value={validation.stats.trustPagesCount} icon={<FileText className="w-4 h-4" />} />
              <StatCard label="Support Pages" value={validation.stats.supportPagesCount} icon={<FileText className="w-4 h-4" />} />
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-red-800 mb-2">Errors ({validation.errors.length})</h3>
                <div className="space-y-2">
                  {validation.errors.map((error, i) => (
                    <div key={i} className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
                      <span className="font-mono text-xs">{error.path}</span>: {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-amber-800 mb-2">Warnings ({validation.warnings.length})</h3>
                <div className="space-y-2">
                  {validation.warnings.map((warning, i) => (
                    <div key={i} className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{warning.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {validation.suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Suggestions ({validation.suggestions.length})
                </h3>
                <div className="space-y-2">
                  {validation.suggestions.map((suggestion, i) => (
                    <div key={i} className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                          suggestion.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {suggestion.priority}
                        </span>
                        <span className="font-medium">{suggestion.message}</span>
                      </div>
                      {suggestion.action && (
                        <p className="text-blue-700 text-xs mt-1">→ {suggestion.action}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Export</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`${API_BASE}/admin/ia/export/calendar`}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Calendar CSV
          </a>
          <a
            href={`${API_BASE}/admin/ia/export/pages`}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Pages CSV
          </a>
          <a
            href={`${API_BASE}/admin/ia/export/link-rules`}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Link Rules CSV
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
