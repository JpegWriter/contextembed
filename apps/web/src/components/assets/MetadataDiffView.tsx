'use client';

import { useState, useMemo } from 'react';
import {
  ArrowRight,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Code2,
  FileText,
} from 'lucide-react';

// ===========================================
// Types
// ===========================================

interface MetadataField {
  key: string;
  label: string;
  before: string | string[] | undefined;
  after: string | string[] | undefined;
}

interface OriginalMetadata {
  headline?: string;
  description?: string;
  keywords?: string[];
  creator?: string;
  copyright?: string;
  credit?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface GeneratedMetadata {
  headline?: string;
  description?: string;
  keywords?: string[];
  creator?: string;
  copyright?: string;
  credit?: string;
  city?: string;
  state?: string;
  country?: string;
}

// ===========================================
// Diff Calculation
// ===========================================

function normalizeValue(val: string | string[] | undefined): string {
  if (val === undefined || val === null) return '';
  if (Array.isArray(val)) return val.join(', ');
  return val;
}

function hasChanged(before: string | string[] | undefined, after: string | string[] | undefined): boolean {
  return normalizeValue(before) !== normalizeValue(after);
}

function getChangeType(before: string | string[] | undefined, after: string | string[] | undefined): 'added' | 'removed' | 'modified' | 'unchanged' {
  const beforeVal = normalizeValue(before);
  const afterVal = normalizeValue(after);
  
  if (beforeVal === afterVal) return 'unchanged';
  if (!beforeVal && afterVal) return 'added';
  if (beforeVal && !afterVal) return 'removed';
  return 'modified';
}

// ===========================================
// Main Component
// ===========================================

interface MetadataDiffViewProps {
  original: OriginalMetadata | undefined;
  generated: GeneratedMetadata | undefined;
  showAdvanced?: boolean;
}

export function MetadataDiffView({ 
  original, 
  generated,
  showAdvanced: initialShowAdvanced = false,
}: MetadataDiffViewProps) {
  const [showAdvanced, setShowAdvanced] = useState(initialShowAdvanced);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline'>('inline');

  const fields = useMemo((): MetadataField[] => {
    const fieldList: MetadataField[] = [
      { key: 'headline', label: 'Headline', before: original?.headline, after: generated?.headline },
      { key: 'description', label: 'Description', before: original?.description, after: generated?.description },
      { key: 'keywords', label: 'Keywords', before: original?.keywords, after: generated?.keywords },
      { key: 'creator', label: 'Creator', before: original?.creator, after: generated?.creator },
      { key: 'copyright', label: 'Copyright', before: original?.copyright, after: generated?.copyright },
      { key: 'credit', label: 'Credit', before: original?.credit, after: generated?.credit },
      { key: 'city', label: 'City', before: original?.city, after: generated?.city },
      { key: 'state', label: 'State/Region', before: original?.state, after: generated?.state },
      { key: 'country', label: 'Country', before: original?.country, after: generated?.country },
    ];
    return fieldList;
  }, [original, generated]);

  const changedFields = fields.filter(f => hasChanged(f.before, f.after));
  const unchangedFields = fields.filter(f => !hasChanged(f.before, f.after) && (f.before || f.after));
  const addedCount = changedFields.filter(f => getChangeType(f.before, f.after) === 'added').length;
  const modifiedCount = changedFields.filter(f => getChangeType(f.before, f.after) === 'modified').length;

  if (!generated) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">No metadata generated yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Before / After
          </span>
          {changedFields.length > 0 && (
            <span className="px-1.5 py-0.5 bg-brand-900/40 text-brand-400 text-[10px] font-mono rounded border border-brand-700/50">
              {addedCount > 0 && `+${addedCount}`}
              {addedCount > 0 && modifiedCount > 0 && ' / '}
              {modifiedCount > 0 && `~${modifiedCount}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-1 rounded text-xs ${
              showAdvanced 
                ? 'bg-gray-700 text-gray-200' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title={showAdvanced ? 'Hide JSON' : 'Show JSON'}
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Changed Fields */}
      {changedFields.length > 0 && (
        <div className="space-y-2">
          {changedFields.map((field) => (
            <DiffField key={field.key} field={field} />
          ))}
        </div>
      )}

      {/* Unchanged Fields (collapsed) */}
      {unchangedFields.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            {unchangedFields.length} unchanged fields
          </p>
          <div className="space-y-1">
            {unchangedFields.map((field) => (
              <div key={field.key} className="flex items-center gap-2 text-[10px]">
                <span className="text-gray-600">{field.label}:</span>
                <span className="text-gray-500 truncate">
                  {normalizeValue(field.after) || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Changes */}
      {changedFields.length === 0 && (
        <div className="p-3 text-center text-gray-500 bg-gray-800/50 rounded">
          <p className="text-xs">No changes detected</p>
          <p className="text-[10px] text-gray-600 mt-1">
            Original metadata was already complete
          </p>
        </div>
      )}

      {/* Advanced JSON View */}
      {showAdvanced && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            Raw JSON
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] text-gray-600 uppercase mb-1">Before</p>
              <pre className="p-2 bg-gray-900 rounded text-[9px] text-gray-400 overflow-x-auto max-h-40">
                {JSON.stringify(original || {}, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-[9px] text-gray-600 uppercase mb-1">After</p>
              <pre className="p-2 bg-gray-900 rounded text-[9px] text-brand-300 overflow-x-auto max-h-40">
                {JSON.stringify(generated || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Diff Field Component
// ===========================================

function DiffField({ field }: { field: MetadataField }) {
  const changeType = getChangeType(field.before, field.after);
  const beforeVal = normalizeValue(field.before);
  const afterVal = normalizeValue(field.after);

  const config = {
    added: {
      icon: Plus,
      iconColor: 'text-green-500',
      bgBefore: 'bg-transparent',
      bgAfter: 'bg-green-900/30',
      borderAfter: 'border-green-700/50',
    },
    removed: {
      icon: Minus,
      iconColor: 'text-red-500',
      bgBefore: 'bg-red-900/30',
      bgAfter: 'bg-transparent',
      borderAfter: 'border-gray-700',
    },
    modified: {
      icon: ArrowRight,
      iconColor: 'text-amber-500',
      bgBefore: 'bg-red-900/20',
      bgAfter: 'bg-green-900/20',
      borderAfter: 'border-amber-700/50',
    },
    unchanged: {
      icon: ArrowRight,
      iconColor: 'text-gray-600',
      bgBefore: 'bg-transparent',
      bgAfter: 'bg-transparent',
      borderAfter: 'border-gray-700',
    },
  };

  const style = config[changeType];
  const Icon = style.icon;

  // For keywords, show individual changes
  if (field.key === 'keywords' && Array.isArray(field.before) && Array.isArray(field.after)) {
    return <KeywordsDiff before={field.before} after={field.after} />;
  }

  return (
    <div className={`p-2 rounded border ${style.borderAfter} ${style.bgAfter}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3 h-3 ${style.iconColor}`} />
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          {field.label}
        </span>
        <span className={`text-[9px] px-1 py-0.5 rounded ${
          changeType === 'added' ? 'bg-green-800/50 text-green-400' :
          changeType === 'modified' ? 'bg-amber-800/50 text-amber-400' :
          changeType === 'removed' ? 'bg-red-800/50 text-red-400' :
          'bg-gray-700 text-gray-400'
        }`}>
          {changeType}
        </span>
      </div>

      {changeType === 'modified' && beforeVal && (
        <div className="mb-1">
          <span className="text-[9px] text-gray-600">WAS: </span>
          <span className="text-xs text-red-400/70 line-through">
            {beforeVal.length > 100 ? beforeVal.slice(0, 100) + '...' : beforeVal}
          </span>
        </div>
      )}
      
      <div>
        {changeType !== 'removed' && (
          <span className="text-xs text-gray-200">
            {afterVal.length > 200 ? afterVal.slice(0, 200) + '...' : afterVal}
          </span>
        )}
        {changeType === 'removed' && (
          <span className="text-xs text-red-400/70">
            {beforeVal.length > 200 ? beforeVal.slice(0, 200) + '...' : beforeVal}
          </span>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Keywords Diff Component
// ===========================================

function KeywordsDiff({ before, after }: { before: string[]; after: string[] }) {
  const beforeSet = new Set(before.map(k => k.toLowerCase()));
  const afterSet = new Set(after.map(k => k.toLowerCase()));
  
  const added = after.filter(k => !beforeSet.has(k.toLowerCase()));
  const removed = before.filter(k => !afterSet.has(k.toLowerCase()));
  const kept = after.filter(k => beforeSet.has(k.toLowerCase()));

  return (
    <div className="p-2 rounded border border-brand-700/50 bg-brand-900/10">
      <div className="flex items-center gap-2 mb-2">
        <ArrowRight className="w-3 h-3 text-brand-500" />
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Keywords
        </span>
        <span className="text-[9px] text-gray-500 font-mono">
          {before.length} → {after.length}
        </span>
        {added.length > 0 && (
          <span className="text-[9px] px-1 py-0.5 bg-green-800/50 text-green-400 rounded">
            +{added.length}
          </span>
        )}
        {removed.length > 0 && (
          <span className="text-[9px] px-1 py-0.5 bg-red-800/50 text-red-400 rounded">
            -{removed.length}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {added.map((kw, i) => (
          <span 
            key={`add-${i}`} 
            className="px-1.5 py-0.5 bg-green-900/40 text-green-300 rounded text-[10px] border border-green-700/50"
          >
            + {kw}
          </span>
        ))}
        {kept.map((kw, i) => (
          <span 
            key={`keep-${i}`} 
            className="px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded text-[10px] border border-gray-700"
          >
            {kw}
          </span>
        ))}
        {removed.map((kw, i) => (
          <span 
            key={`rem-${i}`} 
            className="px-1.5 py-0.5 bg-red-900/40 text-red-400 rounded text-[10px] line-through border border-red-700/50"
          >
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}

export default MetadataDiffView;
