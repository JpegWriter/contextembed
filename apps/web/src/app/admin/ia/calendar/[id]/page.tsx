'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Save,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface CalendarItem {
  id: string;
  month: string;
  theme: string;
  week: number;
  type: string;
  title: string;
  slug: string;
  primaryLinks: string[];
  adobeMention: boolean;
  mentionNote: string | null;
  contentStatus: string;
  draftPath: string | null;
  publishedUrl: string | null;
  publishedAt: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const typeColors: Record<string, string> = {
  money: 'bg-green-100 text-green-800',
  support: 'bg-amber-100 text-amber-800',
  trust: 'bg-blue-100 text-blue-800',
  trust_or_release: 'bg-purple-100 text-purple-800',
  caseStudy: 'bg-pink-100 text-pink-800',
  release: 'bg-slate-100 text-slate-800',
};

export default function AdminIACalendarItemPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<CalendarItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    contentStatus: 'planned',
    draftPath: '',
    publishedUrl: '',
    publishedAt: '',
  });

  useEffect(() => {
    fetchItem();
  }, [params.id]);

  async function fetchItem() {
    try {
      setLoading(true);
      // We need to get the item from the calendar list since we don't have a direct endpoint
      const res = await fetch(`${API_BASE}/admin/ia/calendar`);
      const data = await res.json();
      const found = data.items?.find((i: CalendarItem) => i.id === params.id);
      if (found) {
        setItem(found);
        setFormData({
          title: found.title,
          slug: found.slug,
          contentStatus: found.contentStatus,
          draftPath: found.draftPath || '',
          publishedUrl: found.publishedUrl || '',
          publishedAt: found.publishedAt ? new Date(found.publishedAt).toISOString().split('T')[0] : '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch item:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await fetch(`${API_BASE}/admin/ia/calendar/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          publishedAt: formData.publishedAt || null,
        }),
      });
      router.push('/admin/ia/calendar');
    } catch (error) {
      console.error('Failed to save item:', error);
    } finally {
      setSaving(false);
    }
  }

  function formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Calendar item not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/ia/calendar"
            className="p-2 hover:bg-slate-100 rounded-none transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 line-clamp-1">{item.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeColors[item.type]}`}>
                {item.type}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {formatMonth(item.month)} • Week {item.week}
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

      {/* Adobe Mention Warning */}
      {item.adobeMention && (
        <div className="bg-amber-50 border border-amber-200 rounded-none p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">Adobe Mention</h3>
            <p className="text-sm text-amber-700 mt-1">{item.mentionNote || 'This content mentions Adobe.'}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-black rounded-none border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Content Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Published URL</label>
            <input
              type="text"
              value={formData.publishedUrl}
              onChange={(e) => setFormData({ ...formData, publishedUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-300 rounded-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Published Date</label>
            <input
              type="date"
              value={formData.publishedAt}
              onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Read-only Info */}
      <div className="bg-black rounded-none border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Calendar Metadata</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-slate-500">Month</span>
            <p className="text-sm text-slate-900">{formatMonth(item.month)}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500">Theme</span>
            <p className="text-sm text-slate-900">{item.theme}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500">Week</span>
            <p className="text-sm text-slate-900">Week {item.week}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500">Type</span>
            <p className="text-sm text-slate-900">{item.type}</p>
          </div>
        </div>
      </div>

      {/* Primary Links */}
      {item.primaryLinks.length > 0 && (
        <div className="bg-black rounded-none border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Primary Links ({item.primaryLinks.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {item.primaryLinks.map((link) => (
              <span key={link} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
                {link}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
