'use client';

import { useState } from 'react';
import { X, Folder, MapPin, Calendar, FileText, Loader2, Sparkles } from 'lucide-react';

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
}

const PROJECT_TEMPLATES = [
  { 
    id: 'wedding', 
    label: 'Wedding', 
    icon: '💒',
    defaults: { galleryContext: 'Wedding photography for client delivery and portfolio' }
  },
  { 
    id: 'portrait', 
    label: 'Portrait Session', 
    icon: '📷',
    defaults: { galleryContext: 'Professional portrait session for personal branding' }
  },
  { 
    id: 'corporate', 
    label: 'Corporate Event', 
    icon: '🏢',
    defaults: { galleryContext: 'Corporate event coverage for company marketing' }
  },
  { 
    id: 'product', 
    label: 'Product Shoot', 
    icon: '📦',
    defaults: { galleryContext: 'Product photography for e-commerce and marketing' }
  },
  { 
    id: 'real-estate', 
    label: 'Real Estate', 
    icon: '🏠',
    defaults: { galleryContext: 'Property photography for real estate listings' }
  },
  { 
    id: 'custom', 
    label: 'Custom Project', 
    icon: '✨',
    defaults: { galleryContext: '' }
  },
];

export function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewProjectData>({
    name: '',
    description: '',
    eventLocation: '',
    eventDate: new Date().toISOString().split('T')[0],
    galleryContext: '',
  });

  if (!isOpen) return null;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = PROJECT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        galleryContext: template.defaults.galleryContext,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

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
      });
      setSelectedTemplate(null);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-black border border-steel-700/50 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-900/30 border border-brand-700/50 flex items-center justify-center">
              <Folder className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Create New Project</h2>
              <p className="text-xs text-steel-500 font-mono">Set up your gallery or album</p>
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
          {/* Project Type Templates */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-3">
              Project Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PROJECT_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`p-3 border text-left transition-all ${
                    selectedTemplate === template.id
                      ? 'bg-brand-900/20 border-brand-500'
                      : 'bg-steel-900/50 border-steel-700/50 hover:border-steel-500'
                  }`}
                >
                  <span className="text-xl mb-1 block">{template.icon}</span>
                  <span className={`text-xs font-medium ${
                    selectedTemplate === template.id ? 'text-white' : 'text-steel-400'
                  }`}>
                    {template.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
              <Folder className="w-3.5 h-3.5 inline mr-1.5" />
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Smith-Jones Wedding, Q1 Product Shoot"
              className="w-full px-4 py-3 bg-steel-900 border border-steel-700/50 text-white 
                placeholder-steel-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 
                transition-all text-sm"
              required
            />
          </div>

          {/* Event Location */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
              <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
              Event Location
            </label>
            <input
              type="text"
              value={formData.eventLocation}
              onChange={(e) => setFormData(prev => ({ ...prev, eventLocation: e.target.value }))}
              placeholder="e.g., The Grand Hotel, Central Park, Studio A"
              className="w-full px-4 py-3 bg-steel-900 border border-steel-700/50 text-white 
                placeholder-steel-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 
                transition-all text-sm"
            />
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
              Event Date
            </label>
            <input
              type="date"
              value={formData.eventDate}
              onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
              className="w-full px-4 py-3 bg-steel-900 border border-steel-700/50 text-white 
                focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm"
            />
          </div>

          {/* Gallery-Wide Context */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
              Gallery-Wide Context
            </label>
            <textarea
              value={formData.galleryContext}
              onChange={(e) => setFormData(prev => ({ ...prev, galleryContext: e.target.value }))}
              placeholder="Describe the overall context for all images in this project. This will be applied to every image during AI metadata generation."
              rows={3}
              className="w-full px-4 py-3 bg-steel-900 border border-steel-700/50 text-white 
                placeholder-steel-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 
                transition-all text-sm resize-none"
            />
            <p className="text-[10px] text-steel-600 mt-1.5 font-mono">
              This context applies to all images. You can add per-image context later.
            </p>
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5 inline mr-1.5" />
              Notes (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Any additional notes for this project..."
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
            You can edit these settings later in project onboarding
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
              disabled={loading || !formData.name.trim()}
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
