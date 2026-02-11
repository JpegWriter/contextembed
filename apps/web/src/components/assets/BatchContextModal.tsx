'use client';

import { useState } from 'react';
import { X, MessageSquarePlus, Loader2, Lock, ChevronDown } from 'lucide-react';

// Situational context types that can be locked at batch level
export type SituationalContext = 
  | 'auto'           // Let AI determine
  | 'wedding'        // Wedding/ceremony
  | 'portrait'       // Portrait/headshot
  | 'editorial'      // Editorial/commercial
  | 'product'        // Product photography
  | 'event'          // Corporate/social event
  | 'real-estate'    // Property/architecture
  | 'lifestyle'      // Lifestyle/brand
  | 'personal'       // Personal portfolio
  | 'food'           // Food/culinary
  | 'nature'         // Nature/landscape
  | 'sports';        // Sports/action

export interface BatchContextData {
  context: string;
  situationalLock: SituationalContext;
}

interface BatchContextModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onApply: (data: BatchContextData) => Promise<void>;
}

const SITUATIONAL_OPTIONS: Array<{ value: SituationalContext; label: string; description: string }> = [
  { value: 'auto', label: 'Auto-Detect', description: 'Let AI determine context' },
  { value: 'wedding', label: 'Wedding', description: 'Ceremony, reception, preparation' },
  { value: 'portrait', label: 'Portrait', description: 'Headshots, personal branding' },
  { value: 'editorial', label: 'Editorial', description: 'Commercial, advertising' },
  { value: 'product', label: 'Product', description: 'Product photography' },
  { value: 'event', label: 'Event', description: 'Corporate, social gatherings' },
  { value: 'real-estate', label: 'Real Estate', description: 'Property, architecture' },
  { value: 'lifestyle', label: 'Lifestyle', description: 'Brand, aspirational' },
  { value: 'personal', label: 'Personal', description: 'Portfolio, artistic' },
  { value: 'food', label: 'Food', description: 'Culinary, restaurant' },
  { value: 'nature', label: 'Nature', description: 'Landscape, wildlife' },
  { value: 'sports', label: 'Sports', description: 'Action, athletics' },
];

const TEMPLATES = [
  { label: 'Wedding', template: 'Wedding at {venue}, {date}', situational: 'wedding' as SituationalContext },
  { label: 'Portrait Session', template: 'Portrait session with {client}, {location}', situational: 'portrait' as SituationalContext },
  { label: 'Corporate Event', template: 'Corporate event for {company}, {venue}', situational: 'event' as SituationalContext },
  { label: 'Product Shoot', template: 'Product photography for {brand}, {product line}', situational: 'product' as SituationalContext },
  { label: 'Family Session', template: 'Family portrait session, {location}', situational: 'portrait' as SituationalContext },
  { label: 'Real Estate', template: 'Property at {address}, {city}', situational: 'real-estate' as SituationalContext },
];

export function BatchContextModal({ 
  isOpen, 
  selectedCount, 
  onClose, 
  onApply 
}: BatchContextModalProps) {
  const [context, setContext] = useState('');
  const [situationalLock, setSituationalLock] = useState<SituationalContext>('auto');
  const [applying, setApplying] = useState(false);
  const [showSituationalDropdown, setShowSituationalDropdown] = useState(false);

  if (!isOpen) return null;

  const handleApply = async () => {
    if (!context.trim() && situationalLock === 'auto') return;
    setApplying(true);
    try {
      await onApply({ context, situationalLock });
      setContext('');
      setSituationalLock('auto');
      onClose();
    } finally {
      setApplying(false);
    }
  };

  const applyTemplate = (template: string, situational: SituationalContext) => {
    setContext(template);
    if (situational !== 'auto') {
      setSituationalLock(situational);
    }
  };

  const selectedOption = SITUATIONAL_OPTIONS.find(o => o.value === situationalLock);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-none shadow-2xl 
        w-full max-w-lg mx-4 overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b 
          border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/30 rounded-none">
              <MessageSquarePlus className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Add Context to Selection</h2>
              <p className="text-sm text-gray-400">
                Apply to {selectedCount} selected {selectedCount === 1 ? 'image' : 'images'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-none text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Situational Context Lock */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Situational Context Lock
            </label>
            <p className="text-[10px] text-gray-400 mt-0.5 mb-2">
              Lock the context type for this batch. Overrides AI inference.
            </p>
            <div className="relative">
              <button
                onClick={() => setShowSituationalDropdown(!showSituationalDropdown)}
                className={`w-full flex items-center justify-between px-3 py-2.5 
                  rounded-none border text-left transition-colors
                  ${situationalLock !== 'auto' 
                    ? 'bg-brand-900/20 border-brand-700/50 text-brand-300' 
                    : 'bg-gray-800 border-gray-600 text-gray-300'
                  }`}
              >
                <div className="flex items-center gap-2">
                  {situationalLock !== 'auto' && (
                    <Lock className="w-4 h-4 text-brand-400" />
                  )}
                  <div>
                    <span className="text-sm font-medium">{selectedOption?.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {selectedOption?.description}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSituationalDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showSituationalDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 
                  border border-gray-600 rounded-none shadow-lg z-10 
                  max-h-64 overflow-y-auto">
                  {SITUATIONAL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSituationalLock(option.value);
                        setShowSituationalDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left 
                        hover:bg-gray-700 transition-colors
                        ${situationalLock === option.value ? 'bg-brand-900/20' : ''}`}
                    >
                      <div className="flex-1">
                        <span className={`text-sm font-medium text-gray-200 ${
                          situationalLock === option.value ? 'text-brand-400' : ''
                        }`}>
                          {option.label}
                        </span>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                      {situationalLock === option.value && (
                        <Lock className="w-4 h-4 text-brand-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Templates */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Quick Templates
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => applyTemplate(t.template, t.situational)}
                  className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300
                    rounded-full hover:bg-gray-700 hover:text-white
                    transition-colors border border-gray-700"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Context Input */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Context Description
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe the context for these images...

Example: Wedding reception at The Grand Hotel Brighton, June 15th 2025. Bride: Sarah, Groom: James. Guests enjoying dinner and dancing."
              className="w-full mt-2 px-4 py-3 border border-gray-600 
                rounded-none text-sm bg-gray-800 text-white resize-none
                focus:ring-2 focus:ring-brand-500 focus:border-transparent
                placeholder:text-gray-500"
              rows={5}
            />
            <p className="mt-1 text-xs text-gray-400">
              This context will be used by the AI to generate more accurate metadata.
              Include names only if you want them in the metadata.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 bg-gray-800/50 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-600 text-gray-300
              rounded-none font-medium hover:bg-gray-700 hover:text-white
              transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={(!context.trim() && situationalLock === 'auto') || applying}
            className="flex-1 py-2.5 bg-gradient-to-r from-brand-600 to-teal-600 text-white rounded-none font-medium
              hover:from-brand-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-900/30"
          >
            {applying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                {situationalLock !== 'auto' && <Lock className="w-4 h-4" />}
                <MessageSquarePlus className="w-4 h-4" />
                Apply Context
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
