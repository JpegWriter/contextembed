'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Loader2,
  Building2,
  MapPin,
  Shield,
  Globe,
  Sparkles,
  Award,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { userProfileApi } from '@/lib/api';
import { useSupabase } from '@/lib/supabase-provider';

/* ------------------------------------------------------------------ */
/*  Helper Components                                                  */
/* ------------------------------------------------------------------ */

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
  badge?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-steel-700/50 bg-black overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-steel-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {title}
          </span>
          {badge && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-900/40 text-brand-300 border border-brand-800/50">
              {badge}
            </span>
          )}
        </div>
        <span className="text-steel-500 text-xs">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="px-5 pb-5 space-y-4">{children}</div>}
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
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
  required?: boolean;
}) {
  const baseClasses =
    'w-full px-3 py-2 bg-steel-900 border border-steel-700/50 text-sm text-steel-200 placeholder:text-steel-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50';

  return (
    <div>
      <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
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
      {hint && <p className="text-[10px] text-steel-600 mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-steel-900 border border-steel-700/50 text-sm text-steel-200 focus:border-brand-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Summary Component                                               */
/* ------------------------------------------------------------------ */

function AiSummary({ profile }: { profile: ProfileFields }) {
  const parts: string[] = [];

  if (profile.businessName) {
    parts.push(
      `**${profile.businessName}**${profile.tagline ? ` — ${profile.tagline}` : ''}`
    );
  }

  const identityParts: string[] = [];
  if (profile.industry) identityParts.push(profile.industry);
  if (profile.niche) identityParts.push(`specializing in ${profile.niche}`);
  if (profile.city || profile.state || profile.country) {
    const loc = [profile.city, profile.state, profile.country]
      .filter(Boolean)
      .join(', ');
    identityParts.push(`based in ${loc}`);
  }
  if (identityParts.length > 0) parts.push(identityParts.join(', ') + '.');

  if (profile.services)
    parts.push(`**Services:** ${profile.services}.`);

  if (profile.targetAudience)
    parts.push(`**Target Audience:** ${profile.targetAudience}.`);

  if (profile.specializations)
    parts.push(`**Specializations:** ${profile.specializations}.`);

  if (profile.yearsExperience)
    parts.push(`**Experience:** ${profile.yearsExperience} years.`);

  if (profile.credentials)
    parts.push(`**Credentials:** ${profile.credentials}.`);

  if (profile.awardsRecognition)
    parts.push(`**Awards:** ${profile.awardsRecognition}.`);

  if (profile.keyDifferentiator)
    parts.push(`**What Sets You Apart:** ${profile.keyDifferentiator}.`);

  if (profile.brandVoice)
    parts.push(`**Brand Voice:** ${profile.brandVoice}.`);

  if (profile.brandStory)
    parts.push(`**Brand Story:** ${profile.brandStory}`);

  if (parts.length === 0) {
    return (
      <div className="px-5 py-8 bg-black border border-steel-700/50 text-center">
        <Sparkles className="w-6 h-6 mx-auto mb-2 text-steel-600" />
        <p className="text-sm text-steel-500">
          Complete your profile fields below to see your AI-generated business summary.
        </p>
        <p className="text-xs text-steel-600 mt-1 font-mono">
          Or use the Website Analysis tool to auto-fill from your website.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-brand-800/50 bg-brand-950/20 overflow-hidden">
      <div className="px-5 py-3 border-b border-brand-800/40 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand-400" />
        <span className="text-xs font-bold text-brand-300 uppercase tracking-wider">
          AI Business Summary
        </span>
        <span className="text-[10px] text-steel-600 ml-auto font-mono">
          Generated from your profile data
        </span>
      </div>
      <div className="px-5 py-4 space-y-1.5 text-sm text-steel-300 leading-relaxed">
        {parts.map((part, i) => (
          <p
            key={i}
            dangerouslySetInnerHTML={{
              __html: part.replace(
                /\*\*(.*?)\*\*/g,
                '<strong class="text-white">$1</strong>'
              ),
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProfileFields {
  businessName: string;
  tagline: string;
  industry: string;
  niche: string;
  services: string;
  targetAudience: string;
  brandVoice: string;
  city: string;
  state: string;
  country: string;
  serviceArea: string;
  yearsExperience: string;
  credentials: string;
  specializations: string;
  awardsRecognition: string;
  clientTypes: string;
  keyDifferentiator: string;
  pricePoint: string;
  brandStory: string;
  creatorName: string;
  copyrightTemplate: string;
  creditTemplate: string;
  usageTerms: string;
  website: string;
  contactEmail: string;
  primaryLanguage: string;
  keywordStyle: string;
  maxKeywords: number;
  defaultEventType: string;
  typicalDeliverables: string;
}

const EMPTY_PROFILE: ProfileFields = {
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
  serviceArea: '',
  yearsExperience: '',
  credentials: '',
  specializations: '',
  awardsRecognition: '',
  clientTypes: '',
  keyDifferentiator: '',
  pricePoint: '',
  brandStory: '',
  creatorName: '',
  copyrightTemplate: '',
  creditTemplate: '',
  usageTerms: '',
  website: '',
  contactEmail: '',
  primaryLanguage: 'en',
  keywordStyle: 'mixed',
  maxKeywords: 15,
  defaultEventType: '',
  typicalDeliverables: '',
};

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const { supabase, user, loading: authLoading } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [profile, setProfile] = useState<ProfileFields>(EMPTY_PROFILE);
  const [original, setOriginal] = useState<ProfileFields>(EMPTY_PROFILE);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [urlAuditWebsite, setUrlAuditWebsite] = useState('');
  const [auditUrl, setAuditUrl] = useState('');

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(original);

  const getToken = useCallback(async () => {
    const { data } = (await supabase?.auth.getSession()) || {};
    return data?.session?.access_token || '';
  }, [supabase]);

  /* ---- Load user-level profile ---- */
  useEffect(() => {
    if (authLoading || !supabase) return;
    loadProfile();
  }, [supabase, authLoading]);

  async function loadProfile() {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await userProfileApi.get(token);
      const p = res.profile || res;

      const fields: ProfileFields = {
        businessName: p.businessName || '',
        tagline: p.tagline || '',
        industry: p.industry || '',
        niche: p.niche || '',
        services: p.services || '',
        targetAudience: p.targetAudience || '',
        brandVoice: p.brandVoice || '',
        city: p.city || '',
        state: p.state || '',
        country: p.country || '',
        serviceArea: p.serviceArea || '',
        yearsExperience: p.yearsExperience?.toString() || '',
        credentials: p.credentials || '',
        specializations: p.specializations || '',
        awardsRecognition: p.awardsRecognition || '',
        clientTypes: p.clientTypes || '',
        keyDifferentiator: p.keyDifferentiator || '',
        pricePoint: p.pricePoint || '',
        brandStory: p.brandStory || '',
        creatorName: p.creatorName || '',
        copyrightTemplate: p.copyrightTemplate || '',
        creditTemplate: p.creditTemplate || '',
        usageTerms: p.usageTerms || '',
        website: p.website || '',
        contactEmail: p.contactEmail || '',
        primaryLanguage: p.primaryLanguage || 'en',
        keywordStyle: p.keywordStyle || 'mixed',
        maxKeywords: p.maxKeywords ?? 15,
        defaultEventType: p.defaultEventType || '',
        typicalDeliverables: p.typicalDeliverables || '',
      };

      setProfile(fields);
      setOriginal(fields);
      setOnboardingCompleted(!!p.onboardingCompleted);
      setUrlAuditWebsite(p.website || '');
      setAuditUrl(p.website || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  /* ---- Save profile ---- */
  async function handleSave() {
    setSaving(true);
    try {
      const token = await getToken();

      const toArray = (str: string) =>
        str
          ? str.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;

      await userProfileApi.update(token, {
        businessName: profile.businessName || undefined,
        tagline: profile.tagline || undefined,
        industry: profile.industry || undefined,
        niche: profile.niche || undefined,
        services: toArray(profile.services),
        targetAudience: profile.targetAudience || undefined,
        brandVoice: profile.brandVoice || undefined,
        city: profile.city || undefined,
        state: profile.state || undefined,
        country: profile.country || undefined,
        serviceArea: profile.serviceArea || undefined,
        yearsExperience: profile.yearsExperience
          ? Number(profile.yearsExperience)
          : undefined,
        credentials: profile.credentials || undefined,
        specializations: toArray(profile.specializations),
        awardsRecognition: profile.awardsRecognition || undefined,
        clientTypes: profile.clientTypes || undefined,
        keyDifferentiator: profile.keyDifferentiator || undefined,
        pricePoint: profile.pricePoint || undefined,
        brandStory: profile.brandStory || undefined,
        creatorName: profile.creatorName || undefined,
        copyrightTemplate: profile.copyrightTemplate || undefined,
        creditTemplate: profile.creditTemplate || undefined,
        usageTerms: profile.usageTerms || undefined,
        website: profile.website || undefined,
        contactEmail: profile.contactEmail || undefined,
        primaryLanguage: profile.primaryLanguage || undefined,
        keywordStyle: profile.keywordStyle || undefined,
        maxKeywords: profile.maxKeywords,
        defaultEventType: profile.defaultEventType || undefined,
        typicalDeliverables: toArray(profile.typicalDeliverables),
      });

      setOriginal({ ...profile });
      toast.success('Profile saved');
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  /* ---- URL Audit (webscrape) ---- */
  async function handleUrlAudit() {
    if (!auditUrl) return;
    setAuditing(true);
    try {
      const token = await getToken();
      const res = await userProfileApi.urlAudit(token, auditUrl);
      const audit = res.audit;

      if (audit?.success) {
        const fs = audit.fieldSuggestions || {};

        setProfile((prev) => ({
          ...prev,
          businessName: audit.businessName || prev.businessName,
          tagline: audit.tagline || prev.tagline,
          industry: fs.industry || audit.industry || prev.industry,
          niche: fs.niche || prev.niche,
          services: fs.services || prev.services,
          targetAudience: fs.targetAudience || prev.targetAudience,
          brandVoice: fs.brandVoice || prev.brandVoice,
          city: audit.location?.city || prev.city,
          state: audit.location?.state || prev.state,
          country: audit.location?.country || prev.country,
          specializations: fs.specializations || prev.specializations,
          keyDifferentiator: fs.keyDifferentiator || prev.keyDifferentiator,
          awardsRecognition: fs.awards || prev.awardsRecognition,
          credentials: fs.credentials || prev.credentials,
          defaultEventType: fs.defaultEventType || prev.defaultEventType,
          website: auditUrl,
          contactEmail: audit.contactInfo?.email || prev.contactEmail,
          creatorName: audit.businessName || prev.creatorName,
          copyrightTemplate: audit.businessName
            ? `© {year} ${audit.businessName}. All Rights Reserved.`
            : prev.copyrightTemplate,
          creditTemplate: audit.businessName
            ? `Photo by ${audit.businessName}`
            : prev.creditTemplate,
        }));

        setUrlAuditWebsite(auditUrl);
        toast.success('Website analyzed! Fields updated with detected info.');
      } else {
        toast.error('Could not extract business info from that URL');
      }
    } catch (err) {
      console.error('URL audit error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to analyze website'
      );
    } finally {
      setAuditing(false);
    }
  }

  /* ---- Field updater ---- */
  function updateField<K extends keyof ProfileFields>(
    field: K,
    value: ProfileFields[K]
  ) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  /* ---- Keyboard shortcut ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !saving) handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, saving, profile]);

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="p-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-brand-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Your Profile</h1>
            {onboardingCompleted && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-brand-900/40 text-brand-400 border border-brand-800/50">
                <CheckCircle2 className="w-3 h-3" />
                Onboarding Complete
              </span>
            )}
          </div>
          <p className="text-xs text-steel-500 mt-0.5 font-mono">
            Business defaults applied to every project &amp; metadata embed
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-5 py-2 text-white text-sm font-bold uppercase tracking-wider
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors btn-gradient-border"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
          <kbd className="ml-1 text-brand-200 text-[10px] opacity-60 font-mono">
            Ctrl+S
          </kbd>
        </button>
      </div>

      <div className="space-y-5">
        {/* AI Summary */}
        <AiSummary profile={profile} />

        {/* Website Audit */}
        <div className="border border-steel-700/50 bg-black p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Website Analysis
            </span>
          </div>
          <p className="text-xs text-steel-500 mb-3 font-mono">
            Enter your website URL and we&apos;ll scrape it to auto-fill your
            profile fields with AI-detected business context.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={auditUrl}
              onChange={(e) => setAuditUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="flex-1 px-3 py-2 bg-steel-900 border border-steel-700/50 text-sm text-steel-200 placeholder:text-steel-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUrlAudit();
              }}
            />
            <button
              onClick={handleUrlAudit}
              disabled={auditing || !auditUrl}
              className="flex items-center gap-2 px-4 py-2 bg-steel-900 border border-steel-700/50 text-sm text-steel-300 hover:bg-steel-800 hover:text-white disabled:opacity-40 transition-colors"
            >
              {auditing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {auditing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {urlAuditWebsite && (
            <div className="mt-3 flex items-center gap-2 text-xs text-steel-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />
              <span>Last analyzed:</span>
              <a
                href={
                  urlAuditWebsite.startsWith('http')
                    ? urlAuditWebsite
                    : `https://${urlAuditWebsite}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:underline flex items-center gap-1"
              >
                {urlAuditWebsite}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Business Identity */}
        <CollapsibleSection title="Business Identity" icon={Building2} badge="Core">
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Business / Brand Name"
              value={profile.businessName}
              onChange={(v) => updateField('businessName', v)}
              placeholder="Your Company Name"
              required
            />
            <InputField
              label="Tagline"
              value={profile.tagline}
              onChange={(v) => updateField('tagline', v)}
              placeholder="Your brand tagline"
            />
            <InputField
              label="Industry"
              value={profile.industry}
              onChange={(v) => updateField('industry', v)}
              placeholder="Photography, Real Estate, etc."
            />
            <InputField
              label="Niche"
              value={profile.niche}
              onChange={(v) => updateField('niche', v)}
              placeholder="Wedding, Family, Commercial, etc."
            />
          </div>
          <InputField
            label="Services"
            value={profile.services}
            onChange={(v) => updateField('services', v)}
            placeholder="Wedding Photography, Portrait Sessions, ..."
            hint="Comma-separated list"
          />
          <InputField
            label="Target Audience"
            value={profile.targetAudience}
            onChange={(v) => updateField('targetAudience', v)}
            placeholder="Engaged couples, growing families, businesses..."
          />
          <InputField
            label="Brand Voice"
            value={profile.brandVoice}
            onChange={(v) => updateField('brandVoice', v)}
            placeholder="Professional, Warm, Luxury, Authentic..."
          />
        </CollapsibleSection>

        {/* Location */}
        <CollapsibleSection title="Default Location" icon={MapPin}>
          <div className="grid grid-cols-3 gap-3">
            <InputField
              label="City"
              value={profile.city}
              onChange={(v) => updateField('city', v)}
              placeholder="London"
            />
            <InputField
              label="State / Province"
              value={profile.state}
              onChange={(v) => updateField('state', v)}
              placeholder="England"
            />
            <InputField
              label="Country"
              value={profile.country}
              onChange={(v) => updateField('country', v)}
              placeholder="United Kingdom"
            />
          </div>
          <InputField
            label="Service Area"
            value={profile.serviceArea}
            onChange={(v) => updateField('serviceArea', v)}
            placeholder="Greater London, South East England..."
            hint="Where you primarily operate"
          />
        </CollapsibleSection>

        {/* Authority & E-E-A-T */}
        <CollapsibleSection title="Authority & E-E-A-T" icon={Award} badge="SEO">
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Years of Experience"
              value={profile.yearsExperience}
              onChange={(v) => updateField('yearsExperience', v)}
              placeholder="10"
            />
            <InputField
              label="Price Point"
              value={profile.pricePoint}
              onChange={(v) => updateField('pricePoint', v)}
              placeholder="Premium, Mid-range, Budget..."
            />
          </div>
          <InputField
            label="Credentials & Certifications"
            value={profile.credentials}
            onChange={(v) => updateField('credentials', v)}
            placeholder="MPA Certified, Canon Ambassador..."
            hint="Comma-separated list"
          />
          <InputField
            label="Specializations"
            value={profile.specializations}
            onChange={(v) => updateField('specializations', v)}
            placeholder="Natural light portraiture, Candid documentary..."
            hint="Comma-separated list"
          />
          <InputField
            label="Awards & Recognition"
            value={profile.awardsRecognition}
            onChange={(v) => updateField('awardsRecognition', v)}
            placeholder="Best of Wedding 2024, ISPWP Award..."
          />
          <InputField
            label="Client Types"
            value={profile.clientTypes}
            onChange={(v) => updateField('clientTypes', v)}
            placeholder="Families, Corporations, Magazines..."
          />
          <InputField
            label="Key Differentiator"
            value={profile.keyDifferentiator}
            onChange={(v) => updateField('keyDifferentiator', v)}
            placeholder="What makes you unique?"
            multiline
          />
          <InputField
            label="Brand Story"
            value={profile.brandStory}
            onChange={(v) => updateField('brandStory', v)}
            placeholder="Tell your story — this enriches AI-generated descriptions..."
            multiline
            hint="Used to add depth and authenticity to metadata narratives"
          />
        </CollapsibleSection>

        {/* Rights & Attribution */}
        <CollapsibleSection title="Rights & Attribution" icon={Shield} badge="IPTC">
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Creator Name"
              value={profile.creatorName}
              onChange={(v) => updateField('creatorName', v)}
              placeholder="John Smith"
              required
            />
            <InputField
              label="Website"
              value={profile.website}
              onChange={(v) => updateField('website', v)}
              placeholder="https://yourwebsite.com"
            />
          </div>
          <InputField
            label="Copyright Template"
            value={profile.copyrightTemplate}
            onChange={(v) => updateField('copyrightTemplate', v)}
            placeholder="© {year} {businessName}. All Rights Reserved."
            hint="Use {year}, {businessName}, {creatorName} as placeholders"
          />
          <InputField
            label="Credit Line Template"
            value={profile.creditTemplate}
            onChange={(v) => updateField('creditTemplate', v)}
            placeholder="Photo by {creatorName}"
          />
          <InputField
            label="Usage Terms"
            value={profile.usageTerms}
            onChange={(v) => updateField('usageTerms', v)}
            placeholder="Licensed for editorial use only..."
            multiline
          />
          <InputField
            label="Contact Email"
            value={profile.contactEmail}
            onChange={(v) => updateField('contactEmail', v)}
            placeholder="contact@example.com"
          />
        </CollapsibleSection>

        {/* Output Preferences */}
        <CollapsibleSection
          title="Output Preferences"
          icon={Sparkles}
          defaultOpen={false}
        >
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Primary Language"
              value={profile.primaryLanguage}
              onChange={(v) => updateField('primaryLanguage', v)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'de', label: 'German' },
                { value: 'fr', label: 'French' },
                { value: 'es', label: 'Spanish' },
                { value: 'it', label: 'Italian' },
                { value: 'pt', label: 'Portuguese' },
                { value: 'nl', label: 'Dutch' },
                { value: 'ja', label: 'Japanese' },
              ]}
            />
            <SelectField
              label="Keyword Style"
              value={profile.keywordStyle}
              onChange={(v) => updateField('keywordStyle', v)}
              options={[
                { value: 'short', label: 'Short (single words)' },
                { value: 'long', label: 'Long (phrases)' },
                { value: 'mixed', label: 'Mixed' },
              ]}
            />
            <div>
              <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider mb-1">
                Max Keywords
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={profile.maxKeywords}
                onChange={(e) =>
                  updateField('maxKeywords', parseInt(e.target.value) || 15)
                }
                className="w-full px-3 py-2 bg-steel-900 border border-steel-700/50 text-sm text-steel-200 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <InputField
              label="Default Event Type"
              value={profile.defaultEventType}
              onChange={(v) => updateField('defaultEventType', v)}
              placeholder="Wedding, Family Session..."
            />
          </div>
          <InputField
            label="Typical Deliverables"
            value={profile.typicalDeliverables}
            onChange={(v) => updateField('typicalDeliverables', v)}
            placeholder="Digital gallery, prints, albums..."
            hint="Comma-separated list"
          />
        </CollapsibleSection>
      </div>

      {/* Unsaved changes toast */}
      <div
        className={`fixed bottom-6 right-6 px-4 py-2.5 bg-steel-900 border border-steel-700/50 shadow-xl transition-all duration-300 ${
          hasChanges
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <p className="text-xs text-steel-400">
          Unsaved changes • Press{' '}
          <kbd className="px-1.5 py-0.5 bg-steel-800 text-[10px] font-mono border border-steel-700/50">
            Ctrl+S
          </kbd>{' '}
          to save
        </p>
      </div>
    </div>
  );
}
