'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Save,
  ExternalLink,
  FileText,
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
  draftPath: string | null;
  publishedUrl: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const roleColors: Record<string, string> = {
  money: 'bg-green-100 text-green-800',
  pillar: 'bg-purple-100 text-purple-800',
  trust: 'bg-blue-100 text-blue-800',
  support: 'bg-amber-100 text-amber-800',
  caseStudy: 'bg-pink-100 text-pink-800',
  release: 'bg-slate-100 text-slate-800',
};

export default function AdminIAPageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [page, setPage] = useState<IAPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    contentStatus: 'planned',
    draftPath: '',
    publishedUrl: '',
  });

  useEffect(() => {
    fetchPage();
  }, [params.id]);

  async function fetchPage() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/ia/pages/${params.id}`);
      const data = await res.json();
      setPage(data.page);
      setFormData({
        title: data.page.title,
        slug: data.page.slug,
        contentStatus: data.page.contentStatus,
        draftPath: data.page.draftPath || '',
        publishedUrl: data.page.publishedUrl || '',
      });
    } catch (error) {
      console.error('Failed to fetch page:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await fetch(`${API_BASE}/admin/ia/pages/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      router.push('/admin/ia/pages');
    } catch (error) {
      console.error('Failed to save page:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Page not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/ia/pages"
            className="p-2 hover:bg-slate-100 rounded-none transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{page.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[page.role]}`}>
                {page.role}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              <code>{page.pageId}</code>
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-slate-900 text-white rounded-none text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Form */}
      <div className="bg-black rounded-none border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Page Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Content Status</label>
            <select
              value={formData.contentStatus}
              onChange={(e) => setFormData({ ...formData, contentStatus: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value="planned">Planned</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Draft Path</label>
            <input
              type="text"
              value={formData.draftPath}
              onChange={(e) => setFormData({ ...formData, draftPath: e.target.value })}
              placeholder="/content/drafts/..."
              className="w-full px-3 py-2 border border-slate-300 rounded-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Published URL</label>
            <input
              type="text"
              value={formData.publishedUrl}
              onChange={(e) => setFormData({ ...formData, publishedUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-300 rounded-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Read-only Info */}
      <div className="bg-black rounded-none border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Page Metadata</h2>
        <div className="space-y-4">
          {page.primaryIntent && (
            <div>
              <span className="text-sm font-medium text-slate-500">Primary Intent:</span>
              <span className="ml-2 text-sm text-slate-900">{page.primaryIntent}</span>
            </div>
          )}
          {page.cta && (
            <div>
              <span className="text-sm font-medium text-slate-500">CTA:</span>
              <span className="ml-2 text-sm text-slate-900">{page.cta}</span>
            </div>
          )}
          {page.goal && (
            <div>
              <span className="text-sm font-medium text-slate-500">Goal:</span>
              <p className="mt-1 text-sm text-slate-900">{page.goal}</p>
            </div>
          )}
          {page.moneyLinkTarget && (
            <div>
              <span className="text-sm font-medium text-slate-500">Money Link Target:</span>
              <code className="ml-2 text-xs bg-slate-100 px-2 py-1 rounded">{page.moneyLinkTarget}</code>
            </div>
          )}
        </div>
      </div>

      {/* Internal Links */}
      {page.internalLinksOut.length > 0 && (
        <div className="bg-black rounded-none border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Internal Links Out ({page.internalLinksOut.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {page.internalLinksOut.map((link) => (
              <span key={link} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
                {link}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Supporting Topics */}
      {page.supportingTopics.length > 0 && (
        <div className="bg-black rounded-none border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Supporting Topics ({page.supportingTopics.length})
          </h2>
          <ul className="space-y-2">
            {page.supportingTopics.map((topic, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                  {i + 1}
                </span>
                {topic}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
