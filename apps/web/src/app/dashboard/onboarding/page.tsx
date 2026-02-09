'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { userProfileApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CopilotWrapper, useCopilot, FieldCopilot } from '@/components/copilot';
import { onboardingFields } from '@/lib/onboarding-fields';

const STEPS = [
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'context', label: 'Context', icon: Building2 },
  { id: 'authority', label: 'Authority', icon: Award },
  { id: 'rights', label: 'Rights', icon: Copyright },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
  { id: 'complete', label: 'Complete', icon: Check },
];

// Main component wrapped in CopilotWrapper
export default function UserOnboardingPage() {
  return (
    <CopilotWrapper>
      <OnboardingContent />
    </CopilotWrapper>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const { supabase, user } = useSupabase();
  const { setActiveField, updateFormContext } = useCopilot();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');
  
  // URL Analysis
  const [url, setUrl] = useState('');
  const [urlAudit, setUrlAudit] = useState<any>(null);
  const [auditing, setAuditing] = useState(false);
  
  // Context (Business Identity)
  const [context, setContext] = useState({
    businessName: '',
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
  
  // Authority & Expertise
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
  
  // Rights & Attribution
  const [rights, setRights] = useState({
    creatorName: '',
    copyrightTemplate: '',
    creditTemplate: '',
    usageTerms: '',
    website: '',
    contactEmail: '',
  });
  
  // Output Preferences
  const [preferences, setPreferences] = useState({
    primaryLanguage: 'en',
    keywordStyle: 'mixed' as 'short' | 'long' | 'mixed',
    maxKeywords: 25,
  });

  // Get auth token
  const getToken = useCallback(async () => {
    const { data } = await supabase?.auth.getSession() || {};
    return data?.session?.access_token || '';
  }, [supabase]);

  useEffect(() => {
    loadProfile();
  }, [supabase]);

  async function loadProfile() {
    try {
      if (!supabase) return;
      const token = await getToken();
      if (!token) {
        router.push('/login');
        return;
      }
      
      setAuthToken(token);

      const profile = await userProfileApi.get(token);
      
      // If onboarding already complete, redirect to dashboard
      if (profile.onboardingCompleted) {
        router.push('/dashboard');
        return;
      }
      
      // Pre-fill from existing profile data
      if (profile) {
        setContext({
          businessName: profile.businessName || '',
          tagline: profile.tagline || '',
          industry: profile.industry || '',
          niche: profile.niche || '',
          services: (profile.services || []).join(', '),
          targetAudience: profile.targetAudience || '',
          brandVoice: profile.brandVoice || '',
          city: profile.city || '',
          state: profile.state || '',
          country: profile.country || '',
        });
        
        setAuthority({
          yearsExperience: profile.yearsExperience?.toString() || '',
          credentials: profile.credentials || '',
          specializations: (profile.specializations || []).join(', '),
          awardsRecognition: profile.awardsRecognition || '',
          clientTypes: profile.clientTypes || '',
          keyDifferentiator: profile.keyDifferentiator || '',
          pricePoint: profile.pricePoint || '',
          brandStory: profile.brandStory || '',
          serviceArea: profile.serviceArea || '',
          defaultEventType: profile.defaultEventType || '',
          typicalDeliverables: (profile.typicalDeliverables || []).join(', '),
        });
        
        setRights({
          creatorName: profile.creatorName || '',
          copyrightTemplate: profile.copyrightTemplate || '',
          creditTemplate: profile.creditTemplate || '',
          usageTerms: profile.usageTerms || '',
          website: profile.website || '',
          contactEmail: profile.contactEmail || user?.email || '',
        });
        
        setPreferences({
          primaryLanguage: profile.primaryLanguage || 'en',
          keywordStyle: profile.keywordStyle || 'mixed',
          maxKeywords: profile.maxKeywords || 25,
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }

  // URL Analysis - calls the API endpoint
  async function handleAuditUrl() {
    if (!url) return;
    
    setAuditing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/user-profile/url-audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze URL');
      }
      
      const result = await response.json();
      const auditData = result.audit;
      setUrlAudit(auditData);
      
      if (auditData?.success) {
        const fs = auditData.fieldSuggestions || {};
        
        // Pre-fill context from audit with intelligent suggestions
        setContext(prev => ({
          ...prev,
          businessName: auditData.businessName || prev.businessName,
          tagline: auditData.tagline || prev.tagline,
          industry: fs.industry || auditData.industry || prev.industry,
          niche: fs.niche || prev.niche,
          services: fs.services || prev.services,
          targetAudience: fs.targetAudience || prev.targetAudience,
          brandVoice: fs.brandVoice || prev.brandVoice,
          city: auditData.location?.city || prev.city,
          state: auditData.location?.state || prev.state,
          country: auditData.location?.country || prev.country,
        }));
        
        // Pre-fill authority from audit
        setAuthority(prev => ({
          ...prev,
          specializations: fs.specializations || prev.specializations,
          keyDifferentiator: fs.keyDifferentiator || prev.keyDifferentiator,
          awardsRecognition: fs.awards || prev.awardsRecognition,
          credentials: fs.credentials || prev.credentials,
          defaultEventType: fs.defaultEventType || prev.defaultEventType,
        }));
        
        // Pre-fill rights from audit with IPTC best practices
        const businessName = auditData.businessName || '';
        setRights(prev => ({
          ...prev,
          website: url,
          contactEmail: auditData.contactInfo?.email || prev.contactEmail,
          // Auto-generate IPTC-compliant copyright template
          creatorName: businessName || prev.creatorName,
          copyrightTemplate: businessName 
            ? `© {year} ${businessName}. All Rights Reserved.` 
            : prev.copyrightTemplate,
          creditTemplate: businessName 
            ? `Photo by ${businessName}` 
            : prev.creditTemplate,
        }));
        toast.success('Website analyzed! We detected your specialty and pre-filled the form.');
      } else {
        toast.error('Could not extract business info from website');
      }
    } catch (error) {
      console.error('URL audit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze website');
      // Still set the website URL
      setRights(prev => ({ ...prev, website: url }));
    } finally {
      setAuditing(false);
    }
  }

  // Helper to split comma-separated strings to arrays
  const toArray = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);

  async function saveProgress() {
    try {
      const token = await getToken();
      
      // Helper to convert comma-separated string to array
      const toArray = (str: string): string[] | undefined => {
        if (!str) return undefined;
        const arr = str.split(',').map(s => s.trim()).filter(Boolean);
        return arr.length > 0 ? arr : undefined;
      };
      
      await userProfileApi.update(token, {
        // Context
        businessName: context.businessName || undefined,
        tagline: context.tagline || undefined,
        industry: context.industry || undefined,
        niche: context.niche || undefined,
        services: toArray(context.services),
        targetAudience: context.targetAudience || undefined,
        brandVoice: context.brandVoice || undefined,
        city: context.city || undefined,
        state: context.state || undefined,
        country: context.country || undefined,
        // Authority
        yearsExperience: authority.yearsExperience ? Number(authority.yearsExperience) : undefined,
        credentials: authority.credentials || undefined,
        specializations: toArray(authority.specializations),
        awardsRecognition: authority.awardsRecognition || undefined,
        clientTypes: authority.clientTypes || undefined,
        keyDifferentiator: authority.keyDifferentiator || undefined,
        pricePoint: authority.pricePoint || undefined,
        brandStory: authority.brandStory || undefined,
        serviceArea: authority.serviceArea || undefined,
        defaultEventType: authority.defaultEventType || undefined,
        typicalDeliverables: toArray(authority.typicalDeliverables),
        // Rights
        creatorName: rights.creatorName || undefined,
        copyrightTemplate: rights.copyrightTemplate || undefined,
        creditTemplate: rights.creditTemplate || undefined,
        usageTerms: rights.usageTerms || undefined,
        website: rights.website || undefined,
        contactEmail: rights.contactEmail && rights.contactEmail.includes('@') ? rights.contactEmail : undefined,
        // Preferences
        primaryLanguage: preferences.primaryLanguage || undefined,
        keywordStyle: preferences.keywordStyle || undefined,
        maxKeywords: preferences.maxKeywords ? Number(preferences.maxKeywords) : undefined,
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  async function handleNextStep() {
    setSaving(true);
    try {
      await saveProgress();
      setCurrentStep(prev => prev + 1);
    } catch (error) {
      toast.error('Failed to save progress');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      await saveProgress();
      const token = await getToken();
      await userProfileApi.completeOnboarding(token);
      toast.success('Profile setup complete! Welcome to ContextEmbed.');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to complete setup');
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
    // Map field IDs to state keys
    const contextKeys = ['businessName', 'brandName', 'tagline', 'industry', 'niche', 'services', 'targetAudience', 'brandVoice', 'city', 'state', 'country'];
    const authorityKeys = ['yearsExperience', 'credentials', 'specializations', 'awardsRecognition', 'clientTypes', 'keyDifferentiator', 'pricePoint', 'brandStory', 'serviceArea', 'defaultEventType', 'typicalDeliverables'];
    const rightsKeys = ['creatorName', 'copyrightTemplate', 'creditTemplate', 'usageTerms', 'website', 'contactEmail', 'email'];
    
    if (contextKeys.includes(fieldId)) {
      const key = fieldId === 'brandName' ? 'businessName' : fieldId;
      setContext(prev => ({ ...prev, [key]: value }));
    } else if (authorityKeys.includes(fieldId)) {
      setAuthority(prev => ({ ...prev, [fieldId]: value }));
    } else if (rightsKeys.includes(fieldId)) {
      const key = fieldId === 'email' ? 'contactEmail' : fieldId;
      setRights(prev => ({ ...prev, [key]: value }));
    }
    updateFormContext({ [fieldId]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 max-w-6xl mx-auto p-6">
      {/* Main Form */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-900/30 border border-cyan-800/50 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-cyan-300">Welcome to ContextEmbed</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Set Up Your Business Profile</h1>
          <p className="text-sm text-gray-500">
            These defaults will be used across all your projects. You can always update them later.
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => i <= currentStep && setCurrentStep(i)}
                disabled={i > currentStep}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  i === currentStep
                    ? 'bg-cyan-600 text-white'
                    : i < currentStep
                    ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              >
                <step.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRightIcon className="w-4 h-4 text-gray-700 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          {/* Step 0: Website */}
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
                    className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600/50"
                  />
                  <button
                    onClick={handleAuditUrl}
                    disabled={!url || auditing}
                    className="px-4 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-500 disabled:opacity-50 flex items-center gap-2"
                  >
                    {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
                  </button>
                </div>
              </div>

              {urlAudit && urlAudit.success && (
                <div className="p-4 bg-emerald-900/20 border border-emerald-700/50 rounded-lg">
                  <h3 className="font-medium text-emerald-400 text-sm mb-2">Found information:</h3>
                  <ul className="text-xs space-y-1 text-emerald-300">
                    {urlAudit.businessName && <li>• Business: {urlAudit.businessName}</li>}
                    {urlAudit.industry && <li>• Industry: {urlAudit.industry}</li>}
                    {urlAudit.tagline && <li>• Tagline: {urlAudit.tagline}</li>}
                    {urlAudit.location?.city && <li>• Location: {urlAudit.location.city}</li>}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-500"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Context (Business Identity) */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">Business Identity</h2>
              </div>
              <p className="text-xs text-gray-500 -mt-2 mb-4">
                Tell us about your business so we can generate relevant metadata
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <InputField
                  id="businessName"
                  label="Business / Studio Name *"
                  value={context.businessName}
                  onChange={(v) => setContext(c => ({ ...c, businessName: v }))}
                  onFocus={() => handleFocus('brandName', 'context')}
                  placeholder="e.g., Sarah Chen Photography"
                  required
                />
                <InputField
                  id="industry"
                  label="Industry"
                  value={context.industry}
                  onChange={(v) => setContext(c => ({ ...c, industry: v }))}
                  onFocus={() => handleFocus('industry', 'context')}
                  placeholder="e.g., Wedding Photography"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <InputField
                  id="tagline"
                  label="Tagline / Slogan"
                  value={context.tagline}
                  onChange={(v) => setContext(c => ({ ...c, tagline: v }))}
                  onFocus={() => handleFocus('tagline', 'context')}
                  placeholder="e.g., Timeless moments, artfully captured"
                />
                <InputField
                  id="niche"
                  label="Specialty / Niche"
                  value={context.niche}
                  onChange={(v) => setContext(c => ({ ...c, niche: v }))}
                  onFocus={() => handleFocus('niche', 'context')}
                  placeholder="e.g., Intimate elopements"
                />
              </div>

              <InputField
                id="services"
                label="Services (comma-separated)"
                value={context.services}
                onChange={(v) => setContext(c => ({ ...c, services: v }))}
                onFocus={() => handleFocus('services', 'context')}
                placeholder="e.g., Wedding photography, engagement sessions, portraits"
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

              <InputField
                id="brandVoice"
                label="Brand Voice"
                value={context.brandVoice}
                onChange={(v) => setContext(c => ({ ...c, brandVoice: v }))}
                onFocus={() => handleFocus('brandVoice', 'context')}
                placeholder="e.g., Professional, warm, editorial"
              />

              {/* Location Section */}
              <div className="border-t border-gray-800 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Default Location</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <InputField
                    id="city"
                    label="City"
                    value={context.city}
                    onChange={(v) => setContext(c => ({ ...c, city: v }))}
                    onFocus={() => handleFocus('city', 'context')}
                    placeholder="e.g., Austin"
                  />
                  <InputField
                    id="state"
                    label="State / Region"
                    value={context.state}
                    onChange={(v) => setContext(c => ({ ...c, state: v }))}
                    onFocus={() => handleFocus('state', 'context')}
                    placeholder="e.g., Texas"
                  />
                  <InputField
                    id="country"
                    label="Country"
                    value={context.country}
                    onChange={(v) => setContext(c => ({ ...c, country: v }))}
                    onFocus={() => handleFocus('country', 'context')}
                    placeholder="e.g., United States"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 border border-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!context.businessName || saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Authority & Expertise */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">Authority & Expertise</h2>
              </div>
              <p className="text-xs text-gray-500 -mt-2 mb-4">
                These details add credibility signals to your metadata for better SEO authority (E-E-A-T)
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <InputField
                  id="yearsExperience"
                  label="Years of Experience"
                  value={authority.yearsExperience}
                  onChange={(v) => setAuthority(a => ({ ...a, yearsExperience: v }))}
                  onFocus={() => handleFocus('yearsExperience', 'authority')}
                  placeholder="e.g., 15"
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
                label="Credentials & Certifications"
                value={authority.credentials}
                onChange={(v) => setAuthority(a => ({ ...a, credentials: v }))}
                onFocus={() => handleFocus('credentials', 'authority')}
                placeholder="e.g., MFA Photography, PPA Certified, WPPI Member"
              />

              <InputField
                id="specializations"
                label="Specializations (comma-separated)"
                value={authority.specializations}
                onChange={(v) => setAuthority(a => ({ ...a, specializations: v }))}
                onFocus={() => handleFocus('specializations', 'authority')}
                placeholder="e.g., Low-light ceremonies, destination weddings, editorial portraits"
              />

              <InputField
                id="awardsRecognition"
                label="Awards & Recognition"
                value={authority.awardsRecognition}
                onChange={(v) => setAuthority(a => ({ ...a, awardsRecognition: v }))}
                onFocus={() => handleFocus('awardsRecognition', 'authority')}
                placeholder="e.g., WPPI First Place 2024, Featured in Martha Stewart Weddings"
              />

              <InputField
                id="clientTypes"
                label="Notable Client Types"
                value={authority.clientTypes}
                onChange={(v) => setAuthority(a => ({ ...a, clientTypes: v }))}
                onFocus={() => handleFocus('clientTypes', 'authority')}
                placeholder="e.g., Fortune 500 companies, luxury brands, high-profile weddings"
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
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-cyan-600 focus:outline-none"
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
                      placeholder="e.g., Wedding, Corporate, Portrait"
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
                    label="Service Areas"
                    value={authority.serviceArea}
                    onChange={(v) => setAuthority(a => ({ ...a, serviceArea: v }))}
                    onFocus={() => handleFocus('serviceArea', 'authority')}
                    placeholder="e.g., Austin, San Antonio, Hill Country, Worldwide"
                  />

                  <InputField
                    id="typicalDeliverables"
                    label="Typical Deliverables (comma-separated)"
                    value={authority.typicalDeliverables}
                    onChange={(v) => setAuthority(a => ({ ...a, typicalDeliverables: v }))}
                    onFocus={() => handleFocus('typicalDeliverables', 'authority')}
                    placeholder="e.g., High-res digital images, online gallery, print rights"
                  />
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 border border-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Rights & Attribution */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Copyright className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">Rights & Attribution</h2>
              </div>
              <p className="text-xs text-gray-500 -mt-2 mb-4">
                Set your default copyright and credit information for all images
              </p>

              <InputField
                id="creatorName"
                label="Creator / Photographer Name *"
                value={rights.creatorName}
                onChange={(v) => setRights(r => ({ ...r, creatorName: v }))}
                onFocus={() => handleFocus('creatorName', 'rights')}
                placeholder="e.g., Sarah Chen"
                required
              />

              <InputField
                id="copyrightTemplate"
                label="Copyright Notice Template"
                value={rights.copyrightTemplate}
                onChange={(v) => setRights(r => ({ ...r, copyrightTemplate: v }))}
                onFocus={() => handleFocus('copyrightTemplate', 'rights')}
                placeholder="e.g., © 2026 Sarah Chen Photography. All Rights Reserved."
              />

              <InputField
                id="creditTemplate"
                label="Credit Line Template"
                value={rights.creditTemplate}
                onChange={(v) => setRights(r => ({ ...r, creditTemplate: v }))}
                onFocus={() => handleFocus('creditTemplate', 'rights')}
                placeholder="e.g., Photo by Sarah Chen Photography"
              />

              <InputField
                id="usageTerms"
                label="Default Usage Terms"
                value={rights.usageTerms}
                onChange={(v) => setRights(r => ({ ...r, usageTerms: v }))}
                onFocus={() => handleFocus('usageTerms', 'rights')}
                placeholder="e.g., Personal use only. Commercial licensing available."
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
                  onFocus={() => handleFocus('email', 'rights')}
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 border border-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!rights.creatorName || saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">Output Preferences</h2>
              </div>
              <p className="text-xs text-gray-500 -mt-2 mb-4">
                Configure how your metadata will be generated
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Primary Language
                  </label>
                  <select
                    value={preferences.primaryLanguage}
                    onChange={(e) => setPreferences(p => ({ ...p, primaryLanguage: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-cyan-600 focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ja">Japanese</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Keyword Style
                  </label>
                  <select
                    value={preferences.keywordStyle}
                    onChange={(e) => setPreferences(p => ({ ...p, keywordStyle: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-cyan-600 focus:outline-none"
                  >
                    <option value="short">Short (single words)</option>
                    <option value="long">Long-tail (phrases)</option>
                    <option value="mixed">Mixed (recommended)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Maximum Keywords per Image
                </label>
                <input
                  type="number"
                  value={preferences.maxKeywords}
                  onChange={(e) => setPreferences(p => ({ ...p, maxKeywords: parseInt(e.target.value) || 25 }))}
                  min={5}
                  max={50}
                  className="w-32 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-cyan-600 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 20-30 keywords</p>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 border border-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-900/30 rounded-full mb-4">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">You're all set!</h2>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Your business profile is configured. These defaults will be applied to all new projects.
                </p>
              </div>

              {/* Summary */}
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Profile Summary</h3>
                <dl className="text-xs space-y-2">
                  <SummaryRow label="Business" value={context.businessName || '—'} />
                  <SummaryRow label="Industry" value={context.industry || '—'} />
                  <SummaryRow label="Creator" value={rights.creatorName || '—'} />
                  <SummaryRow label="Location" value={[context.city, context.state, context.country].filter(Boolean).join(', ') || '—'} />
                  <SummaryRow label="Experience" value={authority.yearsExperience ? `${authority.yearsExperience} years` : '—'} />
                  <SummaryRow label="Language" value={preferences.primaryLanguage.toUpperCase()} />
                </dl>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 border border-gray-700"
                >
                  Edit Settings
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start Creating Projects'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Skip option */}
        <div className="text-center mt-4">
          <button
            onClick={handleComplete}
            className="text-xs text-gray-500 hover:text-gray-400 underline"
          >
            Skip for now and set up later
          </button>
        </div>
      </div>

      {/* Copilot Sidebar */}
      <div className="w-72 shrink-0 hidden lg:block">
        <div className="sticky top-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">AI Copilot</span>
          </div>
          <FieldCopilot
            fieldDefinitions={onboardingFields}
            onApplySuggestion={handleApplySuggestion}
            apiToken={authToken}
            urlAudit={urlAudit}
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
  const baseClasses = "w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600/50";
  
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

// ChevronRight for step indicators
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
