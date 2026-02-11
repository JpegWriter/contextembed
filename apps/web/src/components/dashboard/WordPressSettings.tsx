'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Globe,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Info,
} from 'lucide-react';
import { wordpressApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface WordPressSettingsProps {
  projectId: string;
  token: string;
}

interface WpConfig {
  siteUrl: string;
  authMethod: string;
  username: string;
  passwordSet: boolean;
  autoInjectAltText: boolean;
  altStrategy: string;
  lastHealthCheck: string | null;
  lastHealthStatus: boolean | null;
  lastError: string | null;
}

type AltStrategy = 'seo_optimized' | 'accessibility_focused' | 'hybrid';

const STRATEGY_OPTIONS: {
  value: AltStrategy;
  label: string;
  description: string;
}[] = [
  {
    value: 'seo_optimized',
    label: 'SEO Optimized',
    description: 'Short, keyword-rich alt text (≤160 chars). Best for search rankings.',
  },
  {
    value: 'accessibility_focused',
    label: 'Accessibility Focused',
    description: 'Detailed, descriptive alt text for screen readers. Best for compliance.',
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Short alt text for the alt field + detailed version in the description field.',
  },
];

export function WordPressSettings({ projectId, token }: WordPressSettingsProps) {
  const [configured, setConfigured] = useState(false);
  const [config, setConfig] = useState<WpConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);

  // Form fields
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState<'application_password' | 'basic_auth'>('application_password');
  const [autoInject, setAutoInject] = useState(true);
  const [altStrategy, setAltStrategy] = useState<AltStrategy>('seo_optimized');

  const loadConfig = useCallback(async () => {
    try {
      const data = await wordpressApi.getConfig(token, projectId);
      setConfigured(data.configured);
      setConfig(data.config);
      if (data.config) {
        setSiteUrl(data.config.siteUrl);
        setUsername(data.config.username);
        setAuthMethod(data.config.authMethod);
        setAutoInject(data.config.autoInjectAltText);
        setAltStrategy(data.config.altStrategy);
      }
    } catch (err: any) {
      toast.error('Failed to load WordPress settings');
    } finally {
      setLoading(false);
    }
  }, [projectId, token]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!siteUrl || !username || (!password && !configured)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await wordpressApi.saveConfig(token, projectId, {
        siteUrl,
        authMethod,
        username,
        password: password || '**unchanged**', // Server should handle unchanged sentinel
        autoInjectAltText: autoInject,
        altStrategy,
      });
      toast.success('WordPress settings saved');
      setEditing(false);
      setPassword('');
      await loadConfig();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save WordPress settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await wordpressApi.testConnection(token, projectId);
      if (result.healthy) {
        toast.success('WordPress connection successful!');
      } else {
        toast.error(`Connection failed: ${result.error || 'Unknown error'}`);
      }
      await loadConfig();
    } catch (err: any) {
      toast.error(err.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleToggle = async () => {
    try {
      const newValue = !autoInject;
      await wordpressApi.toggleAutoInject(token, projectId, newValue);
      setAutoInject(newValue);
      setConfig(prev => prev ? { ...prev, autoInjectAltText: newValue } : null);
      toast.success(newValue ? 'Auto-inject enabled' : 'Auto-inject disabled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle setting');
    }
  };

  const handleStrategyChange = async (strategy: AltStrategy) => {
    try {
      await wordpressApi.setStrategy(token, projectId, strategy);
      setAltStrategy(strategy);
      setConfig(prev => prev ? { ...prev, altStrategy: strategy } : null);
      toast.success(`Alt text strategy set to ${STRATEGY_OPTIONS.find(s => s.value === strategy)?.label}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update strategy');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove WordPress integration? This will delete stored credentials.')) return;
    try {
      await wordpressApi.deleteConfig(token, projectId);
      setConfigured(false);
      setConfig(null);
      setSiteUrl('');
      setUsername('');
      setPassword('');
      toast.success('WordPress integration removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove WordPress settings');
    }
  };

  if (loading) {
    return (
      <section className="bg-black rounded-none border border-steel-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-steel-700/50 bg-steel-900/50">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-gray-900">WordPress Integration</h2>
          </div>
        </div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black rounded-none border border-steel-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-steel-700/50 bg-steel-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-brand-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">WordPress Integration</h2>
              <p className="text-sm text-gray-500">
                Automatically inject alt text into WordPress media library
              </p>
            </div>
          </div>
          {configured && (
            <div className="flex items-center gap-2">
              {config?.lastHealthStatus === true && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Connected
                </span>
              )}
              {config?.lastHealthStatus === false && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                  <XCircle className="h-3.5 w-3.5" />
                  Error
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Connection Form */}
        {(!configured || editing) && (
          <div className="space-y-4">
            {/* Site URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WordPress Site URL
              </label>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://your-site.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-brand-500"
              />
            </div>

            {/* Auth Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authentication Method
              </label>
              <select
                value={authMethod}
                onChange={(e) => setAuthMethod(e.target.value as 'application_password' | 'basic_auth')}
                className="w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-brand-500"
              >
                <option value="application_password">Application Password (recommended)</option>
                <option value="basic_auth">Basic Auth</option>
              </select>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WordPress Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-brand-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {authMethod === 'application_password' ? 'Application Password' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={configured ? '••••••••••••' : 'xxxx xxxx xxxx xxxx xxxx xxxx'}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {authMethod === 'application_password' && (
                <p className="text-xs text-gray-500 mt-1">
                  Generate one at WordPress → Users → Profile → Application Passwords
                </p>
              )}
            </div>

            {/* Save / Cancel */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-brand-600 text-white rounded-none hover:bg-brand-500 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Key className="h-4 w-4" />
                {configured ? 'Update Connection' : 'Connect WordPress'}
              </button>
              {editing && (
                <button
                  onClick={() => {
                    setEditing(false);
                    setPassword('');
                    if (config) {
                      setSiteUrl(config.siteUrl);
                      setUsername(config.username);
                      setAuthMethod(config.authMethod as 'application_password' | 'basic_auth');
                    }
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-none hover:bg-steel-900/50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Connected State */}
        {configured && !editing && (
          <>
            {/* Connection Info */}
            <div className="flex items-center justify-between p-4 bg-steel-900/50 rounded-none">
              <div>
                <p className="text-sm font-medium text-gray-900">{config?.siteUrl}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {config?.username} · {config?.authMethod === 'application_password' ? 'App Password' : 'Basic Auth'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="p-2 text-gray-500 hover:text-brand-400 hover:bg-brand-900/20 rounded-none transition-colors"
                  title="Test connection"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-none hover:bg-gray-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-none transition-colors"
                  title="Remove WordPress connection"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Auto-inject Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Auto-inject alt text into WordPress</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  When enabled, alt text is automatically set when pushing media to WP
                </p>
              </div>
              <button
                onClick={handleToggle}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${autoInject ? 'bg-brand-600' : 'bg-gray-300'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-black transition-transform
                    ${autoInject ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            {/* Alt Text Strategy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Alt Text Strategy
              </label>
              <div className="space-y-2">
                {STRATEGY_OPTIONS.map((option) => {
                  const isSelected = altStrategy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleStrategyChange(option.value)}
                      className={`
                        w-full text-left p-3 rounded-none border-2 transition-all
                        ${isSelected
                          ? 'border-brand-500 bg-brand-900/20'
                          : 'border-steel-700/50 hover:border-gray-300 bg-black'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {option.label}
                          </span>
                          <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                            {option.description}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-brand-400 flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 p-4 bg-brand-900/20 border border-brand-700/50 rounded-none">
              <Info className="h-5 w-5 text-brand-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">How it works</p>
                <ul className="mt-1 space-y-1 list-disc list-inside text-blue-700 text-xs">
                  <li>After ContextEmbed processes an image, generated alt text is stored</li>
                  <li>When you push media to WordPress, the alt text is automatically set via REST API</li>
                  <li>The <code className="bg-blue-100 px-1 rounded">_wp_attachment_image_alt</code> field is updated</li>
                  <li>Caption and description are also injected</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Error display */}
        {config?.lastError && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-none">
            <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{config.lastError}</p>
          </div>
        )}
      </div>
    </section>
  );
}
