'use client';

import { useState } from 'react';
import { X, Zap, Check, Rocket, Building2 } from 'lucide-react';
import { billingApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain?: string;
  used?: number;
  limit?: number;
  token: string;
}

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/month',
    icon: Rocket,
    features: [
      'Unlimited exports per domain',
      '7-day project retention',
      'Web Preview Pack',
      'Up to 25 projects',
      'Up to 200 images per project',
      'Priority processing',
    ],
    cta: 'Upgrade to Pro',
    recommended: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$79',
    period: '/month',
    icon: Building2,
    features: [
      'Everything in Pro',
      '14-day project retention',
      'Unlimited projects',
      'Up to 500 images per project',
      'Team collaboration (coming)',
      'White-label exports (coming)',
    ],
    cta: 'Upgrade to Agency',
    recommended: false,
  },
];

export function UpgradeModal({ isOpen, onClose, domain, used, limit, token }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(planId: 'pro' | 'agency') {
    setLoading(planId);
    try {
      const result = await billingApi.createCheckout(token, planId);
      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error) {
      toast.error('Failed to start upgrade: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600/20 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Upgrade Required</h2>
              {domain && (
                <p className="text-xs text-gray-500">
                  Free limit reached for <span className="text-brand-400 font-mono">{domain}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Usage indicator */}
          {used !== undefined && limit !== undefined && (
            <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-amber-300 font-medium">Free Tier Usage</span>
                <span className="text-sm text-amber-400 font-mono">{used}/{limit} exports</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Free tier includes 3 successful exports per domain. Upgrade to unlock unlimited exports.
              </p>
            </div>
          )}

          {/* Plan cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`relative p-5 rounded-lg border transition-all ${
                    plan.recommended
                      ? 'bg-brand-900/20 border-brand-600/50 ring-1 ring-brand-500/30'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider rounded">
                      Recommended
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.recommended ? 'bg-brand-600/30' : 'bg-gray-700'
                    }`}>
                      <Icon className={`w-5 h-5 ${plan.recommended ? 'text-brand-400' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white">{plan.price}</span>
                        <span className="text-sm text-gray-500">{plan.period}</span>
                      </div>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handleUpgrade(plan.id as 'pro' | 'agency')}
                    disabled={loading !== null}
                    className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
                      plan.recommended
                        ? 'btn-gradient-border text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    } ${loading === plan.id ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {loading === plan.id ? 'Redirecting...' : plan.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Free tier note */}
          <p className="text-center text-xs text-gray-600 mt-6">
            Free tier: 3 exports per domain • 24h project retention • Limited to 3 projects
          </p>
        </div>
      </div>
    </div>
  );
}
