'use client';

import { useState } from 'react';
import { X, Folder, MapPin, Calendar, FileText, Loader2, Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewProjectData) => Promise<void>;
}

export interface NewProjectData {
  name: string;
  description: string;
  eventLocation: string;
  eventDate: string;
  galleryContext: string;
  contextScope: string;
  primaryContext: string;
}

// Context scope definitions with industry-agnostic terminology
const CONTEXT_SCOPES = [
  { 
    id: 'editorial', 
    label: 'Editorial', 
    icon: '📰',
    hint: 'News, stories, publishing',
    showLocationDate: true,
  },
  { 
    id: 'commercial', 
    label: 'Commercial', 
    icon: '💼',
    hint: 'Commissioned client work',
    showLocationDate: false,
  },
  { 
    id: 'product', 
    label: 'Product', 
    icon: '📦',
    hint: 'Catalog, e-commerce, specs',
    showLocationDate: false,
  },
  { 
    id: 'event', 
    label: 'Event', 
    icon: '🎪',
    hint: 'Conferences, gatherings, ceremonies',
    showLocationDate: true,
  },
  { 
    id: 'documentation', 
    label: 'Documentation', 
    icon: '📋',
    hint: 'Before/after, inspections, records',
    showLocationDate: true,
  },
  { 
    id: 'research', 
    label: 'Research', 
    icon: '🔬',
    hint: 'Studies, surveys, analysis',
    showLocationDate: true,
  },
  { 
    id: 'legal_evidence', 
    label: 'Legal / Evidence', 
    icon: '⚖️',
    hint: 'Chain-of-custody, disputes',
    showLocationDate: true,
  },
  { 
    id: 'marketing', 
    label: 'Marketing Campaign', 
    icon: '📣',
    hint: 'Campaigns, promotions, ads',
    showLocationDate: false,
  },
  { 
    id: 'social', 
    label: 'Social Content', 
    icon: '📱',
    hint: 'Posts, stories, reels',
    showLocationDate: false,
  },
  { 
    id: 'personal_archive', 
    label: 'Personal Archive', 
    icon: '📚',
    hint: 'Family, memories, records',
    showLocationDate: false,
  },
  { 
    id: 'custom', 
    label: 'Custom', 
    icon: '✨',
    hint: 'Define your own scope',
    showLocationDate: false,
  },
];

// Legacy mapping from old photographer-centric types
const LEGACY_TYPE_MAP: Record<string, string> = {
  'wedding': 'event',
  'portrait': 'documentation',
  'portrait_session': 'documentation',
  'corporate': 'event',
  'corporate_event': 'event',
  'product': 'product',
  'product_shoot': 'product',
  'real-estate': 'documentation',
  'real_estate': 'documentation',
  'custom': 'custom',
  'custom_project': 'custom',
};

export function mapLegacyTypeToScope(legacyType: string): string {
  const normalized = legacyType.toLowerCase().replace(/\s+/g, '_');
  return LEGACY_TYPE_MAP[normalized] || 'custom';
}

export function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState<string | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewProjectData>({
    name: '',
    description: '',
    eventLocation: '',
    eventDate: new Date().toISOString().split('T')[0],
    galleryContext: '',
    contextScope: '',
    primaryContext: '',
  });

  if (!isOpen) return null;

  const handleScopeSelect = (scopeId: string) => {
    setSelectedScope(scopeId);
    setFormData(prev => ({
      ...prev,
      contextScope: scopeId,
    }));
    setValidationError(null);
  };

  // Determine if location/date should be shown
  const selectedScopeData = CONTEXT_SCOPES.find(s => s.id === selectedScope);
  const showLocationDate = selectedScopeData?.showLocationDate || showOptionalFields;

  const validateForm = (): boolean => {
    if (!selectedScope) {
      setValidationError('Please select a context scope');
      return false;
    }
    if (!formData.name.trim()) {
      setValidationError('Please enter an asset collection name');
      return false;
    }
    if (!formData.primaryContext.trim()) {
      setValidationError('Please describe the primary context');
      return false;
    }
    if (formData.primaryContext.trim().length < 20) {
      setValidationError('Primary context must be at least 20 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        name: '',
        description: '',
        eventLocation: '',
        eventDate: new Date().toISOString().split('T')[0],
        galleryContext: '',
        contextScope: '',
        primaryContext: '',
      });
      setSelectedScope(null);
      setShowOptionalFields(false);
      setValidationError(null);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-black border border-steel-700/50 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-900/30 border border-brand-700/50 flex items-center justify-center">
              <Folder className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Create New Project</h2>
              <p className="text-xs text-steel-500 font-mono">Define the context for this asset collection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-steel-500 hover:text-white hover:bg-steel-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/50 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {validationError}
            </div>
          )}

          {/* Context Scope Tiles */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-3">
              Context Scope *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CONTEXT_SCOPES.map(scope => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => handleScopeSelect(scope.id)}
                  className={`p-3 border text-left transition-all ${
                    selectedScope === scope.id
                      ? 'bg-brand-900/20 border-brand-500'
                      : 'bg-steel-900/50 border-steel-700/50 hover:border-steel-500'
                  }`}
                >
                  <span className="text-lg mb-1 block">{scope.icon}</span>
                  <span className={`text-xs font-medium block ${
                    selectedScope === scope.id ? 'text-white' : 'text-steel-400'
                  }`}>
                    {scope.label}
                  </span>
                  <span className="text-[10px] text-steel-500 block mt-0.5 line-clamp-1">
                    {scope.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Asset Collection Name */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
              <Folder className="w-3.5 h-3.5 inline mr-1.5" />
              Asset Collection Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
                setValidationError(null);
              }}
              placeholder="e.g., Q1 Product Launch — Vienna, Site Inspection — Malta Coastline"
              className="w-full px-4 py-3 bg-steel-900 border border-steel-700/50 text-white 
                placeholder-steel-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 
                transition-all text-sm"
              required
            />
            <p className="text-[10px] text-steel-600 mt-1 font-mono">
              Examples: "Client Case File — Evidence Set A", "Family Archive — 2026"
            </p>
          </div>

          {/* Primary Context (REQUIRED) */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
              Primary Context *
            </label>
            <textarea
              value={formData.primaryContext}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, primaryContext: e.target.value }));
                setValidationError(null);
              }}
              placeholder="In one sentence: what do these assets document, and why do they exist?"
              rows={2}
              className="w-full px-4 py-3 bg-steel-900 border border-steel-700/50 text-white 
                placeholder-steel-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 
                transition-all text-sm resize-none"
              required
            />
            <p className="text-[10px] text-steel-600 mt-1 font-mono">
              This context applies to all assets and guides AI metadata generation.
            </p>
          </div>

          {/* Conditional Location/Date */}
          {showLocationDate && (
            <>
              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
                  <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={formData.eventLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, eventLocation: e.target.value }))}
                  placeholder="e.g., Conference Center, Building Site, Studio A"
                  className="w-full px-4 py-3 bg-steel-900 border border-steel-700/50 text-white 
                    placeholder-steel-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 
                    transition-all text-sm"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
                  <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                  Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
                  className="w-full px-4 py-3 bg-steel-900 border border-steel-700/50 text-white 
                    focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm"
                />
              </div>
            </>
          )}

          {/* Toggle for optional fields when not auto-shown */}
          {!selectedScopeData?.showLocationDate && (
            <button
              type="button"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="flex items-center gap-2 text-xs text-steel-500 hover:text-steel-300 transition-colors"
            >
              {showOptionalFields ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {showOptionalFields ? 'Hide optional details' : 'Add optional details (location, date)'}
            </button>
          )}

          {/* Collection-Wide Context (gallery context - optional) */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5 inline mr-1.5" />
              Additional Context (Optional)
            </label>
            <textarea
              value={formData.galleryContext}
              onChange={(e) => setFormData(prev => ({ ...prev, galleryContext: e.target.value }))}
              placeholder="Any additional details that apply to all assets in this collection..."
              rows={2}
              className="w-full px-4 py-3 bg-steel-900 border border-steel-700/50 text-white 
                placeholder-steel-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 
                transition-all text-sm resize-none"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5 inline mr-1.5" />
              Internal Notes (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Private notes for your reference..."
              rows={2}
              className="w-full px-4 py-3 bg-steel-900 border border-steel-700/50 text-white 
                placeholder-steel-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 
                transition-all text-sm resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-steel-700/50 bg-black/80">
          <p className="text-xs text-steel-500 font-mono">
            You can add per-asset context later in project settings
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 bg-steel-900 text-steel-300 text-sm font-bold uppercase tracking-wider
                hover:bg-steel-800 border border-steel-700/50 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.name.trim() || !selectedScope || !formData.primaryContext.trim()}
              className="px-6 py-2.5 bg-brand-600 border border-brand-500 text-white 
                text-sm font-bold uppercase tracking-wider hover:bg-brand-500 disabled:opacity-50 
                disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-glow-green"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Folder className="w-4 h-4" />
                  Create Project
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
