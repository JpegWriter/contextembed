'use client';

import { useState, useEffect } from 'react';
import { 
  Save, 
  Loader2, 
  Building2, 
  MapPin, 
  Shield, 
  Globe,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi, onboardingApi } from '@/lib/api';
import { useSupabase } from '@/lib/supabase-provider';

interface ProfileData {
  confirmedContext: {
    brandName: string;
    tagline?: string;
    industry?: string;
    niche?: string;
    services?: string[];
    targetAudience?: string;
    brandVoice?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
      countryCode?: string;
      isStrict?: boolean;
    };
    additionalContext?: string;
  };
  rights: {
    creatorName: string;
    studioName?: string;
    copyrightTemplate: string;
    creditTemplate: string;
    usageTermsTemplate?: string;
    website?: string;
    email?: string;
  };
  outputPreferences: {
    primaryLanguage: string;
    keywordStyle: 'short' | 'long' | 'mixed';
    maxKeywords: number;
    locationBehavior: 'strict' | 'infer' | 'none';
  };
  websiteUrl?: string;
  urlAuditResult?: {
    fetchedAt: string;
    success: boolean;
    businessName?: string;
    industry?: string;
  };
}

function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-800 rounded bg-gray-900/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white uppercase tracking-wider">{title}</span>
        </div>
        <span className="text-gray-500 text-xs">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function InputField({ 
  label, 
  value, 
  onChange, 
  placeholder,
  multiline = false,
  hint,
}: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}) {
  const baseClasses = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder:text-gray-600 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600/50";
  
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${baseClasses} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClasses}
        />
      )}
      {hint && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { supabase, loading: authLoading } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const getToken = async () => {
    const { data } = await supabase?.auth.getSession() || {};
    return data?.session?.access_token || '';
  };

  // Fetch projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const token = await getToken();
        const data = await projectsApi.list(token);
        setProjects(data || []);
        if (data && data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        } else if (!data || data.length === 0) {
          // No projects - stop loading
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
        toast.error('Failed to load projects');
        setLoading(false);
      }
    }
    // Wait for auth to be ready
    if (!authLoading && supabase) {
      fetchProjects();
    } else if (!authLoading && !supabase) {
      // Auth finished but no supabase - stop loading
      setLoading(false);
    }
  }, [supabase, authLoading]);

  // Fetch profile when project changes
  useEffect(() => {
    async function fetchProfile() {
      if (!selectedProjectId || !supabase) return;
      setLoading(true);
      try {
        const token = await getToken();
        const data = await onboardingApi.getProfile(token, selectedProjectId);
        if (data) {
          setProfile({
            confirmedContext: data.confirmedContext || {
              brandName: '',
            },
            rights: data.rights || {
              creatorName: '',
              copyrightTemplate: '',
              creditTemplate: '',
            },
            outputPreferences: data.outputPreferences || {
              primaryLanguage: 'en',
              keywordStyle: 'mixed',
              maxKeywords: 25,
              locationBehavior: 'strict',
            },
            websiteUrl: data.websiteUrl,
            urlAuditResult: data.urlAuditResult,
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [selectedProjectId]);

  const updateContext = (field: string, value: any) => {
    if (!profile) return;
    setProfile({
      ...profile,
      confirmedContext: {
        ...profile.confirmedContext,
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  const updateLocation = (field: string, value: any) => {
    if (!profile) return;
    setProfile({
      ...profile,
      confirmedContext: {
        ...profile.confirmedContext,
        location: {
          ...profile.confirmedContext.location,
          [field]: value,
        },
      },
    });
    setHasChanges(true);
  };

  const updateRights = (field: string, value: any) => {
    if (!profile) return;
    setProfile({
      ...profile,
      rights: {
        ...profile.rights,
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  const updatePreferences = (field: string, value: any) => {
    if (!profile) return;
    setProfile({
      ...profile,
      outputPreferences: {
        ...profile.outputPreferences,
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedProjectId || !profile) return;
    setSaving(true);
    try {
      const token = await getToken();
      // Update all three sections
      await Promise.all([
        onboardingApi.updateContext(token, selectedProjectId, profile.confirmedContext),
        onboardingApi.updateRights(token, selectedProjectId, profile.rights),
        onboardingApi.updatePreferences(token, selectedProjectId, profile.outputPreferences),
      ]);
      toast.success('Profile saved');
      setHasChanges(false);
    } catch (err) {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !saving) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, saving, profile, selectedProjectId]);

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500/70" />
          <p className="text-sm text-gray-400">No projects found.</p>
          <p className="text-xs text-gray-500 mt-1">Create a project first to configure your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">User Context</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Brand & attribution settings applied to all processed images
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Project Selector */}
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:border-cyan-600 focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600 text-white rounded text-sm font-medium
              hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-cyan-500"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
            <span className="text-cyan-200 text-xs opacity-70">⌘S</span>
          </button>
        </div>
      </div>

      {!profile ? (
        <div className="text-center py-12 text-gray-500">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500/70" />
          <p className="text-sm">No profile found. Complete onboarding first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* URL Audit Status */}
          {profile.websiteUrl && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-800 rounded">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-500" />
                <div>
                  <a 
                    href={profile.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {profile.websiteUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {profile.urlAuditResult && (
                    <p className="text-[10px] text-gray-600">
                      Last audited: {new Date(profile.urlAuditResult.fetchedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded hover:bg-gray-800 transition-colors">
                <RefreshCw className="w-3 h-3" />
                Re-audit
              </button>
            </div>
          )}

          {/* Brand Context */}
          <CollapsibleSection title="Brand Context" icon={Building2}>
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Brand Name"
                value={profile.confirmedContext.brandName || ''}
                onChange={(v) => updateContext('brandName', v)}
                placeholder="Your Company Name"
              />
              <InputField
                label="Tagline"
                value={profile.confirmedContext.tagline || ''}
                onChange={(v) => updateContext('tagline', v)}
                placeholder="Your brand tagline"
              />
              <InputField
                label="Industry"
                value={profile.confirmedContext.industry || ''}
                onChange={(v) => updateContext('industry', v)}
                placeholder="Photography, Real Estate, etc."
              />
              <InputField
                label="Niche"
                value={profile.confirmedContext.niche || ''}
                onChange={(v) => updateContext('niche', v)}
                placeholder="Wedding, Commercial, etc."
              />
            </div>
            <InputField
              label="Target Audience"
              value={profile.confirmedContext.targetAudience || ''}
              onChange={(v) => updateContext('targetAudience', v)}
              placeholder="Who are your ideal clients?"
            />
            <InputField
              label="Brand Voice"
              value={profile.confirmedContext.brandVoice || ''}
              onChange={(v) => updateContext('brandVoice', v)}
              placeholder="Professional, Friendly, Luxury, etc."
            />
            <InputField
              label="Additional Context"
              value={profile.confirmedContext.additionalContext || ''}
              onChange={(v) => updateContext('additionalContext', v)}
              placeholder="Any other context for the AI to consider..."
              multiline
              hint="This context will be included in every metadata generation prompt"
            />
          </CollapsibleSection>

          {/* Location */}
          <CollapsibleSection title="Default Location" icon={MapPin}>
            <div className="grid grid-cols-3 gap-3">
              <InputField
                label="City"
                value={profile.confirmedContext.location?.city || ''}
                onChange={(v) => updateLocation('city', v)}
                placeholder="London"
              />
              <InputField
                label="State/Province"
                value={profile.confirmedContext.location?.state || ''}
                onChange={(v) => updateLocation('state', v)}
                placeholder="England"
              />
              <InputField
                label="Country"
                value={profile.confirmedContext.location?.country || ''}
                onChange={(v) => updateLocation('country', v)}
                placeholder="United Kingdom"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="strictLocation"
                checked={profile.confirmedContext.location?.isStrict ?? true}
                onChange={(e) => updateLocation('isStrict', e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
              />
              <label htmlFor="strictLocation" className="text-xs text-gray-400">
                Strict mode: Only use this location, never infer from image content
              </label>
            </div>
          </CollapsibleSection>

          {/* Rights & Attribution */}
          <CollapsibleSection title="Rights & Attribution" icon={Shield}>
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Creator Name"
                value={profile.rights.creatorName || ''}
                onChange={(v) => updateRights('creatorName', v)}
                placeholder="John Smith"
              />
              <InputField
                label="Studio Name"
                value={profile.rights.studioName || ''}
                onChange={(v) => updateRights('studioName', v)}
                placeholder="Smith Photography"
              />
            </div>
            <InputField
              label="Copyright Template"
              value={profile.rights.copyrightTemplate || ''}
              onChange={(v) => updateRights('copyrightTemplate', v)}
              placeholder="© {year} {creator}. All rights reserved."
              hint="Use {year}, {creator}, {studio} as placeholders"
            />
            <InputField
              label="Credit Line Template"
              value={profile.rights.creditTemplate || ''}
              onChange={(v) => updateRights('creditTemplate', v)}
              placeholder="Photo by {creator} / {studio}"
            />
            <InputField
              label="Usage Terms"
              value={profile.rights.usageTermsTemplate || ''}
              onChange={(v) => updateRights('usageTermsTemplate', v)}
              placeholder="Licensed for editorial use only..."
              multiline
            />
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Website"
                value={profile.rights.website || ''}
                onChange={(v) => updateRights('website', v)}
                placeholder="https://yourwebsite.com"
              />
              <InputField
                label="Contact Email"
                value={profile.rights.email || ''}
                onChange={(v) => updateRights('email', v)}
                placeholder="contact@yourwebsite.com"
              />
            </div>
          </CollapsibleSection>

          {/* Output Preferences */}
          <CollapsibleSection title="Output Preferences" icon={Sparkles} defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Primary Language
                </label>
                <select
                  value={profile.outputPreferences.primaryLanguage}
                  onChange={(e) => updatePreferences('primaryLanguage', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:border-cyan-600 focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="de">German</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="it">Italian</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Keyword Style
                </label>
                <select
                  value={profile.outputPreferences.keywordStyle}
                  onChange={(e) => updatePreferences('keywordStyle', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:border-cyan-600 focus:outline-none"
                >
                  <option value="short">Short (single words)</option>
                  <option value="long">Long (phrases)</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Max Keywords
                </label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={profile.outputPreferences.maxKeywords}
                  onChange={(e) => updatePreferences('maxKeywords', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:border-cyan-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Location Behavior
                </label>
                <select
                  value={profile.outputPreferences.locationBehavior}
                  onChange={(e) => updatePreferences('locationBehavior', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:border-cyan-600 focus:outline-none"
                >
                  <option value="strict">Strict (profile only)</option>
                  <option value="infer">Infer from images</option>
                  <option value="none">No location</option>
                </select>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Keyboard hint */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 px-4 py-2 bg-gray-800 border border-gray-700 rounded shadow-xl">
          <p className="text-xs text-gray-400">
            Unsaved changes • Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] font-mono">⌘S</kbd> to save
          </p>
        </div>
      )}
    </div>
  );
}
