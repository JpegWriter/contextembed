'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  User,
  Mail,
  Key,
  CreditCard,
  LogOut,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Shield,
} from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { billingApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface BillingStatus {
  plan?: string;
  status?: string;
  projectsUsed?: number;
  projectsLimit?: number;
  assetsUsed?: number;
  assetsLimit?: number;
  exportsUsed?: number;
  exportsLimit?: number;
}

export default function SettingsPage() {
  const { user, supabase } = useSupabase();
  const router = useRouter();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadBilling = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await billingApi.getStatus(session.access_token);
      setBilling(data);
    } catch {
      // Billing may not be set up yet — that's fine
    } finally {
      setBillingLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleManageBilling = async () => {
    if (!supabase) return;
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await billingApi.createPortal(session.access_token);
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch {
      toast.error('Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      toast.error('Sign out failed');
      setSigningOut(false);
    }
  };

  const planLabel = billing?.plan
    ? billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)
    : 'Free';

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-brand-600/20 flex items-center justify-center">
          <Settings className="w-4.5 h-4.5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white uppercase tracking-wider">Settings</h1>
          <p className="text-xs text-steel-500 font-mono">Account &amp; workspace settings</p>
        </div>
      </div>

      {/* ─── Account Section ─── */}
      <section className="bg-black border border-steel-700/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-steel-700/50 bg-steel-900/30 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">Account</h2>
        </div>
        <div className="p-5 space-y-4">
          {/* Email */}
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-steel-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider">
                Email
              </label>
              <p className="mt-0.5 text-sm text-steel-200 truncate">
                {user?.email || 'Not logged in'}
              </p>
            </div>
          </div>

          {/* User ID */}
          <div className="flex items-start gap-3">
            <Key className="w-4 h-4 text-steel-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider">
                User ID
              </label>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-xs text-steel-400 font-mono truncate">
                  {user?.id || '-'}
                </p>
                {user?.id && (
                  <button
                    onClick={handleCopyId}
                    className="p-1 text-steel-500 hover:text-steel-300 transition-colors flex-shrink-0"
                    title="Copy User ID"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Auth Provider */}
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-steel-500 mt-0.5 flex-shrink-0" />
            <div>
              <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider">
                Auth Provider
              </label>
              <p className="mt-0.5 text-xs text-steel-400">
                {user?.app_metadata?.provider || 'email'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Workspace & Plan Section ─── */}
      <section className="bg-black border border-steel-700/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-steel-700/50 bg-steel-900/30 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-brand-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">Workspace &amp; Plan</h2>
        </div>
        <div className="p-5">
          {billingLoading ? (
            <div className="flex items-center gap-2 text-steel-500 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading plan details...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Plan Badge */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider">
                    Current Plan
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      billing?.plan === 'agency'
                        ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                        : billing?.plan === 'pro'
                        ? 'bg-brand-900/40 text-brand-300 border border-brand-700/50'
                        : 'bg-steel-800 text-steel-400 border border-steel-700/50'
                    }`}>
                      {planLabel}
                    </span>
                    {billing?.status && billing.status !== 'active' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-900/40 text-amber-300 border border-amber-700/50 uppercase">
                        {billing.status}
                      </span>
                    )}
                  </div>
                </div>

                {billing?.plan && billing.plan !== 'free' ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="px-3 py-1.5 text-xs font-medium text-steel-300 bg-steel-800 border border-steel-700/50 hover:border-steel-600 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {portalLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3 h-3" />
                    )}
                    Manage Billing
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/pricing')}
                    className="px-3 py-1.5 text-xs font-medium text-brand-300 bg-brand-900/30 border border-brand-700/50 hover:bg-brand-900/50 transition-colors"
                  >
                    Upgrade
                  </button>
                )}
              </div>

              {/* Usage Stats */}
              {billing && (
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-steel-700/30">
                  <UsageStat
                    label="Projects"
                    used={billing.projectsUsed}
                    limit={billing.projectsLimit}
                  />
                  <UsageStat
                    label="Assets"
                    used={billing.assetsUsed}
                    limit={billing.assetsLimit}
                  />
                  <UsageStat
                    label="Exports"
                    used={billing.exportsUsed}
                    limit={billing.exportsLimit}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── Danger Zone ─── */}
      <section className="bg-black border border-red-900/30 overflow-hidden">
        <div className="px-5 py-3 border-b border-red-900/30 bg-red-950/20 flex items-center gap-2">
          <LogOut className="w-4 h-4 text-red-400" />
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider">Session</h2>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-steel-300">Sign out of ContextEmbed</p>
              <p className="text-xs text-steel-500 mt-0.5">
                Your data will be preserved. You can sign back in any time.
              </p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-4 py-2 text-xs font-medium text-red-300 bg-red-950/40 border border-red-800/50 hover:bg-red-900/50 hover:text-red-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              Sign Out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Usage Stat Mini Component ─── */
function UsageStat({ label, used, limit }: { label: string; used?: number; limit?: number }) {
  const usedVal = used ?? 0;
  const limitVal = limit ?? 0;
  const pct = limitVal > 0 ? Math.min((usedVal / limitVal) * 100, 100) : 0;
  const isNearLimit = pct >= 80;

  return (
    <div>
      <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider">
        {label}
      </label>
      <p className={`text-sm font-mono mt-0.5 ${isNearLimit ? 'text-amber-400' : 'text-steel-300'}`}>
        {usedVal}{limitVal > 0 ? ` / ${limitVal}` : ''}
      </p>
      {limitVal > 0 && (
        <div className="w-full h-1 bg-steel-800 mt-1.5">
          <div
            className={`h-full transition-all ${isNearLimit ? 'bg-amber-500' : 'bg-brand-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
