'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Filter,
} from 'lucide-react';

interface IAPage {
  id: string;
  pageId: string;
  role: string;
  title: string;
  slug: string;
  primaryIntent: string | null;
  cta: string | null;
  goal: string | null;
  supportingTopics: string[];
  moneyLinkTarget: string | null;
  internalLinksOut: string[];
  contentStatus: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const roleColors: Record<string, string> = {
  money: 'bg-green-100 text-green-800',
  pillar: 'bg-purple-100 text-purple-800',
  trust: 'bg-brand-900/30 text-brand-300',
  support: 'bg-amber-100 text-amber-800',
  caseStudy: 'bg-pink-100 text-pink-800',
  release: 'bg-slate-100 text-slate-800',
};

const statusColors: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700',
  draft: 'bg-amber-100 text-amber-700',
  review: 'bg-brand-900/30 text-brand-400',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-700',
};

export default function AdminIAPagesPage() {
  const [pages, setPages] = useState<IAPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchPages();
  }, [roleFilter, statusFilter]);

  async function fetchPages() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      
      const res = await fetch(`${API_BASE}/admin/ia/pages?${params}`);
      const data = await res.json();
      setPages(data.pages || []);
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    } finally {
      setLoading(false);
    }
  }

  // Group pages by role
  const groupedPages = pages.reduce((acc, page) => {
    if (!acc[page.role]) {
      acc[page.role] = [];
    }
    acc[page.role].push(page);
    return acc;
  }, {} as Record<string, IAPage[]>);

  const roleOrder = ['money', 'pillar', 'trust', 'support', 'caseStudy', 'release'];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IA Pages</h1>
          <p className="text-sm text-slate-500 mt-1">
            {pages.length} pages in the information architecture
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-sm border border-slate-300 rounded-none px-3 py-2 bg-black"
            >
              <option value="all">All Roles</option>
              <option value="money">Money</option>
              <option value="pillar">Pillar</option>
              <option value="trust">Trust</option>
              <option value="support">Support</option>
              <option value="caseStudy">Case Study</option>
              <option value="release">Release</option>
            </select>
          </div>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-none px-3 py-2 bg-black"
          >
            <option value="all">All Status</option>
            <option value="planned">Planned</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* Pages List */}
      {roleOrder.map((role) => {
        const rolePages = groupedPages[role];
        if (!rolePages || rolePages.length === 0) return null;

        return (
          <div key={role} className="bg-black rounded-none border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[role]}`}>
                    {role}
                  </span>
                  <span className="text-sm text-slate-500">{rolePages.length} pages</span>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {rolePages.map((page) => (
                <Link
                  key={page.id}
                  href={`/admin/ia/pages/${page.id}`}
                  className="block px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <h3 className="font-medium text-slate-900 truncate">{page.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[page.contentStatus]}`}>
                          {page.contentStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{page.slug}</code>
                        {page.internalLinksOut.length > 0 && (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {page.internalLinksOut.length} links
                          </span>
                        )}
                        {page.primaryIntent && (
                          <span>Intent: {page.primaryIntent}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {pages.length === 0 && (
        <div className="bg-black rounded-none border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Pages Found</h3>
          <p className="text-slate-500 mb-4">Import an IA plan to see pages here.</p>
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
