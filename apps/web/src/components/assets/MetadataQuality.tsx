'use client';

import { useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  User,
  MapPin,
  FileText,
  Globe,
  Award,
  Sparkles,
  Building2,
  Zap,
  Eye,
} from 'lucide-react';

// ===========================================
// Types
// ===========================================

export interface MetadataQualityData {
  descriptive?: {
    headline?: string;
    description?: string;
    altText?: string;
    keywords?: string[];
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
  };
}

export interface OnboardingContext {
  brandName?: string;
  industry?: string;
  niche?: string;
  yearsExperience?: number;
  credentials?: string[];
  specializations?: string[];
  serviceArea?: string[];
  creatorName?: string;
  website?: string;
}

export type MetadataStrength = 'weak' | 'good' | 'excellent';

export interface StrengthChecklist {
  provenance: boolean;
  rights: boolean;
  contextual: boolean;
  local: boolean;
  eeat: boolean;
}

// ===========================================
// Strength Calculation
// ===========================================

export function calculateMetadataStrength(
  metadata: MetadataQualityData | undefined,
  onboarding?: OnboardingContext
): { strength: MetadataStrength; checklist: StrengthChecklist; score: number } {
  if (!metadata) {
    return {
      strength: 'weak',
      checklist: { provenance: false, rights: false, contextual: false, local: false, eeat: false },
      score: 0,
    };
  }

  // 1. Provenance - Author/creator traceable (from metadata or profile)
  const hasCreator = !!(
    metadata.attribution?.creator || 
    metadata.attribution?.source || 
    onboarding?.creatorName
  );
  const hasCredit = !!(
    metadata.attribution?.creditLine || 
    metadata.attribution?.source ||
    onboarding?.brandName
  );
  const provenance = hasCreator && hasCredit;

  // 2. Rights - Complete rights fields (from metadata or profile)
  const hasCopyright = !!(
    metadata.attribution?.copyrightNotice || 
    onboarding?.creatorName ||
    onboarding?.brandName
  );
  const hasUsage = !!(
    metadata.attribution?.rightsUsageTerms || 
    metadata.attribution?.rightsUrl ||
    onboarding?.website
  );
  const rights = hasCopyright && hasUsage;

  // 3. Contextual - Description with substance
  const contextual = !!(
    metadata.descriptive?.headline &&
    metadata.descriptive?.description &&
    (metadata.descriptive?.description?.length || 0) >= 50 &&
    metadata.descriptive?.keywords &&
    metadata.descriptive.keywords.length >= 8
  );

  // 4. Local - Location/entity signals
  const hasLocation = metadata.location?.locationMode !== 'none' && (
    metadata.location?.city ||
    metadata.location?.country
  );
  const hasEntity = !!(onboarding?.brandName || metadata.attribution?.creator);
  const local = !!(hasLocation || hasEntity);

  // 5. EEAT - Expertise, Experience, Authority, Trust
  const eeat = !!(
    onboarding?.yearsExperience ||
    (onboarding?.credentials && onboarding.credentials.length > 0) ||
    (onboarding?.specializations && onboarding.specializations.length > 0) ||
    onboarding?.website
  );

  const checklist: StrengthChecklist = { provenance, rights, contextual, local, eeat };
  const score = Object.values(checklist).filter(Boolean).length;
  
  let strength: MetadataStrength;
  if (score >= 5) strength = 'excellent';
  else if (score >= 3) strength = 'good';
  else strength = 'weak';

  return { strength, checklist, score };
}

// ===========================================
// Metadata Strength Indicator Component
// ===========================================

interface MetadataStrengthProps {
  metadata: MetadataQualityData | undefined;
  onboarding?: OnboardingContext;
  compact?: boolean;
}

export function MetadataStrengthIndicator({ 
  metadata, 
  onboarding, 
  compact = false 
}: MetadataStrengthProps) {
  const { strength, checklist, score } = useMemo(
    () => calculateMetadataStrength(metadata, onboarding),
    [metadata, onboarding]
  );

  const strengthConfig = {
    weak: {
      label: 'Weak',
      bg: 'bg-red-900/40',
      border: 'border-red-700/50',
      text: 'text-red-400',
      icon: AlertTriangle,
      description: 'Missing critical metadata fields',
    },
    good: {
      label: 'Good',
      bg: 'bg-amber-900/40',
      border: 'border-amber-700/50',
      text: 'text-amber-400',
      icon: CheckCircle2,
      description: 'Core metadata present, some gaps',
    },
    excellent: {
      label: 'Excellent',
      bg: 'bg-green-900/40',
      border: 'border-green-700/50',
      text: 'text-green-400',
      icon: Award,
      description: 'Professional-grade metadata',
    },
  };

  const config = strengthConfig[strength];
  const StrengthIcon = config.icon;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${config.bg} border ${config.border}`}>
        <StrengthIcon className={`w-3.5 h-3.5 ${config.text}`} />
        <span className={`text-xs font-bold uppercase tracking-wide ${config.text}`}>
          {config.label}
        </span>
        <span className="text-[10px] text-gray-500 font-mono">{score}/5</span>
      </div>
    );
  }

  const checkItems = [
    { key: 'provenance', label: 'Author / Provenance', icon: User, checked: checklist.provenance },
    { key: 'rights', label: 'Rights & Usage', icon: Shield, checked: checklist.rights },
    { key: 'contextual', label: 'Contextual Description', icon: FileText, checked: checklist.contextual },
    { key: 'local', label: 'Local / Entity Signals', icon: MapPin, checked: checklist.local },
    { key: 'eeat', label: 'EEAT Completeness', icon: Award, checked: checklist.eeat },
  ];

  return (
    <div className={`p-3 rounded-lg ${config.bg} border ${config.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StrengthIcon className={`w-5 h-5 ${config.text}`} />
          <div>
            <span className={`text-sm font-bold uppercase tracking-wide ${config.text}`}>
              {config.label}
            </span>
            <p className="text-[10px] text-gray-400">{config.description}</p>
          </div>
        </div>
        <div className={`text-lg font-bold font-mono ${config.text}`}>
          {score}/5
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5">
        {checkItems.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            {item.checked ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-gray-600" />
            )}
            <item.icon className={`w-3 h-3 ${item.checked ? 'text-gray-300' : 'text-gray-600'}`} />
            <span className={`text-xs ${item.checked ? 'text-gray-300' : 'text-gray-500'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Local Signal Indicator Component
// ===========================================

interface LocalSignalProps {
  metadata: MetadataQualityData | undefined;
  onboarding?: OnboardingContext;
}

export function LocalSignalIndicator({ metadata, onboarding }: LocalSignalProps) {
  const signals = useMemo(() => {
    const items: Array<{ label: string; value: string; present: boolean }> = [];

    // City
    items.push({
      label: 'City',
      value: metadata?.location?.city || 'Not set',
      present: !!metadata?.location?.city,
    });

    // Region/State
    items.push({
      label: 'Region',
      value: metadata?.location?.stateProvince || 'Not set',
      present: !!metadata?.location?.stateProvince,
    });

    // Country
    items.push({
      label: 'Country',
      value: metadata?.location?.country || 'Not set',
      present: !!metadata?.location?.country,
    });

    // Entity/Business
    const entityName = onboarding?.brandName || metadata?.attribution?.creator;
    items.push({
      label: 'Entity',
      value: entityName || 'Not set',
      present: !!entityName,
    });

    return items;
  }, [metadata, onboarding]);

  const presentCount = signals.filter(s => s.present).length;
  const allPresent = presentCount === signals.length;
  const somePresent = presentCount > 0;

  return (
    <div className={`p-2.5 rounded border ${
      allPresent 
        ? 'bg-green-900/20 border-green-700/40' 
        : somePresent
        ? 'bg-amber-900/20 border-amber-700/40'
        : 'bg-gray-800 border-gray-700'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Globe className={`w-4 h-4 ${allPresent ? 'text-green-400' : somePresent ? 'text-amber-400' : 'text-gray-500'}`} />
        <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">
          Local SEO Signals
        </span>
        <span className="text-[10px] font-mono text-gray-500">
          {presentCount}/{signals.length}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {signals.map((signal) => (
          <div key={signal.label} className="flex items-center gap-1.5">
            {signal.present ? (
              <CheckCircle2 className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-gray-600" />
            )}
            <span className={`text-[10px] ${signal.present ? 'text-gray-300' : 'text-gray-600'}`}>
              {signal.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Outcome Statements Component
// ===========================================

interface OutcomeStatementsProps {
  metadata: MetadataQualityData | undefined;
  onboarding?: OnboardingContext;
}

export function OutcomeStatements({ metadata, onboarding }: OutcomeStatementsProps) {
  const { strength, checklist } = useMemo(
    () => calculateMetadataStrength(metadata, onboarding),
    [metadata, onboarding]
  );

  const outcomes = useMemo(() => {
    const items: Array<{ text: string; achieved: boolean; icon: React.ElementType }> = [];

    // Provenance
    items.push({
      text: checklist.provenance 
        ? 'This image carries full provenance' 
        : 'Missing provenance information',
      achieved: checklist.provenance,
      icon: User,
    });

    // AI-search ready
    items.push({
      text: checklist.contextual 
        ? 'This image is AI-search ready' 
        : 'Needs richer description for AI discovery',
      achieved: checklist.contextual,
      icon: Sparkles,
    });

    // EEAT
    items.push({
      text: checklist.eeat 
        ? 'Meets EEAT trust criteria' 
        : 'Add expertise signals for EEAT',
      achieved: checklist.eeat,
      icon: Award,
    });

    // Rights
    items.push({
      text: checklist.rights 
        ? 'Rights and usage fully documented' 
        : 'Rights information incomplete',
      achieved: checklist.rights,
      icon: Shield,
    });

    // Local
    items.push({
      text: checklist.local 
        ? 'Local entity signals embedded' 
        : 'No local signals detected',
      achieved: checklist.local,
      icon: MapPin,
    });

    return items;
  }, [checklist]);

  // Show only achieved outcomes, or a summary message
  const achievedOutcomes = outcomes.filter(o => o.achieved);

  if (achievedOutcomes.length === 0) {
    return (
      <div className="p-3 bg-gray-800 border border-gray-700 rounded text-center">
        <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
        <p className="text-xs text-gray-400">
          Process this image to generate professional metadata
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {achievedOutcomes.slice(0, 3).map((outcome, idx) => (
        <div 
          key={idx} 
          className="flex items-center gap-2 p-2 bg-gradient-to-r from-green-900/20 to-transparent 
            border-l-2 border-green-500 rounded-r"
        >
          <outcome.icon className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-green-300">{outcome.text}</span>
        </div>
      ))}
      {achievedOutcomes.length > 3 && (
        <p className="text-[10px] text-gray-500 pl-2">
          +{achievedOutcomes.length - 3} more achievements
        </p>
      )}
    </div>
  );
}

// ===========================================
// Provenance Attribution Preview
// ===========================================

interface ProvenancePreviewProps {
  metadata: MetadataQualityData | undefined;
  onboarding?: OnboardingContext;
}

export function ProvenancePreview({ metadata, onboarding }: ProvenancePreviewProps) {
  const preview = useMemo(() => {
    const creator = metadata?.attribution?.creator 
      || metadata?.attribution?.source
      || onboarding?.creatorName 
      || onboarding?.brandName
      || 'Unknown Creator';
    const niche = onboarding?.niche || onboarding?.industry || '';
    const location = [
      metadata?.location?.city,
      metadata?.location?.country,
    ].filter(Boolean).join(', ');
    const website = onboarding?.website || '';
    const rights = metadata?.attribution?.rightsUsageTerms || 'All rights reserved';

    return { creator, niche, location, website, rights };
  }, [metadata, onboarding]);

  const hasData = preview.creator !== 'Unknown Creator' || preview.location || preview.website;

  if (!hasData) {
    return (
      <div className="p-3 bg-gray-800 border border-gray-700 rounded">
        <p className="text-xs text-gray-500 italic">
          Complete onboarding to preview attribution
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
        Public Attribution Preview
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-200">
          © {preview.creator}
          {preview.niche && (
            <span className="text-gray-400"> · {preview.niche}</span>
          )}
          {preview.location && (
            <span className="text-gray-400"> · {preview.location}</span>
          )}
        </p>
        <p className="text-xs text-gray-400">
          {preview.rights}
          {preview.website && (
            <span> · <span className="text-cyan-400">{preview.website}</span></span>
          )}
        </p>
      </div>
    </div>
  );
}

// ===========================================
// Explain Why Panel
// ===========================================

interface ExplainWhyProps {
  visionApplied: boolean;
  situationalApplied: boolean;
  userContextApplied: boolean;
  onboardingApplied: boolean;
  expanded?: boolean;
}

export function ExplainWhy({ 
  visionApplied, 
  situationalApplied, 
  userContextApplied, 
  onboardingApplied,
  expanded = false,
}: ExplainWhyProps) {
  const contexts = [
    { 
      label: 'Vision Analysis', 
      applied: visionApplied, 
      icon: Eye,
      description: 'AI analyzed image content, subjects, and scene',
    },
    { 
      label: 'Situational Context', 
      applied: situationalApplied, 
      icon: Zap,
      description: 'Event type and purpose informed metadata',
    },
    { 
      label: 'User Context', 
      applied: userContextApplied, 
      icon: User,
      description: 'Your specific notes were incorporated',
    },
    { 
      label: 'Profile Context', 
      applied: onboardingApplied, 
      icon: Building2,
      description: 'Brand and business information applied',
    },
  ];

  const appliedCount = contexts.filter(c => c.applied).length;

  return (
    <div className="p-2.5 bg-purple-900/20 border border-purple-700/40 rounded">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-medium text-purple-300 uppercase tracking-wider">
          Context Applied
        </span>
        <span className="text-[10px] font-mono text-purple-400/60">
          {appliedCount}/{contexts.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {contexts.map((ctx) => (
          <div key={ctx.label} className="flex items-start gap-2">
            {ctx.applied ? (
              <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5" />
            ) : (
              <XCircle className="w-3 h-3 text-gray-600 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <ctx.icon className={`w-3 h-3 ${ctx.applied ? 'text-purple-300' : 'text-gray-600'}`} />
                <span className={`text-xs ${ctx.applied ? 'text-gray-300' : 'text-gray-600'}`}>
                  {ctx.label}
                </span>
              </div>
              {expanded && ctx.applied && (
                <p className="text-[10px] text-gray-500 mt-0.5 pl-4">
                  {ctx.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetadataStrengthIndicator;
