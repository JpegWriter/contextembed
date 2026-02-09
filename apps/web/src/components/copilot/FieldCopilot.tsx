'use client';

import { useState, useEffect } from 'react';
import { useCopilot } from './CopilotWrapper';
import { copilotApi } from '@/lib/api';
import { 
  Sparkles, 
  Check, 
  AlertCircle, 
  Loader2,
  ChevronDown,
  Lightbulb,
  Zap,
} from 'lucide-react';

export interface FieldDefinition {
  id: string;
  label: string;
  description: string;
  type: 'text' | 'textarea' | 'select' | 'multi-select' | 'number';
  copilotHints: {
    whatToWrite: string;
    examples: string[];
    commonMistakes: string[];
  };
}

interface CopilotAnalysis {
  status: 'complete' | 'incomplete' | 'error';
  confidence: number;
  suggestion?: string;
  rationale?: string;
  issues?: string[];
  followUp?: {
    question: string;
    options?: string[];
  };
}

// URL audit result with extracted business info
interface UrlAuditResult {
  success: boolean;
  businessName?: string;
  tagline?: string;
  industry?: string;
  services?: string[];
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  keywords?: string[];
  toneHints?: string[];
  awards?: string[];
  credentials?: string[];
  // Intelligent field suggestions from crawl analysis
  fieldSuggestions?: {
    industry?: string;
    niche?: string;
    nicheOptions?: string[];
    services?: string;
    serviceOptions?: string[];
    specializations?: string;
    specializationOptions?: string[];
    targetAudience?: string;
    targetAudienceOptions?: string[];
    brandVoice?: string;
    brandVoiceOptions?: string[];
    keyDifferentiator?: string;
    keyDifferentiatorOptions?: string[];
    awards?: string;
    awardsOptions?: string[];
    credentials?: string;
    credentialsOptions?: string[];
    defaultEventType?: string;
    defaultEventTypeOptions?: string[];
  };
}

interface FieldCopilotProps {
  fieldDefinitions: Record<string, FieldDefinition>;
  onApplySuggestion: (fieldId: string, value: string) => void;
  apiToken?: string;
  urlAudit?: UrlAuditResult | null;  // Add URL audit data
}

export function FieldCopilot({ fieldDefinitions, onApplySuggestion, apiToken, urlAudit }: FieldCopilotProps) {
  const { activeField, formContext, businessContext, isEnabled } = useCopilot();
  const [analysis, setAnalysis] = useState<CopilotAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);

  const currentField = activeField 
    ? fieldDefinitions[activeField.fieldId] 
    : null;

  const currentValue = activeField 
    ? formContext[activeField.fieldId] || '' 
    : '';

  // Get dynamic suggestions based on URL audit data
  const getAuditSuggestions = (): { fieldSuggestion?: string; relatedExamples: string[] } => {
    if (!urlAudit?.success || !activeField) {
      return { relatedExamples: [] };
    }

    const fieldId = activeField.fieldId;
    const fs = urlAudit.fieldSuggestions; // Intelligent suggestions from backend
    let fieldSuggestion: string | undefined;
    let relatedExamples: string[] = [];

    // Map audit data to field suggestions - using intelligent suggestions
    switch (fieldId) {
      case 'businessName':
      case 'brandName':
        fieldSuggestion = urlAudit.businessName;
        break;
        
      case 'tagline':
        fieldSuggestion = urlAudit.tagline;
        break;
        
      case 'industry':
        fieldSuggestion = fs?.industry || urlAudit.industry;
        if (fs?.nicheOptions) {
          relatedExamples = fs.nicheOptions.map(n => {
            if (n.toLowerCase().includes('family') || n.toLowerCase().includes('baby')) {
              return 'Family & Baby Photography';
            }
            if (n.toLowerCase().includes('wedding')) return 'Wedding Photography';
            if (n.toLowerCase().includes('portrait')) return 'Portrait Photography';
            if (n.toLowerCase().includes('business')) return 'Commercial Photography';
            return n;
          });
          relatedExamples = [...new Set(relatedExamples)];
        }
        break;
        
      case 'niche':
        fieldSuggestion = fs?.niche;
        relatedExamples = fs?.nicheOptions || [];
        break;
        
      case 'services':
        fieldSuggestion = fs?.services;
        relatedExamples = fs?.serviceOptions || [];
        break;
        
      case 'specializations':
        fieldSuggestion = fs?.specializations;
        relatedExamples = fs?.specializationOptions || [];
        break;
        
      case 'keyDifferentiator':
        fieldSuggestion = fs?.keyDifferentiator;
        relatedExamples = fs?.keyDifferentiatorOptions || [];
        break;
        
      case 'targetAudience':
        fieldSuggestion = fs?.targetAudience;
        relatedExamples = fs?.targetAudienceOptions || [];
        break;
        
      case 'brandVoice':
        fieldSuggestion = fs?.brandVoice;
        relatedExamples = fs?.brandVoiceOptions || [];
        if (!fieldSuggestion && urlAudit.toneHints?.length) {
          fieldSuggestion = urlAudit.toneHints.join(', ');
          relatedExamples = urlAudit.toneHints.slice(0, 3);
        }
        break;
        
      case 'awards':
      case 'awardsRecognition':
        fieldSuggestion = fs?.awards;
        relatedExamples = fs?.awardsOptions || urlAudit.awards || [];
        break;
        
      case 'credentials':
        fieldSuggestion = fs?.credentials;
        relatedExamples = fs?.credentialsOptions || urlAudit.credentials || [];
        break;
        
      case 'defaultEventType':
        fieldSuggestion = fs?.defaultEventType;
        relatedExamples = fs?.defaultEventTypeOptions || [];
        break;
        
      case 'city':
        fieldSuggestion = urlAudit.location?.city;
        break;
        
      case 'state':
        fieldSuggestion = urlAudit.location?.state;
        break;
        
      case 'country':
        fieldSuggestion = urlAudit.location?.country;
        break;
      
      // Rights & Attribution fields - based on IPTC best practices
      case 'creatorName':
        // Use business name as creator/photographer name
        fieldSuggestion = urlAudit.businessName;
        if (urlAudit.businessName) {
          relatedExamples = [
            urlAudit.businessName,
            // Suggest variations based on business name
            urlAudit.businessName.replace(/\s*(Photography|Studio|Photo|Fotografie|Fotografen?)$/i, '').trim(),
          ].filter((v, i, a) => v && a.indexOf(v) === i);
        }
        break;
        
      case 'copyrightTemplate':
        // Generate IPTC-compliant copyright templates based on business name
        if (urlAudit.businessName) {
          const name = urlAudit.businessName;
          const currentYear = new Date().getFullYear();
          fieldSuggestion = `© {year} ${name}. All Rights Reserved.`;
          relatedExamples = [
            `© {year} ${name}. All Rights Reserved.`,
            `© {year} ${name}`,
            `Copyright {year} ${name}. Unauthorized use prohibited.`,
            `© ${currentYear} ${name}. All Rights Reserved.`,
          ];
        }
        break;
        
      case 'creditTemplate':
        // Generate photo credit suggestions based on business name
        if (urlAudit.businessName) {
          const name = urlAudit.businessName;
          fieldSuggestion = `Photo by ${name}`;
          relatedExamples = [
            `Photo by ${name}`,
            `Photo: ${name}`,
            `Image by ${name}`,
            `© ${name}`,
          ];
        }
        break;
        
      case 'usageTerms':
        // IPTC best practice usage terms suggestions
        relatedExamples = [
          'Personal use only. Commercial licensing available upon request.',
          'Licensed for client use only. All other rights reserved.',
          'All rights reserved. Contact for licensing inquiries.',
          'Editorial use permitted with credit. Commercial use requires license.',
          'No reproduction without written permission.',
        ];
        break;
    }

    return { fieldSuggestion, relatedExamples };
  };

  const auditSuggestions = getAuditSuggestions();

  // Analyze field when focus changes or value updates
  useEffect(() => {
    if (!activeField || !currentField || !isEnabled) {
      setAnalysis(null);
      return;
    }

    const analyze = async () => {
      // Skip analysis for very short or empty values
      if (!currentValue || currentValue.length < 3) {
        setAnalysis(null);
        return;
      }

      // Skip if no API token
      if (!apiToken) {
        return;
      }

      setIsAnalyzing(true);
      try {
        const data = await copilotApi.analyze(apiToken, {
          fieldId: activeField.fieldId,
          fieldDefinition: currentField,
          currentValue,
          formContext,
          ...(businessContext && { businessContext: { ...businessContext } }),
        });
        setAnalysis(data);
      } catch (error) {
        console.error('Copilot analysis failed:', error);
        setAnalysis(null);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Debounce analysis - wait 800ms after typing stops
    const timer = setTimeout(analyze, 800);
    return () => clearTimeout(timer);
  }, [activeField?.fieldId, currentValue, isEnabled]);

  if (!isEnabled) {
    return null;
  }

  // No field selected
  if (!activeField || !currentField) {
    return (
      <div className="p-4 bg-gray-900/50 border border-gray-800 rounded">
        <div className="text-center text-gray-500 py-6">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50 text-cyan-500/50" />
          <p className="text-xs uppercase tracking-wider">AI Copilot</p>
          <p className="text-[10px] mt-1 text-gray-600">Click a field to get suggestions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-3 border-b border-gray-800 bg-gray-900/80">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <h3 className="font-medium text-white text-sm truncate">{currentField.label}</h3>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{currentField.description}</p>
        </div>
        {isAnalyzing ? (
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0 ml-2" />
        ) : analysis ? (
          <StatusBadge status={analysis.status} />
        ) : null}
      </div>

      <div className="p-3 space-y-3">
        {/* What to Write Hint */}
        <div className="bg-cyan-950/30 border border-cyan-900/50 rounded p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] font-medium text-cyan-400 uppercase tracking-wider">What to write</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{currentField.copilotHints.whatToWrite}</p>
        </div>

        {/* Detected from Website - show first if available */}
        {auditSuggestions.fieldSuggestion && (
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Detected from your website</span>
            </div>
            <button
              onClick={() => onApplySuggestion(activeField.fieldId, auditSuggestions.fieldSuggestion!)}
              className="block w-full text-left text-sm p-2 rounded bg-emerald-900/30 hover:bg-emerald-900/50 
                border border-emerald-700/50 hover:border-emerald-500/50 transition-colors text-emerald-100 
                hover:text-white group font-medium"
            >
              <span>"{auditSuggestions.fieldSuggestion}"</span>
              <Check className="w-3 h-3 inline ml-2 opacity-0 group-hover:opacity-100 text-emerald-400" />
            </button>
          </div>
        )}

        {/* Related suggestions from audit */}
        {auditSuggestions.relatedExamples.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider mb-1.5">
              Based on your website
            </p>
            <div className="space-y-1">
              {auditSuggestions.relatedExamples.slice(0, 4).map((example, i) => (
                <button
                  key={i}
                  onClick={() => onApplySuggestion(activeField.fieldId, example)}
                  className="block w-full text-left text-xs p-2 rounded bg-emerald-900/20 hover:bg-emerald-900/40 
                    border border-emerald-700/30 hover:border-emerald-600/50 transition-colors text-emerald-200 
                    hover:text-white group"
                >
                  <span className="opacity-80 group-hover:opacity-100">"{example}"</span>
                  <Zap className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Examples - only show if we don't have audit suggestions */}
        {currentField.copilotHints.examples.length > 0 && 
         !auditSuggestions.fieldSuggestion && 
         auditSuggestions.relatedExamples.length === 0 && (
          <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Examples</p>
            <div className="space-y-1">
              {currentField.copilotHints.examples.slice(0, 3).map((example, i) => (
                <button
                  key={i}
                  onClick={() => onApplySuggestion(activeField.fieldId, example)}
                  className="block w-full text-left text-xs p-2 rounded bg-gray-800/50 hover:bg-gray-800 
                    border border-gray-700/50 hover:border-cyan-700/50 transition-colors text-gray-300 
                    hover:text-white group"
                >
                  <span className="opacity-70 group-hover:opacity-100">"{example}"</span>
                  <Zap className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 text-cyan-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggestion */}
        {analysis?.suggestion && analysis.suggestion !== currentValue && (
          <div className="border-t border-gray-800 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-medium text-cyan-400 uppercase tracking-wider">AI Suggestion</span>
            </div>
            <div className="bg-cyan-950/20 border border-cyan-900/30 rounded p-2.5 mb-2">
              <p className="text-xs text-gray-200 leading-relaxed">{analysis.suggestion}</p>
            </div>
            {analysis.rationale && (
              <p className="text-[10px] text-gray-500 mb-2 italic">{analysis.rationale}</p>
            )}
            <button
              onClick={() => onApplySuggestion(activeField.fieldId, analysis.suggestion!)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 
                text-white text-xs font-medium rounded transition-colors"
            >
              <Check className="w-3 h-3" />
              Apply suggestion
            </button>
          </div>
        )}

        {/* Issues */}
        {analysis?.issues && analysis.issues.length > 0 && (
          <div className="border-t border-gray-800 pt-3">
            <p className="text-[10px] font-medium text-amber-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Suggestions
            </p>
            <ul className="text-xs text-gray-400 space-y-1">
              {analysis.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-500/70 mt-0.5">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up Question */}
        {analysis?.followUp && (
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs font-medium text-gray-300 mb-2">
              {analysis.followUp.question}
            </p>
            {analysis.followUp.options && (
              <div className="flex flex-wrap gap-1.5">
                {analysis.followUp.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => onApplySuggestion(activeField.fieldId, option)}
                    className="px-2 py-1 text-[10px] bg-gray-800 hover:bg-gray-700 
                      border border-gray-700 hover:border-cyan-700 rounded text-gray-300 
                      hover:text-white transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Common Mistakes */}
        {currentField.copilotHints.commonMistakes.length > 0 && (
          <div className="border-t border-gray-800 pt-3">
            <button
              onClick={() => setShowMistakes(!showMistakes)}
              className="flex items-center justify-between w-full text-[10px] text-gray-500 
                hover:text-gray-400 transition-colors"
            >
              <span className="uppercase tracking-wider">Common mistakes to avoid</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showMistakes ? 'rotate-180' : ''}`} />
            </button>
            {showMistakes && (
              <ul className="mt-2 space-y-1 text-[10px] text-gray-500">
                {currentField.copilotHints.commonMistakes.map((mistake, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-red-500/50">✕</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'complete' | 'incomplete' | 'error' }) {
  const config = {
    complete: { 
      label: 'Good', 
      className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50',
      icon: Check,
    },
    incomplete: { 
      label: 'Needs work', 
      className: 'bg-amber-900/50 text-amber-400 border-amber-700/50',
      icon: AlertCircle,
    },
    error: { 
      label: 'Error', 
      className: 'bg-red-900/50 text-red-400 border-red-700/50',
      icon: AlertCircle,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${className}`}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
