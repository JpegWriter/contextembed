'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Link2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface LinkRule {
  id: string;
  ruleType: string;
  sourcePageId: string | null;
  targetPageId: string | null;
  required: boolean;
  minLinks: number;
  description: string;
}

interface MentionsPolicy {
  id: string;
  brand: string;
  maxPerMonth: number;
  allowedContexts: string[];
  rules: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminIALinkRulesPage() {
  const [linkRules, setLinkRules] = useState<LinkRule[]>([]);
  const [mentionsPolicies, setMentionsPolicies] = useState<MentionsPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [rulesRes, policiesRes] = await Promise.all([
        fetch(`${API_BASE}/admin/ia/link-rules`),
        fetch(`${API_BASE}/admin/ia/mentions-policies`),
      ]);
      const rulesData = await rulesRes.json();
      const policiesData = await policiesRes.json();
      setLinkRules(rulesData.rules || []);
      setMentionsPolicies(policiesData.policies || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  const globalRules = linkRules.filter((r) => r.ruleType === 'global');
  const pageRules = linkRules.filter((r) => r.ruleType === 'page_specific');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Link Rules & Policies</h1>
        <p className="text-sm text-slate-500 mt-1">
          Internal linking requirements and brand mention policies
        </p>
      </div>

      {/* Global Link Rules */}
      <div className="bg-black rounded-none border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Global Link Rules</h2>
            <span className="px-2 py-0.5 bg-slate-200 rounded text-xs text-slate-600">
              {globalRules.length} rules
            </span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {globalRules.length > 0 ? (
            globalRules.map((rule) => (
              <div key={rule.id} className="px-6 py-4">
                <div className="flex items-start gap-3">
                  {rule.required ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm text-slate-900">{rule.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>Min links: {rule.minLinks}</span>
                      <span className={rule.required ? 'text-amber-600' : 'text-slate-500'}>
                        {rule.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-slate-500">
              No global link rules defined
            </div>
          )}
        </div>
      </div>

      {/* Page-Specific Rules */}
      <div className="bg-black rounded-none border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Page-Specific Link Rules</h2>
            <span className="px-2 py-0.5 bg-slate-200 rounded text-xs text-slate-600">
              {pageRules.length} rules
            </span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {pageRules.length > 0 ? (
            pageRules.map((rule) => (
              <div key={rule.id} className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">{rule.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {rule.sourcePageId && (
                        <code className="px-2 py-0.5 bg-brand-900/20 text-brand-400 rounded text-xs">
                          {rule.sourcePageId}
                        </code>
                      )}
                      <span className="text-slate-400">→</span>
                      {rule.targetPageId && (
                        <code className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                          {rule.targetPageId}
                        </code>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    rule.required ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {rule.required ? 'Required' : 'Optional'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-slate-500">
              No page-specific link rules defined
            </div>
          )}
        </div>
      </div>

      {/* Mentions Policies */}
      <div className="bg-black rounded-none border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Brand Mention Policies</h2>
            <span className="px-2 py-0.5 bg-slate-200 rounded text-xs text-slate-600">
              {mentionsPolicies.length} policies
            </span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {mentionsPolicies.length > 0 ? (
            mentionsPolicies.map((policy) => (
              <div key={policy.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-900">{policy.brand}</h3>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                    Max {policy.maxPerMonth} per month
                  </span>
                </div>
                
                {policy.allowedContexts.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs font-medium text-slate-500 uppercase">Allowed Contexts</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {policy.allowedContexts.map((context, i) => (
                        <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                          {context}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {policy.rules.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase">Rules</span>
                    <ul className="mt-1 space-y-1">
                      {policy.rules.map((rule, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-slate-400">•</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-slate-500">
              No brand mention policies defined
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {linkRules.length === 0 && mentionsPolicies.length === 0 && (
        <div className="bg-black rounded-none border border-slate-200 p-12 text-center">
          <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Rules Defined</h3>
          <p className="text-slate-500 mb-4">Import an IA plan to see link rules and policies.</p>
          <Link
            href="/admin/ia"
            className="text-sm font-medium text-slate-900 hover:underline"
          >
            Go to Overview →
          </Link>
        </div>
      )}
    </div>
  );
}
