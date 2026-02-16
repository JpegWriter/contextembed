'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Globe, 
  Building2, 
  Copyright, 
  Sliders, 
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Award,
  Sparkles,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { onboardingApi, projectsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CopilotWrapper, useCopilot, FieldCopilot } from '@/components/copilot';
import { onboardingFields } from '@/lib/onboarding-fields';

const STEPS = [
  { id: 'url', label: 'Website', icon: Globe },
  { id: 'context', label: 'Context', icon: Building2 },
  { id: 'authority', label: 'Authority', icon: Award },
  { id: 'rights', label: 'Rights', icon: Copyright },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
  { id: 'complete', label: 'Complete', icon: Check },
];

// Main component wrapped in CopilotWrapper
export default function OnboardingPage() {
  return (
    <CopilotWrapper>
      <OnboardingContent />
    </CopilotWrapper>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { supabase } = useSupabase();
  const { setActiveField, updateFormContext } = useCopilot();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');
  
  // Form states - expanded
  const [url, setUrl] = useState('');
  const [urlAudit, setUrlAudit] = useState<any>(null);
  const [auditing, setAuditing] = useState(false);
  
  // Context (Step 1)
  const [context, setContext] = useState({
    brandName: '',
    tagline: '',
    industry: '',
    niche: '',
    services: '',
    targetAudience: '',
    brandVoice: '',
    city: '',
    state: '',
    country: '',
  });
  
  // Authority (Step 2 - NEW)
  const [authority, setAuthority] = useState({
    yearsExperience: '',
    credentials: '',
    specializations: '',
    awardsRecognition: '',
    clientTypes: '',
    keyDifferentiator: '',
    pricePoint: '',
    brandStory: '',
    serviceArea: '',
    defaultEventType: '',
    typicalDeliverables: '',
  });
  
  // Rights (Step 3)
  const [rights, setRights] = useState({
    creatorName: '',
    studioName: '',
    copyrightTemplate: '',
    creditTemplate: '',
    usageTerms: '',
    website: '',
    contactEmail: '',
  });
  
  // Preferences (Step 4)
  const [preferences, setPreferences] = useState({
    primaryLanguage: 'en',
    keywordStyle: 'mixed' as 'short' | 'long' | 'mixed',
    maxKeywords: 25,
    locationBehavior: 'infer' as 'strict' | 'infer' | 'none',
  });

  // Get auth token
  const getToken = useCallback(async () => {
    const { data } = await supabase?.auth.getSession() || {};
    return data?.session?.access_token || '';
  }, [supabase]);

  useEffect(() => {
    loadProject();
  }, [projectId, supabase]);

  async function loadProject() {
    try {
      if (!supabase) return;
      const token = await getToken();
      if (!token) return;
      
      // Store token for Copilot API calls
      setAuthToken(token);

      const projectData = await projectsApi.get(token, projectId);
      setProject(projectData.project);
      
      if (projectData.project.onboardingCompleted) {
        router.push(`/dashboard/projects/${projectId}`);
        return;
      }

      // Initialize or get profile
      try {
        await onboardingApi.initProfile(token, projectId);
      } catch (e) {
        // Profile may already exist
      }

      const profileData = await onboardingApi.getProfile(token, projectId);
      setProfile(profileData.profile);
      
      // Prefill from profile
      if (profileData.profile?.confirmedContext) {
        const ctx = profileData.profile.confirmedContext;
        setContext({
          brandName: ctx.brandName || '',
          tagline: ctx.tagline || '',
          industry: ctx.industry || '',
          niche: ctx.niche || '',
          services: (ctx.services || []).join(', '),
          targetAudience: ctx.targetAudience || '',
          brandVoice: ctx.brandVoice || '',
          city: ctx.location?.city || '',
          state: ctx.location?.state || '',
          country: ctx.location?.country || '',
        });
        
        // Authority fields
        setAuthority({
          yearsExperience: ctx.yearsExperience?.toString() || '',
          credentials: (ctx.credentials || []).join(', '),
          specializations: (ctx.specializations || []).join(', '),
          awardsRecognition: (ctx.awardsRecognition || []).join(', '),
          clientTypes: ctx.clientTypes || '',
          keyDifferentiator: ctx.keyDifferentiator || '',
          pricePoint: ctx.pricePoint || '',
          brandStory: ctx.brandStory || '',
          serviceArea: (ctx.serviceArea || []).join(', '),
          defaultEventType: ctx.defaultEventType || '',
          typicalDeliverables: (ctx.typicalDeliverables || []).join(', '),
        });
      }
      
      if (profileData.profile?.rights) {
        const r = profileData.profile.rights;
        setRights({
          creatorName: r.creatorName || '',
          studioName: r.studioName || '',
          copyrightTemplate: r.copyrightTemplate || '',
          creditTemplate: r.creditTemplate || '',
          usageTerms: r.usageTermsTemplate || '',
          website: r.website || '',
          contactEmail: r.email || '',
        });
      }
      
      if (profileData.profile?.preferences) {
        const p = profileData.profile.preferences;
        setPreferences({
          primaryLanguage: p.primaryLanguage || 'en',
          keywordStyle: p.keywordStyle || 'mixed',
          maxKeywords: p.maxKeywords || 25,
          locationBehavior: p.locationBehavior || 'infer',
        });
      }
      
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleAuditUrl() {
    if (!url) return;
    
    setAuditing(true);
    try {
      const token = await getToken();
      const result = await onboardingApi.auditUrl(token, projectId, url);
      const audit = result.auditResult;
      setUrlAudit(audit);
      
      if (audit.success) {
        // Prefill context from audit
        setContext(prev => ({
          ...prev,
          brandName: audit.businessName || prev.brandName,
          tagline: audit.tagline || prev.tagline,
          industry: audit.industry || prev.industry,
          city: audit.location?.city || prev.city,
        }));
        toast.success('Website analyzed successfully!');
      } else {
        toast.error('Could not analyze website: ' + (audit.error || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Failed to audit URL');
    } finally {
      setAuditing(false);
    }
  }

  // Helper to split comma-separated strings to arrays
  const toArray = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);

  async function handleSaveContext() {
    setSaving(true);
    try {
      const token = await getToken();
      await onboardingApi.updateContext(token, projectId, {
        brandName: context.brandName,
        tagline: context.tagline || undefined,
        industry: context.industry || undefined,
        niche: context.niche || undefined,
        services: context.services ? toArray(context.services) : undefined,
        targetAudience: context.targetAudience || undefined,
        brandVoice: context.brandVoice || undefined,
        location: (context.city || context.state || context.country) ? {
          city: context.city || undefined,
          state: context.state || undefined,
          country: context.country || undefined,
          isStrict: false,
        } : undefined,
      });
      setCurrentStep(2);
    } catch (error) {
      toast.error('Failed to save context');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAuthority() {
    setSaving(true);
    try {
      const token = await getToken();
      // Authority fields are part of confirmedContext, so we update context again
      await onboardingApi.updateContext(token, projectId, {
        // Keep existing context
        brandName: context.brandName,
        tagline: context.tagline || undefined,
        industry: context.industry || undefined,
        niche: context.niche || undefined,
        services: context.services ? toArray(context.services) : undefined,
        targetAudience: context.targetAudience || undefined,
        brandVoice: context.brandVoice || undefined,
        location: (context.city || context.state || context.country) ? {
          city: context.city || undefined,
          state: context.state || undefined,
          country: context.country || undefined,
          isStrict: false,
        } : undefined,
        // Add authority fields
        yearsExperience: authority.yearsExperience ? parseInt(authority.yearsExperience) : undefined,
        credentials: authority.credentials ? toArray(authority.credentials) : undefined,
        specializations: authority.specializations ? toArray(authority.specializations) : undefined,
        awardsRecognition: authority.awardsRecognition ? toArray(authority.awardsRecognition) : undefined,
        clientTypes: authority.clientTypes || undefined,
        keyDifferentiator: authority.keyDifferentiator || undefined,
        pricePoint: authority.pricePoint || undefined,
        brandStory: authority.brandStory || undefined,
        serviceArea: authority.serviceArea ? toArray(authority.serviceArea) : undefined,
        defaultEventType: authority.defaultEventType || undefined,
        typicalDeliverables: authority.typicalDeliverables ? toArray(authority.typicalDeliverables) : undefined,
      });
      setCurrentStep(3);
    } catch (error) {
      toast.error('Failed to save authority info');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRights() {
    setSaving(true);
    try {
      const token = await getToken();
      await onboardingApi.updateRights(token, projectId, {
        creatorName: rights.creatorName,
        studioName: rights.studioName || undefined,
        copyrightTemplate: rights.copyrightTemplate || `© {year} ${rights.creatorName}. All Rights Reserved.`,
        creditTemplate: rights.creditTemplate || `Photo by ${rights.creatorName}`,
        usageTermsTemplate: rights.usageTerms || undefined,
        website: rights.website || undefined,
        email: rights.contactEmail || undefined,
      });
      setCurrentStep(4);
    } catch (error) {
      toast.error('Failed to save rights');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePreferences() {
    setSaving(true);
    try {
      const token = await getToken();
      await onboardingApi.updatePreferences(token, projectId, {
        primaryLanguage: preferences.primaryLanguage,
        keywordStyle: preferences.keywordStyle,
        maxKeywords: preferences.maxKeywords,
        locationBehavior: preferences.locationBehavior,
        overwriteOriginals: false,
        includeReasoning: true,
        outputFormat: 'copy',
      });
      setCurrentStep(5);
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      const token = await getToken();
      await onboardingApi.complete(token, projectId);
      toast.success('Onboarding complete!');
      router.push(`/dashboard/projects/${projectId}`);
    } catch (error) {
      toast.error('Failed to complete onboarding');
    } finally {
      setSaving(false);
    }
  }

  // Update Copilot form context when values change
  useEffect(() => {
    updateFormContext({ ...context, ...authority, ...rights });
  }, [context, authority, rights]);

  // Handle field focus for Copilot
  const handleFocus = (fieldId: string, stepId: string) => {
    setActiveField({ fieldId, stepId });
  };

  // Apply suggestion from Copilot
  const handleApplySuggestion = (fieldId: string, value: string) => {
    // Determine which state to update based on field
    if (fieldId in context) {
      setContext(prev => ({ ...prev, [fieldId]: value }));
    } else if (fieldId in authority) {
      setAuthority(prev => ({ ...prev, [fieldId]: value }));
    } else if (fieldId in rights) {
      setRights(prev => ({ ...prev, [fieldId]: value }));
    }
    updateFormContext({ [fieldId]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 max-w-6xl mx-auto">
      {/* Main Form */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-white mb-1">Set up {project?.name}</h1>
        <p className="text-sm text-gray-500 mb-6">
          Tell us about your business to generate better metadata
        </p>

        {/* Progress steps */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => i <= currentStep && setCurrentStep(i)}
                disabled={i > currentStep}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  i === currentStep
                    ? 'btn-gradient-border text-white'
                    : i < currentStep
                    ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              >
                <step.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-4 h-px bg-gray-700 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-gray-900/50 border border-gray-800 rounded p-6">
          {/* Step 0: URL */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">Website URL (Optional)</h2>
                <p className="text-xs text-gray-500 mb-4">
                  We&apos;ll analyze your website to pre-fill your brand information
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder:text-gray-600 focus:border-brand-600 focus:outline-none"
                  />
                  <button
                    onClick={handleAuditUrl}
                    disabled={!url || auditing}
                    className="px-4 py-2 text-white text-sm font-medium disabled:opacity-50 btn-gradient-border flex items-center gap-2"
                  >
                    {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
                  </button>
                </div>
              </div>

              {urlAudit && urlAudit.success && (
                <div className="p-3 bg-emerald-900/20 border border-emerald-700/50 rounded">
                  <h3 className="font-medium text-emerald-400 text-sm mb-2">Found information:</h3>
                  <ul className="text-xs space-y-1 text-emerald-300">
                    {urlAudit.businessName && <li>• Business: {urlAudit.businessName}</li>}
                    {urlAudit.industry && <li>• Industry: {urlAudit.industry}</li>}
                    {urlAudit.tagline && <li>• Tagline: {urlAudit.tagline}</li>}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium btn-gradient-border"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Context */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">Business Context</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <InputField
                  id="brandName"
                  label="Brand / Business Name *"
                  value={context.brandName}
                  onChange={(v) => setContext(c => ({ ...c, brandName: v }))}
                  onFocus={() => handleFocus('brandName', 'context')}
                  required
                />
                <InputField
                  id="industry"
                  label="Industry"
                  value={context.industry}
                  onChange={(v) => setContext(c => ({ ...c, industry: v }))}
                  onFocus={() => handleFocus('industry', 'context')}
                  placeholder="Photography, Design, etc."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <InputField
                  id="tagline"
                  label="Tagline"
                  value={context.tagline}
                  onChange={(v) => setContext(c => ({ ...c, tagline: v }))}
                  onFocus={() => handleFocus('tagline', 'context')}
                  placeholder="Your brand slogan"
                />
                <InputField
                  id="niche"
                  label="Specialty / Niche"
                  value={context.niche}
                  onChange={(v) => setContext(c => ({ ...c, niche: v }))}
                  onFocus={() => handleFocus('niche', 'context')}
                  placeholder="Your specific focus"
                />
              </div>

              <InputField
                id="services"
                label="Services (comma-separated)"
                value={context.services}
                onChange={(v) => setContext(c => ({ ...c, services: v }))}
                onFocus={() => handleFocus('services', 'context')}
                placeholder="Wedding photography, portraits, events"
              />

              <InputField
                id="targetAudience"
                label="Target Audience"
                value={context.targetAudience}
                onChange={(v) => setContext(c => ({ ...c, targetAudience: v }))}
                onFocus={() => handleFocus('targetAudience', 'context')}
                placeholder="Who are your ideal clients?"
                multiline
              />

              <div className="grid md:grid-cols-2 gap-4">
                <InputField
                  id="brandVoice"
                  label="Brand Voice"
                  value={context.brandVoice}
                  onChange={(v) => setContext(c => ({ ...c, brandVoice: v }))}
                  onFocus={() => handleFocus('brandVoice', 'context')}
                  placeholder="Professional, Friendly, Luxurious"
                />
              </div>

              {/* Location Section */}
              <div className="border-t border-gray-800 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Location</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <InputField
                    id="city"
                    label="City"
                    value={context.city}
                    onChange={(v) => setContext(c => ({ ...c, city: v }))}
                    onFocus={() => handleFocus('city', 'context')}
                    placeholder="Austin"
                  />
                  <InputField
                    id="state"
                    label="State / Region"
                    value={context.state}
                    onChange={(v) => setContext(c => ({ ...c, state: v }))}
                    onFocus={() => handleFocus('state', 'context')}
                    placeholder="Texas"
                  />
                  <InputField
                    id="country"
                    label="Country"
                    value={context.country}
                    onChange={(v) => setContext(c => ({ ...c, country: v }))}
                    onFocus={() => handleFocus('country', 'context')}
                    placeholder="United States"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700 border border-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleSaveContext}
                  disabled={!context.brandName || saving}
                  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium disabled:opacity-50 btn-gradient-border"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Authority (NEW) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-400" />
                <h2 className="text-base font-semibold text-white">Authority & Expertise</h2>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                These details add credibility signals to your metadata for better SEO authority
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <InputField
                  id="yearsExperience"
                  label="Years of Experience"
                  value={authority.yearsExperience}
                  onChange={(v) => setAuthority(a => ({ ...a, yearsExperience: v }))}
                  onFocus={() => handleFocus('yearsExperience', 'authority')}
                  placeholder="15"
                  type="number"
                />
                <InputField
                  id="keyDifferentiator"
                  label="Key Differentiator"
                  value={authority.keyDifferentiator}
                  onChange={(v) => setAuthority(a => ({ ...a, keyDifferentiator: v }))}
                  onFocus={() => handleFocus('keyDifferentiator', 'authority')}
                  placeholder="The ONE thing that sets you apart"
                />
              </div>

              <InputField
                id="credentials"
                label="Credentials & Certifications (comma-separated)"
                value={authority.credentials}
                onChange={(v) => setAuthority(a => ({ ...a, credentials: v }))}
                onFocus={() => handleFocus('credentials', 'authority')}
                placeholder="MFA Photography, PPA Certified, WPPI Member"
              />

              <InputField
                id="specializations"
                label="Specializations (comma-separated)"
                value={authority.specializations}
                onChange={(v) => setAuthority(a => ({ ...a, specializations: v }))}
                onFocus={() => handleFocus('specializations', 'authority')}
                placeholder="Low-light ceremonies, destination weddings, editorial portraits"
              />

              <InputField
                id="awardsRecognition"
                label="Awards & Recognition (comma-separated)"
                value={authority.awardsRecognition}
                onChange={(v) => setAuthority(a => ({ ...a, awardsRecognition: v }))}
                onFocus={() => handleFocus('awardsRecognition', 'authority')}
                placeholder="WPPI First Place 2024, Featured in Martha Stewart Weddings"
              />

              <InputField
                id="clientTypes"
                label="Notable Client Types"
                value={authority.clientTypes}
                onChange={(v) => setAuthority(a => ({ ...a, clientTypes: v }))}
                onFocus={() => handleFocus('clientTypes', 'authority')}
                placeholder="Fortune 500 companies, luxury brands, high-profile weddings"
              />

              {/* Advanced Section - Collapsible */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-400 mt-2"
              >
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showAdvanced ? 'Hide' : 'Show'} additional fields
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-2 border-t border-gray-800">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Price Positioning
                      </label>
                      <select
                        value={authority.pricePoint}
                        onChange={(e) => setAuthority(a => ({ ...a, pricePoint: e.target.value }))}
                        onFocus={() => handleFocus('pricePoint', 'authority')}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:border-brand-600 focus:outline-none"
                      >
                        <option value="">Select...</option>
                        <option value="budget">Budget-friendly</option>
                        <option value="mid-range">Mid-range</option>
                        <option value="premium">Premium</option>
                        <option value="luxury">Luxury</option>
                      </select>
                    </div>
                    <InputField
                      id="defaultEventType"
                      label="Default Event Type"
                      value={authority.defaultEventType}
                      onChange={(v) => setAuthority(a => ({ ...a, defaultEventType: v }))}
                      onFocus={() => handleFocus('defaultEventType', 'authority')}
                      placeholder="Wedding, Corporate, Portrait"
                    />
                  </div>

                  <InputField
                    id="brandStory"
                    label="Brand Story (2-3 sentences)"
                    value={authority.brandStory}
                    onChange={(v) => setAuthority(a => ({ ...a, brandStory: v }))}
                    onFocus={() => handleFocus('brandStory', 'authority')}
                    placeholder="Why you do what you do..."
                    multiline
                  />

                  <InputField
                    id="serviceArea"
                    label="Service Areas (comma-separated)"
                    value={authority.serviceArea}
                    onChange={(v) => setAuthority(a => ({ ...a, serviceArea: v }))}
                    onFocus={() => handleFocus('serviceArea', 'authority')}
                    placeholder="Austin, San Antonio, Hill Country, Houston"
                  />

                  <InputField
                    id="typicalDeliverables"
                    label="Typical Deliverables (comma-separated)"
                    value={authority.typicalDeliverables}
                    onChange={(v) => setAuthority(a => ({ ...a, typicalDeliverables: v }))}
                    onFocus={() => handleFocus('typicalDeliverables', 'authority')}
                    placeholder="High-res digital images, online gallery, print rights"
                  />
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700 border border-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleSaveAuthority}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium disabled:opacity-50 btn-gradient-border"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Rights */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">Copyright & Attribution</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <InputField
                  id="creatorName"
                  label="Creator Name *"
                  value={rights.creatorName}
                  onChange={(v) => setRights(r => ({ ...r, creatorName: v }))}
                  onFocus={() => handleFocus('creatorName', 'rights')}
                  placeholder="Your name or studio name"
                  required
                />
                <InputField
                  id="studioName"
                  label="Studio / Company Name"
                  value={rights.studioName}
                  onChange={(v) => setRights(r => ({ ...r, studioName: v }))}
                  onFocus={() => handleFocus('studioName', 'rights')}
                  placeholder="Your registered business name"
                />
              </div>

              <InputField
                id="copyrightTemplate"
                label="Copyright Template (use {year} for current year)"
                value={rights.copyrightTemplate}
                onChange={(v) => setRights(r => ({ ...r, copyrightTemplate: v }))}
                onFocus={() => handleFocus('copyrightTemplate', 'rights')}
                placeholder="© {year} Your Name. All Rights Reserved."
              />

              <InputField
                id="creditTemplate"
                label="Credit Line Template"
                value={rights.creditTemplate}
                onChange={(v) => setRights(r => ({ ...r, creditTemplate: v }))}
                onFocus={() => handleFocus('creditTemplate', 'rights')}
                placeholder="Photo by Your Name"
              />

              <InputField
                id="usageTerms"
                label="Usage Terms"
                value={rights.usageTerms}
                onChange={(v) => setRights(r => ({ ...r, usageTerms: v }))}
                onFocus={() => handleFocus('usageTerms', 'rights')}
                placeholder="Personal use only. Contact for licensing."
                multiline
              />

              <div className="grid md:grid-cols-2 gap-4">
                <InputField
                  id="website"
                  label="Website URL"
                  value={rights.website}
                  onChange={(v) => setRights(r => ({ ...r, website: v }))}
                  onFocus={() => handleFocus('website', 'rights')}
                  placeholder="https://yourwebsite.com"
                />
                <InputField
                  id="contactEmail"
                  label="Contact Email"
                  value={rights.contactEmail}
                  onChange={(v) => setRights(r => ({ ...r, contactEmail: v }))}
                  onFocus={() => handleFocus('contactEmail', 'rights')}
                  placeholder="hello@yourwebsite.com"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700 border border-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleSaveRights}
                  disabled={!rights.creatorName || saving}
                  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium disabled:opacity-50 btn-gradient-border"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">Output Preferences</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Keyword Style
                  </label>
                  <select
                    value={preferences.keywordStyle}
                    onChange={(e) => setPreferences(p => ({ ...p, keywordStyle: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:border-brand-600 focus:outline-none"
                  >
                    <option value="short">Short (single words)</option>
                    <option value="long">Long (multi-word phrases)</option>
                    <option value="mixed">Mixed (both)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Location Behavior
                  </label>
                  <select
                    value={preferences.locationBehavior}
                    onChange={(e) => setPreferences(p => ({ ...p, locationBehavior: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:border-brand-600 focus:outline-none"
                  >
                    <option value="strict">Strict (only use my location)</option>
                    <option value="infer">Infer (detect from images)</option>
                    <option value="none">None (no location data)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Max Keywords: {preferences.maxKeywords}
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={preferences.maxKeywords}
                  onChange={(e) => setPreferences(p => ({ ...p, maxKeywords: parseInt(e.target.value) }))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>5</span>
                  <span>50</span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700 border border-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium disabled:opacity-50 btn-gradient-border"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-900/30 border border-emerald-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-7 w-7 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">All set!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your project is configured and ready for uploads
              </p>

              <div className="bg-gray-800/50 border border-gray-700 rounded p-4 text-left mb-6">
                <h3 className="text-sm font-semibold text-white mb-3">Summary</h3>
                <dl className="space-y-2 text-xs">
                  <SummaryRow label="Business" value={context.brandName} />
                  <SummaryRow label="Industry" value={context.industry || 'Not specified'} />
                  <SummaryRow label="Niche" value={context.niche || 'Not specified'} />
                  <SummaryRow label="Experience" value={authority.yearsExperience ? `${authority.yearsExperience} years` : 'Not specified'} />
                  <SummaryRow label="Location" value={[context.city, context.state, context.country].filter(Boolean).join(', ') || 'Not specified'} />
                  <SummaryRow label="Copyright" value={rights.creatorName} />
                </dl>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700 border border-gray-700"
                >
                  Edit Settings
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 text-white text-sm font-medium disabled:opacity-50 btn-gradient-border"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start Uploading'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Copilot Sidebar */}
      <div className="w-72 shrink-0 hidden lg:block">
        <div className="sticky top-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">AI Copilot</span>
          </div>
          <FieldCopilot
            fieldDefinitions={onboardingFields}
            onApplySuggestion={handleApplySuggestion}
            apiToken={authToken}
          />
        </div>
      </div>
    </div>
  );
}

// Reusable input field component
function InputField({
  id,
  label,
  value,
  onChange,
  onFocus,
  placeholder,
  required,
  multiline,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  type?: string;
}) {
  const baseClasses = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600/50";
  
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          rows={3}
          className={`${baseClasses} resize-none`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          required={required}
          className={baseClasses}
        />
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-300">{value}</dd>
    </div>
  );
}
