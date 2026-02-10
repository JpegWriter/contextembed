'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  Save,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  MapPin,
  FileText,
  Shield,
  Sparkles,
  Loader2,
  User,
  Building,
  Camera,
  ArrowLeftRight,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MetadataStrengthIndicator,
  LocalSignalIndicator,
  OutcomeStatements,
  ProvenancePreview,
  ExplainWhy,
  type MetadataQualityData,
  type OnboardingContext,
} from './MetadataQuality';
import { MetadataDiffView } from './MetadataDiffView';

// ===========================================
// Types
// ===========================================

interface VisionAnalysis {
  subjects?: Array<{ type: string; description: string; prominence: string }>;
  scene?: { type: string; setting: string; timeOfDay?: string };
  mood?: string[];
  style?: string;
  objects?: string[];
  textContent?: Array<{ text: string; type: string }>;
  colors?: { dominant: string[]; palette?: string[] };
  composition?: string;
  naturalDescription?: string;
}

interface PerfectMetadata {
  descriptive?: {
    headline?: string;
    description?: string;
    altText?: string;
    keywords?: string[];
    category?: string;
    subjectCodes?: string[];
  };
  attribution?: {
    creator?: string;
    creditLine?: string;
    copyrightNotice?: string;
    rightsUsageTerms?: string;
    rightsUrl?: string;
    source?: string;
  };
  location?: {
    locationMode?: 'none' | 'fromProfile' | 'fromExifOnly';
    city?: string;
    stateProvince?: string;
    country?: string;
    sublocation?: string;
    gps?: { lat: number; lon: number };
    provenance?: Record<string, 'user' | 'exif' | 'ai_inferred'>;
  };
  workflow?: {
    jobId?: string;
    instructions?: string;
    modelReleaseStatus?: 'unknown' | 'present' | 'not_present';
    propertyReleaseStatus?: 'unknown' | 'present' | 'not_present';
  };
  audit?: {
    ceRunId?: string;
    ceProfileVersion?: string;
    cePromptVersion?: string;
    ceVerificationHash?: string;
  };
}

// Legacy format from current API
interface LegacyMetadataResult {
  headline?: string;
  description?: string;
  keywords?: string[];
  title?: string;
  creator?: string;
  copyright?: string;
  credit?: string;
  source?: string;
  usageTerms?: string;
  webStatement?: string;
  licensorName?: string;
  licensorEmail?: string;
  licensorUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  eventAnchor?: {
    eventId?: string;
    eventName?: string;
    eventDate?: string;
  };
  confidence?: Record<string, number>;
  reasoning?: Record<string, string>;
}

interface AssetData {
  id: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  status: string;
  width?: number;
  height?: number;
  userComment?: string;
  createdAt: string;
  visionResult?: { result: VisionAnalysis } | null;
  metadataResult?: { result: LegacyMetadataResult } | null;
  originalMetadata?: LegacyMetadataResult | null; // Original IPTC before processing
}

interface MetadataSidebarProps {
  asset: AssetData | null;
  onboarding?: OnboardingContext;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReprocess: (id: string) => void;
  onDownload: (id: string) => void;
  onUpdateComment: (id: string, comment: string) => void;
}

// ===========================================
// Validation
// ===========================================

interface FieldValidation {
  valid: boolean;
  message?: string;
  warning?: boolean;
}

interface ValidationStats {
  requiredComplete: number;
  requiredTotal: number;
  keywordCount: number;
  locationSafe: boolean;
  allValid: boolean;
}

function validateField(value: any, rules: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
}): FieldValidation {
  if (rules.required && (value === undefined || value === null || value === '')) {
    return { valid: false, message: 'Required field' };
  }
  if (rules.required && Array.isArray(value) && value.length === 0) {
    return { valid: false, message: 'Required field' };
  }
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return { valid: false, message: `Min ${rules.minLength} characters`, warning: true };
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return { valid: false, message: `Max ${rules.maxLength} characters` };
    }
  }
  if (Array.isArray(value)) {
    if (rules.minItems && value.length < rules.minItems) {
      return { valid: false, message: `Need ${rules.minItems - value.length} more`, warning: true };
    }
    if (rules.maxItems && value.length > rules.maxItems) {
      return { valid: false, message: `Max ${rules.maxItems} items` };
    }
  }
  return { valid: true };
}

// ===========================================
// Helper Components
// ===========================================

function ValidationBadge({ validation }: { validation: FieldValidation }) {
  if (validation.valid) {
    return <CheckCircle2 className="w-3 h-3 text-green-500" />;
  }
  if (validation.warning) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-amber-500" title={validation.message}>
        <AlertTriangle className="w-3 h-3" />
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-red-500" title={validation.message}>
      <XCircle className="w-3 h-3" />
    </span>
  );
}

function ProvenanceBadge({ source }: { source?: 'user' | 'exif' | 'ai_inferred' }) {
  if (!source) return null;
  
  const config = {
    user: { label: 'USR', className: 'bg-blue-900/40 text-blue-400 border-blue-700/50' },
    exif: { label: 'EXF', className: 'bg-green-900/40 text-green-400 border-green-700/50' },
    ai_inferred: { label: 'AI', className: 'bg-purple-900/40 text-purple-400 border-purple-700/50' },
  };
  
  const { label, className } = config[source];
  return (
    <span className={`text-[9px] font-mono px-1 py-0 rounded border ${className}`}>
      {label}
    </span>
  );
}

function ConfidenceBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  
  const percent = Math.round(score * 100);
  const className = percent >= 80 
    ? 'bg-green-900/40 text-green-400 border-green-700/50' 
    : percent >= 50 
    ? 'bg-amber-900/40 text-amber-400 border-amber-700/50'
    : 'bg-red-900/40 text-red-400 border-red-700/50';
  
  return (
    <span className={`text-[9px] font-mono px-1 py-0 rounded border ${className}`}>
      {percent}%
    </span>
  );
}

function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  badge,
}: { 
  title: string; 
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 px-3 hover:bg-gray-800/50 
          transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
          <span className="font-medium text-xs uppercase tracking-wider text-gray-300">{title}</span>
          {badge}
        </div>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

function MetadataField({
  label,
  value,
  validation,
  confidence,
  provenance,
  editable = false,
  multiline = false,
  onCopy,
}: {
  label: string;
  value?: string | string[];
  validation?: FieldValidation;
  confidence?: number;
  provenance?: 'user' | 'exif' | 'ai_inferred';
  editable?: boolean;
  multiline?: boolean;
  onCopy?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  
  const displayValue = Array.isArray(value) ? value.join(', ') : (value || '—');
  const isEmpty = !value || (Array.isArray(value) && value.length === 0);
  
  return (
    <div className="group py-1 border-b border-gray-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            {label}
          </span>
          <ProvenanceBadge source={provenance} />
          <ConfidenceBadge score={confidence} />
        </div>
        <div className="flex items-center gap-1">
          {validation && <ValidationBadge validation={validation} />}
          {!isEmpty && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(displayValue);
                toast.success('Copied');
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-700 
                rounded transition-all"
            >
              <Copy className="w-3 h-3 text-gray-500" />
            </button>
          )}
        </div>
      </div>
      <div className={`text-xs mt-0.5 ${isEmpty ? 'text-gray-600 italic' : 'text-gray-200'} ${multiline ? '' : 'truncate'}`}>
        {multiline ? (
          <p className="whitespace-pre-wrap leading-relaxed">{displayValue}</p>
        ) : (
          <span className="font-mono">{displayValue}</span>
        )}
      </div>
    </div>
  );
}

function KeywordsList({ keywords, validation }: { keywords?: string[]; validation?: FieldValidation }) {
  if (!keywords || keywords.length === 0) {
    return (
      <div className="py-1 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            Keywords
          </span>
          {validation && <ValidationBadge validation={validation} />}
        </div>
        <p className="text-xs text-gray-600 italic mt-0.5">No keywords</p>
      </div>
    );
  }
  
  return (
    <div className="py-1.5 border-b border-gray-800/50">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            Keywords
          </span>
          <span className="text-[10px] text-gray-600 font-mono">{keywords.length}</span>
        </div>
        {validation && <ValidationBadge validation={validation} />}
      </div>
      <div className="flex flex-wrap gap-1">
        {keywords.map((kw, i) => (
          <span
            key={i}
            className="px-1.5 py-0.5 bg-cyan-900/30 text-cyan-300 
              rounded text-[10px] font-medium"
          >
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Health Summary
// ===========================================

function MetadataHealth({ stats }: { stats: ValidationStats }) {
  const percentage = Math.round((stats.requiredComplete / stats.requiredTotal) * 100);
  
  const checks = [
    { label: 'Headline', ok: stats.requiredComplete >= 1 },
    { label: 'Description', ok: stats.requiredComplete >= 2 },
    { label: 'Alt Text', ok: stats.requiredComplete >= 3 },
    { label: `Keywords (${stats.keywordCount})`, ok: stats.keywordCount >= 8 },
    { label: 'Creator', ok: stats.requiredComplete >= 5 },
    { label: 'Copyright', ok: stats.requiredComplete >= 7 },
    { label: 'Location', ok: stats.locationSafe },
    { label: 'XMP Written', ok: stats.allValid },
    { label: 'IPTC Written', ok: stats.allValid },
    { label: 'Hash Final', ok: false },
  ];
  
  return (
    <div className="mb-3 p-2 bg-gray-800 border border-gray-700 rounded">
      {/* Compact header with percentage */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Embed Status</span>
        <span className={`text-sm font-bold font-mono ${
          percentage === 100 ? 'text-green-400' : 
          percentage >= 70 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {percentage}%
        </span>
      </div>
      
      {/* Compact checklist grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {check.ok ? (
              <CheckCircle2 className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-gray-600" />
            )}
            <span className={check.ok ? 'text-gray-300' : 'text-gray-500'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Main Component
// ===========================================

export function MetadataSidebar({
  asset,
  onboarding,
  onClose,
  onApprove,
  onReprocess,
  onDownload,
  onUpdateComment,
}: MetadataSidebarProps) {
  const [activeTab, setActiveTab] = useState<'metadata' | 'quality' | 'vision' | 'info'>('metadata');
  const [userContext, setUserContext] = useState(asset?.userComment || '');
  const [savingContext, setSavingContext] = useState(false);
  const [showDiffView, setShowDiffView] = useState(false);
  const [showExplainWhy, setShowExplainWhy] = useState(false);

  const isCompleted = asset?.status === 'completed' || asset?.status === 'approved';
  const vision = asset?.visionResult?.result;
  const legacyMeta = asset?.metadataResult?.result;

  // Transform legacy metadata to Perfect Metadata structure
  // Must be called before any conditional returns (React hooks rule)
  const metadata: PerfectMetadata = useMemo(() => {
    if (!legacyMeta || !asset) return {};
    
    return {
      descriptive: {
        headline: legacyMeta.headline || legacyMeta.title,
        description: legacyMeta.description,
        altText: legacyMeta.description?.slice(0, 160),
        keywords: legacyMeta.keywords,
      },
      attribution: {
        creator: legacyMeta.creator,
        creditLine: legacyMeta.credit,
        copyrightNotice: legacyMeta.copyright,
        rightsUsageTerms: legacyMeta.usageTerms,
        rightsUrl: legacyMeta.webStatement,
        source: legacyMeta.source,
      },
      location: {
        locationMode: (legacyMeta.city || legacyMeta.country) ? 'fromProfile' : 'none',
        city: legacyMeta.city,
        stateProvince: legacyMeta.state,
        country: legacyMeta.country,
      },
      workflow: {
        jobId: asset.id,
        instructions: legacyMeta.eventAnchor?.eventName || undefined,
        modelReleaseStatus: 'unknown',
        propertyReleaseStatus: 'unknown',
      },
      audit: {
        ceRunId: asset.id,
        ceProfileVersion: '1.0',
        cePromptVersion: '1.0',
        ceVerificationHash: 'pending',
      },
    };
  }, [legacyMeta, asset]);

  // Convert to MetadataQualityData for quality components
  const qualityData: MetadataQualityData = useMemo(() => ({
    descriptive: metadata.descriptive,
    attribution: metadata.attribution,
    location: metadata.location,
  }), [metadata]);

  // Calculate validation stats
  const validationStats: ValidationStats = useMemo(() => {
    const requiredFields = [
      metadata.descriptive?.headline,
      metadata.descriptive?.description,
      metadata.descriptive?.altText,
      metadata.descriptive?.keywords?.length ? metadata.descriptive.keywords : null,
      metadata.attribution?.creator,
      metadata.attribution?.creditLine,
      metadata.attribution?.copyrightNotice,
      metadata.workflow?.jobId,
    ];
    
    const complete = requiredFields.filter(f => f !== null && f !== undefined && f !== '').length;
    const keywordCount = metadata.descriptive?.keywords?.length || 0;
    const locationMode = metadata.location?.locationMode;
    const hasLocationData = !!(metadata.location?.city || metadata.location?.country);
    const locationSafe = locationMode === 'none' ? !hasLocationData : true;
    
    return {
      requiredComplete: complete,
      requiredTotal: requiredFields.length,
      keywordCount,
      locationSafe,
      allValid: complete === requiredFields.length && keywordCount >= 8 && locationSafe,
    };
  }, [metadata]);

  useEffect(() => {
    setUserContext(asset?.userComment || '');
  }, [asset?.userComment]);

  // Early return AFTER all hooks
  if (!asset) return null;

  const handleSaveContext = async () => {
    setSavingContext(true);
    try {
      await onUpdateComment(asset.id, userContext);
      toast.success('Context saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingContext(false);
    }
  };

  const copyAllMetadata = () => {
    const text = JSON.stringify(metadata, null, 2);
    navigator.clipboard.writeText(text);
    toast.success('Metadata copied to clipboard');
  };

  const copySection = (section: keyof PerfectMetadata) => {
    const data = metadata[section];
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success(`${section} copied`);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-gray-900 
      z-50 flex flex-col border-l border-gray-700">
      
      {/* Header - Compact file info */}
      <div className="flex items-start justify-between px-3 py-2 border-b border-gray-800 bg-gray-900">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white truncate font-mono">{asset.originalFilename}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mt-0.5">
            <span>{asset.width}×{asset.height}</span>
            <span>•</span>
            <span>{(asset.size / 1024 / 1024).toFixed(2)} MB</span>
            <span>•</span>
            <span className={`uppercase font-medium ${
              asset.status === 'approved' ? 'text-green-400' :
              asset.status === 'completed' ? 'text-emerald-400' :
              asset.status === 'failed' ? 'text-red-400' : 'text-gray-400'
            }`}>{asset.status}</span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs - Segmented control style */}
      <div className="flex border-b border-gray-800 bg-gray-900/50">
        {[
          { id: 'metadata', label: 'Fields', icon: FileText },
          { id: 'quality', label: 'Quality', icon: Shield },
          { id: 'vision', label: 'AI', icon: Sparkles },
          { id: 'info', label: 'Info', icon: Info },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium
              transition-colors border-b-2 -mb-px uppercase tracking-wider
              ${activeTab === tab.id 
                ? 'border-cyan-500 text-cyan-400 bg-gray-800/50' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'metadata' && (
          <div>
            {!isCompleted ? (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500/70" />
                <p className="font-medium text-sm text-gray-400">Not Yet Processed</p>
                <p className="text-xs mt-1 text-gray-600">Run embed to generate metadata</p>
              </div>
            ) : (
              <>
                {/* Before/After Toggle */}
                <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
                  <button
                    onClick={() => setShowDiffView(!showDiffView)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      showDiffView 
                        ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-700/50' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Before / After
                  </button>
                  <button
                    onClick={() => setShowExplainWhy(!showExplainWhy)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      showExplainWhy 
                        ? 'bg-purple-900/40 text-purple-400 border border-purple-700/50' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                    title="Why was this metadata generated?"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Why?
                  </button>
                </div>

                {/* Diff View */}
                {showDiffView && (
                  <div className="px-3 py-3 border-b border-gray-800 bg-gray-800/30">
                    <MetadataDiffView 
                      original={asset?.originalMetadata || undefined}
                      generated={legacyMeta || undefined}
                    />
                  </div>
                )}

                {/* Explain Why Panel */}
                {showExplainWhy && (
                  <div className="px-3 py-3 border-b border-gray-800">
                    <ExplainWhy
                      visionApplied={!!vision}
                      situationalApplied={!!(legacyMeta?.eventAnchor?.eventName || metadata.workflow?.instructions)}
                      userContextApplied={!!asset?.userComment}
                      onboardingApplied={!!(onboarding?.brandName || onboarding?.creatorName)}
                      expanded
                    />
                  </div>
                )}

                {/* Health Summary */}
                <MetadataHealth stats={validationStats} />

                {/* Copy All Button */}
                <button
                  onClick={copyAllMetadata}
                  className="w-full mx-3 mb-2 flex items-center justify-center gap-1.5 py-1.5 
                    border border-gray-700 rounded text-xs text-gray-400
                    hover:bg-gray-800 hover:text-gray-200 transition-colors"
                  style={{ width: 'calc(100% - 1.5rem)' }}
                >
                  <Copy className="w-3 h-3" />
                  Copy All
                  <span className="text-gray-600 text-[10px] ml-1">⌘C</span>
                </button>

                {/* DESCRIPTIVE Section */}
                <CollapsibleSection 
                  title="Descriptive" 
                  icon={FileText}
                  badge={
                    <span className="text-[10px] font-mono px-1 py-0 bg-cyan-900/40 text-cyan-400 
                      rounded border border-cyan-700/50">
                      {validationStats.keywordCount}kw
                    </span>
                  }
                >
                  <MetadataField
                    label="Headline"
                    value={metadata.descriptive?.headline}
                    validation={validateField(metadata.descriptive?.headline, { required: true, minLength: 5, maxLength: 120 })}
                    confidence={legacyMeta?.confidence?.headline}
                  />
                  <MetadataField
                    label="Description"
                    value={metadata.descriptive?.description}
                    validation={validateField(metadata.descriptive?.description, { required: true, minLength: 20, maxLength: 1200 })}
                    confidence={legacyMeta?.confidence?.description}
                    multiline
                  />
                  <MetadataField
                    label="Alt Text"
                    value={metadata.descriptive?.altText}
                    validation={validateField(metadata.descriptive?.altText, { required: true, minLength: 10, maxLength: 160 })}
                  />
                  <KeywordsList
                    keywords={metadata.descriptive?.keywords}
                    validation={validateField(metadata.descriptive?.keywords, { required: true, minItems: 8, maxItems: 35 })}
                  />
                  <button
                    onClick={() => copySection('descriptive')}
                    className="text-[10px] text-gray-500 hover:text-cyan-400 mt-1.5 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </CollapsibleSection>

                {/* ATTRIBUTION Section */}
                <CollapsibleSection title="Attribution & Rights" icon={Shield}>
                  <MetadataField
                    label="Creator"
                    value={metadata.attribution?.creator}
                    validation={validateField(metadata.attribution?.creator, { required: true, minLength: 2, maxLength: 80 })}
                  />
                  <MetadataField
                    label="Credit Line"
                    value={metadata.attribution?.creditLine}
                    validation={validateField(metadata.attribution?.creditLine, { required: true, minLength: 2, maxLength: 120 })}
                  />
                  <MetadataField
                    label="Copyright Notice"
                    value={metadata.attribution?.copyrightNotice}
                    validation={validateField(metadata.attribution?.copyrightNotice, { required: true, minLength: 2, maxLength: 160 })}
                  />
                  <MetadataField
                    label="Usage Terms"
                    value={metadata.attribution?.rightsUsageTerms}
                  />
                  <MetadataField
                    label="Rights URL"
                    value={metadata.attribution?.rightsUrl}
                  />
                  <MetadataField
                    label="Source"
                    value={metadata.attribution?.source}
                  />
                  <button
                    onClick={() => copySection('attribution')}
                    className="text-[10px] text-gray-500 hover:text-cyan-400 mt-1.5 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </CollapsibleSection>

                {/* LOCATION Section */}
                <CollapsibleSection 
                  title="Location" 
                  icon={MapPin}
                  badge={
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      metadata.location?.locationMode === 'none' 
                        ? 'bg-gray-100 text-gray-600' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {metadata.location?.locationMode || 'none'}
                    </span>
                  }
                >
                  <div className="py-2 mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">Mode</span>
                    <p className="text-sm capitalize">{metadata.location?.locationMode || 'none'}</p>
                  </div>
                  
                  {metadata.location?.locationMode !== 'none' && (
                    <>
                      <MetadataField
                        label="City"
                        value={metadata.location?.city}
                        provenance={metadata.location?.provenance?.city}
                      />
                      <MetadataField
                        label="State/Province"
                        value={metadata.location?.stateProvince}
                        provenance={metadata.location?.provenance?.stateProvince}
                      />
                      <MetadataField
                        label="Country"
                        value={metadata.location?.country}
                        provenance={metadata.location?.provenance?.country}
                      />
                      <MetadataField
                        label="Sublocation"
                        value={metadata.location?.sublocation}
                      />
                    </>
                  )}
                  
                  {metadata.location?.locationMode === 'none' && (
                    <p className="text-sm text-gray-400 italic py-2">
                      No location data (safe mode)
                    </p>
                  )}
                  
                  <button
                    onClick={() => copySection('location')}
                    className="text-[10px] text-gray-500 hover:text-cyan-400 mt-1.5 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </CollapsibleSection>

                {/* WORKFLOW Section */}
                <CollapsibleSection title="Workflow" icon={Building} defaultOpen={false}>
                  <MetadataField
                    label="Job ID"
                    value={metadata.workflow?.jobId}
                    validation={validateField(metadata.workflow?.jobId, { required: true })}
                  />
                  <MetadataField
                    label="Instructions"
                    value={metadata.workflow?.instructions}
                    multiline
                  />
                  <div className="py-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">Model Release</span>
                    <p className="text-sm capitalize">{metadata.workflow?.modelReleaseStatus || 'unknown'}</p>
                  </div>
                  <div className="py-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">Property Release</span>
                    <p className="text-sm capitalize">{metadata.workflow?.propertyReleaseStatus || 'unknown'}</p>
                  </div>
                </CollapsibleSection>

                {/* AUDIT Section */}
                <CollapsibleSection title="ContextEmbed Audit" icon={Camera} defaultOpen={false}>
                  <MetadataField label="Run ID" value={metadata.audit?.ceRunId} />
                  <MetadataField label="Profile Version" value={metadata.audit?.ceProfileVersion} />
                  <MetadataField label="Prompt Version" value={metadata.audit?.cePromptVersion} />
                  <MetadataField label="Verification Hash" value={metadata.audit?.ceVerificationHash} />
                </CollapsibleSection>
              </>
            )}
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="p-3 space-y-4">
            {!isCompleted ? (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500/70" />
                <p className="font-medium text-sm text-gray-400">Not Yet Processed</p>
                <p className="text-xs mt-1 text-gray-600">Run embed to see quality metrics</p>
              </div>
            ) : (
              <>
                {/* Metadata Strength Indicator */}
                <div>
                  <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Metadata Strength
                  </h4>
                  <MetadataStrengthIndicator 
                    metadata={qualityData} 
                    onboarding={onboarding} 
                  />
                </div>

                {/* Provenance Attribution Preview */}
                <div>
                  <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Public Attribution
                  </h4>
                  <ProvenancePreview 
                    metadata={qualityData} 
                    onboarding={onboarding} 
                  />
                </div>

                {/* Local Signal Indicator */}
                <div>
                  <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Local SEO
                  </h4>
                  <LocalSignalIndicator 
                    metadata={qualityData} 
                    onboarding={onboarding} 
                  />
                </div>

                {/* Outcome Statements */}
                <div>
                  <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Achievements
                  </h4>
                  <OutcomeStatements 
                    metadata={qualityData} 
                    onboarding={onboarding} 
                  />
                </div>

                {/* Context Applied (Explain Why) */}
                <div>
                  <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                    How This Was Generated
                  </h4>
                  <ExplainWhy
                    visionApplied={!!vision}
                    situationalApplied={!!(legacyMeta?.eventAnchor?.eventName || metadata.workflow?.instructions)}
                    userContextApplied={!!asset?.userComment}
                    onboardingApplied={!!(onboarding?.brandName || onboarding?.creatorName)}
                    expanded
                  />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'vision' && (
          <div className="p-3">
            {!vision ? (
              <div className="text-center py-12 text-gray-600">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                <p className="text-sm">No AI analysis available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vision.naturalDescription && (
                  <div className="p-3 bg-gradient-to-br from-purple-900/20 to-blue-900/20 
                    border border-purple-700/30 rounded">
                    <p className="text-xs italic text-gray-300 leading-relaxed">
                      "{vision.naturalDescription}"
                    </p>
                  </div>
                )}

                {vision.subjects && vision.subjects.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Subjects</h4>
                    <div className="space-y-1">
                      {vision.subjects.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="px-1.5 py-0.5 bg-blue-900/40 border border-blue-700/50
                            text-blue-400 rounded text-[10px] font-mono shrink-0">
                            {s.type}
                          </span>
                          <span className="text-gray-400">{s.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vision.scene && (
                  <div>
                    <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Scene</h4>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300">
                        {vision.scene.type}
                      </span>
                      <span className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300">
                        {vision.scene.setting}
                      </span>
                      {vision.scene.timeOfDay && (
                        <span className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300">
                          {vision.scene.timeOfDay}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {vision.mood && vision.mood.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Mood</h4>
                    <div className="flex flex-wrap gap-1">
                      {vision.mood.map((m, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-pink-900/30 border border-pink-700/50
                          text-pink-400 rounded text-xs">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {vision.objects && vision.objects.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Objects</h4>
                    <div className="flex flex-wrap gap-1">
                      {vision.objects.map((o, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 
                          rounded text-[10px] text-gray-400 font-mono">
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {vision.colors?.dominant && (
                  <div>
                    <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Colors</h4>
                    <div className="flex flex-wrap gap-1">
                      {vision.colors.dominant.map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 
                          rounded text-xs capitalize text-gray-300">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="p-3 space-y-3">
            {/* User Context */}
            <div>
              <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                User Context
              </h4>
              <textarea
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="Add context: names, location, event details..."
                className="w-full h-20 p-2 text-xs font-mono border border-gray-700 
                  rounded bg-gray-800 text-gray-200 resize-none placeholder:text-gray-600
                  focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600/50"
              />
              <button
                onClick={handleSaveContext}
                disabled={savingContext}
                className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 bg-gray-700 text-gray-200 
                  rounded text-xs font-medium hover:bg-gray-600 disabled:opacity-50 
                  border border-gray-600 transition-colors"
              >
                {savingContext ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
                <span className="text-gray-500 text-[10px]">S</span>
              </button>
            </div>

            {/* File Info */}
            <div>
              <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                File Details
              </h4>
              <div className="space-y-0.5">
                <div className="flex justify-between py-0.5 border-b border-gray-800/50">
                  <span className="text-[10px] text-gray-500 uppercase">Filename</span>
                  <span className="text-xs font-mono text-gray-200 truncate max-w-[60%]">{asset.originalFilename}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-gray-800/50">
                  <span className="text-[10px] text-gray-500 uppercase">Dimensions</span>
                  <span className="text-xs font-mono text-gray-200">{asset.width} × {asset.height}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-gray-800/50">
                  <span className="text-[10px] text-gray-500 uppercase">Size</span>
                  <span className="text-xs font-mono text-gray-200">{(asset.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-gray-800/50">
                  <span className="text-[10px] text-gray-500 uppercase">Type</span>
                  <span className="text-xs font-mono text-gray-200">{asset.mimeType}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-gray-800/50">
                  <span className="text-[10px] text-gray-500 uppercase">Status</span>
                  <span className={`text-xs font-mono uppercase ${
                    asset.status === 'completed' ? 'text-green-400' :
                    asset.status === 'approved' ? 'text-cyan-400' :
                    asset.status === 'failed' ? 'text-red-400' : 'text-gray-200'
                  }`}>
                    {asset.status}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[10px] text-gray-500 uppercase">Created</span>
                  <span className="text-xs font-mono text-gray-200">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - Pro tool style */}
      <div className="px-3 py-2 border-t border-gray-800 bg-gray-900 space-y-2">
        <button
          onClick={() => onApprove(asset.id)}
          disabled={!validationStats.allValid || asset.status === 'approved'}
          className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 
            text-white rounded text-sm font-medium hover:bg-green-500 
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-green-500"
        >
          <Check className="w-4 h-4" />
          {asset.status === 'approved' ? 'Committed' : 'Commit Embed'}
          <span className="text-green-200 text-xs ml-1 opacity-70">A</span>
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={() => onReprocess(asset.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 
              border border-gray-700 bg-gray-800 text-gray-200 rounded text-sm font-medium
              hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reprocess
            <span className="text-gray-500 text-xs">R</span>
          </button>
          <button
            onClick={() => onDownload(asset.id)}
            disabled={!isCompleted}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 
              bg-cyan-600 text-white rounded text-sm font-medium
              hover:bg-cyan-500 disabled:opacity-50 transition-colors border border-cyan-500"
          >
            <Download className="w-3.5 h-3.5" />
            Export
            <span className="text-cyan-200 text-xs">E</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MetadataSidebar;
