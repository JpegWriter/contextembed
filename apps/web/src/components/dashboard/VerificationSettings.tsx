'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Link2,
  Copy,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VerificationState {
  enabled: boolean;
  verificationUrl: string | null;
  createdAt: string | null;
  revokedAt: string | null;
  lastCheckedAt: string | null;
}

interface VerificationSettingsProps {
  projectId: string;
  token: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Verification Settings Component
 * 
 * Allows users to manage public verification for assets.
 * Provides controls for enabling/disabling, rotating, and copying verification links.
 * 
 * NO MARKETING OR BADGES - Internal use only for dispute resolution.
 */
export function VerificationSettings({ projectId, token }: VerificationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectDefaultEnabled, setProjectDefaultEnabled] = useState(false);
  const [embedVerificationLink, setEmbedVerificationLink] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      // Fetch project settings
      const res = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Failed to load settings');
      
      const data = await res.json();
      setProjectDefaultEnabled(data.project?.publicVerificationDefaultEnabled ?? false);
      setEmbedVerificationLink(data.project?.embedVerificationLink ?? false);
    } catch (error) {
      console.error('Failed to load verification settings:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, token]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateProjectDefault = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/verification/projects/${projectId}/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });
      
      if (!res.ok) throw new Error('Failed to update setting');
      
      setProjectDefaultEnabled(enabled);
      toast.success(enabled 
        ? 'Public verification enabled for new assets' 
        : 'Public verification disabled for new assets'
      );
    } catch (error) {
      toast.error('Failed to update verification setting');
    } finally {
      setSaving(false);
    }
  };

  const updateEmbedLink = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/verification/projects/${projectId}/embed-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });
      
      if (!res.ok) throw new Error('Failed to update setting');
      
      setEmbedVerificationLink(enabled);
      toast.success(enabled 
        ? 'Verification links will be embedded in exports' 
        : 'Verification links will not be embedded'
      );
    } catch (error) {
      toast.error('Failed to update embed setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="bg-black rounded-none border border-steel-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-steel-700/50 bg-steel-900/50">
          <div className="flex items-center gap-3">
            <Link2 className="h-5 w-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-gray-200">Verification</h2>
          </div>
        </div>
        <div className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black rounded-none border border-steel-700/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-steel-700/50 bg-steel-900/50">
        <div className="flex items-center gap-3">
          <Link2 className="h-5 w-5 text-brand-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-200">Public Verification</h2>
            <p className="text-sm text-gray-500">
              Enable quiet verification links for dispute resolution
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-steel-900/50 border border-steel-700/50 rounded-none">
          <Shield className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-400">
            <p>
              Public verification provides a non-indexed URL that can be used to verify 
              asset authenticity in disputes. Links are not searchable and do not appear 
              in sitemaps. Only minimal information is shown.
            </p>
          </div>
        </div>

        {/* Project Default Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Enable for New Assets
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Automatically enable verification for newly uploaded assets
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateProjectDefault(!projectDefaultEnabled)}
            disabled={saving}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${projectDefaultEnabled ? 'bg-brand-600' : 'bg-steel-700'}
              ${saving ? 'opacity-50' : ''}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${projectDefaultEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Embed Link Toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-steel-700/50">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Embed Verification URL in Exports
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Write verification URL to XMP metadata when exporting files
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateEmbedLink(!embedVerificationLink)}
            disabled={saving}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${embedVerificationLink ? 'bg-brand-600' : 'bg-steel-700'}
              ${saving ? 'opacity-50' : ''}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${embedVerificationLink ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Warning Note */}
        <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/30 rounded-none">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-400">
            <p className="font-medium">Privacy Note</p>
            <p className="mt-1 text-amber-500">
              Verification links expose minimal asset information. They should only be 
              shared for legitimate verification purposes. Rotating a token invalidates 
              all previous links for that asset.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Asset Verification Controls
 * 
 * Individual asset verification management (for asset detail pages).
 */
interface AssetVerificationProps {
  assetId: string;
  token: string;
  onUpdate?: () => void;
}

export function AssetVerificationControls({ assetId, token, onUpdate }: AssetVerificationProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<VerificationState>({
    enabled: false,
    verificationUrl: null,
    createdAt: null,
    revokedAt: null,
    lastCheckedAt: null,
  });

  const loadState = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/verification/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Failed to load state');
      
      const data = await res.json();
      setState(data);
    } catch (error) {
      console.error('Failed to load verification state:', error);
    } finally {
      setLoading(false);
    }
  }, [assetId, token]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const toggleVerification = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/verification/assets/${assetId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });
      
      if (!res.ok) throw new Error('Failed to update');
      
      const data = await res.json();
      setState({
        enabled,
        verificationUrl: data.verificationUrl,
        createdAt: data.createdAt,
        revokedAt: data.revokedAt,
        lastCheckedAt: state.lastCheckedAt,
      });
      
      toast.success(enabled ? 'Verification enabled' : 'Verification disabled');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to update verification');
    } finally {
      setSaving(false);
    }
  };

  const rotateToken = async () => {
    const confirmed = window.confirm(
      'Rotating the verification token will invalidate all existing verification links for this asset. Continue?'
    );
    
    if (!confirmed) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/verification/assets/${assetId}/rotate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      
      if (!res.ok) throw new Error('Failed to rotate');
      
      const data = await res.json();
      setState({
        enabled: true,
        verificationUrl: data.verificationUrl,
        createdAt: data.createdAt,
        revokedAt: null,
        lastCheckedAt: null,
      });
      
      toast.success('Verification token rotated');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to rotate token');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async () => {
    if (!state.verificationUrl) return;
    
    try {
      await navigator.clipboard.writeText(state.verificationUrl);
      toast.success('Verification URL copied');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading verification...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Public Verification</span>
        </div>
        <button
          type="button"
          onClick={() => toggleVerification(!state.enabled)}
          disabled={saving}
          className={`
            relative inline-flex h-5 w-9 items-center rounded-full transition-colors
            ${state.enabled ? 'bg-brand-600' : 'bg-steel-700'}
            ${saving ? 'opacity-50' : ''}
          `}
        >
          <span
            className={`
              inline-block h-3 w-3 transform rounded-full bg-white transition-transform
              ${state.enabled ? 'translate-x-5' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {state.enabled && state.verificationUrl && (
        <div className="space-y-2">
          {/* URL Display */}
          <div className="flex items-center gap-2 p-2 bg-steel-900/50 border border-steel-700/50 rounded-none">
            <input
              type="text"
              readOnly
              value={state.verificationUrl}
              className="flex-1 bg-transparent text-xs text-gray-400 truncate outline-none"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="p-1 hover:bg-steel-800 rounded-none transition-colors"
              title="Copy URL"
            >
              <Copy className="h-4 w-4 text-gray-400" />
            </button>
            <a
              href={state.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-steel-800 rounded-none transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={rotateToken}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-steel-800 rounded-none transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Rotate Token
            </button>
            <button
              type="button"
              onClick={() => toggleVerification(false)}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-none transition-colors"
            >
              <XCircle className="h-3 w-3" />
              Revoke
            </button>
          </div>

          {/* Stats */}
          {state.lastCheckedAt && (
            <p className="text-xs text-gray-500">
              Last checked: {new Date(state.lastCheckedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
