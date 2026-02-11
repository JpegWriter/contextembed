'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
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
}

interface GroupedMonth {
  month: string;
  theme: string;
  items: CalendarItem[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const typeColors: Record<string, string> = {
  money: 'bg-green-100 text-green-800 border-green-200',
  support: 'bg-amber-100 text-amber-800 border-amber-200',
  trust: 'bg-brand-900/30 text-brand-300 border-brand-700/50',
  trust_or_release: 'bg-purple-100 text-purple-800 border-purple-200',
  caseStudy: 'bg-pink-100 text-pink-800 border-pink-200',
  release: 'bg-slate-100 text-slate-800 border-slate-200',
};

const statusColors: Record<string, string> = {
  planned: 'bg-slate-500',
  draft: 'bg-amber-500',
  review: 'bg-brand-900/200',
  published: 'bg-green-500',
  archived: 'bg-red-500',
};

export default function AdminIACalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [grouped, setGrouped] = useState<GroupedMonth[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

  useEffect(() => {
    fetchCalendar();
  }, [typeFilter, statusFilter]);

  async function fetchCalendar() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      
      const res = await fetch(`${API_BASE}/admin/ia/calendar?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setGrouped(data.grouped || []);
      setMonths(data.months || []);
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  function getWeekLabel(week: number): string {
    return `Week ${week}`;
  }

  const currentMonth = grouped[currentMonthIndex];

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
          <h1 className="text-2xl font-bold text-slate-900">Content Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">
            {items.length} items across {months.length} months
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={`${API_BASE}/admin/ia/export/calendar`}
            className="px-4 py-2 bg-black border border-slate-300 rounded-none text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-black rounded-none border border-slate-200 p-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-none px-3 py-2 bg-black"
        >
          <option value="all">All Types</option>
          <option value="money">Money</option>
          <option value="support">Support</option>
          <option value="trust">Trust</option>
          <option value="trust_or_release">Trust/Release</option>
          <option value="caseStudy">Case Study</option>
          <option value="release">Release</option>
        </select>
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

      {/* Month Navigation */}
      {grouped.length > 0 && (
        <div className="flex items-center justify-between bg-black rounded-none border border-slate-200 p-4">
          <button
            onClick={() => setCurrentMonthIndex(Math.max(0, currentMonthIndex - 1))}
            disabled={currentMonthIndex === 0}
            className="p-2 hover:bg-slate-100 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              {currentMonth && formatMonth(currentMonth.month)}
            </h2>
            <p className="text-sm text-slate-500">{currentMonth?.theme}</p>
          </div>
          <button
            onClick={() => setCurrentMonthIndex(Math.min(grouped.length - 1, currentMonthIndex + 1))}
            disabled={currentMonthIndex >= grouped.length - 1}
            className="p-2 hover:bg-slate-100 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Month View */}
      {currentMonth && (
        <div className="bg-black rounded-none border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-4 gap-px bg-slate-200">
            {[1, 2, 3, 4].map((week) => (
              <div key={week} className="bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">{getWeekLabel(week)}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-px bg-slate-200">
            {[1, 2, 3, 4].map((week) => {
              const weekItem = currentMonth.items.find((item) => item.week === week);
              return (
                <div key={week} className="bg-black p-4 min-h-[200px]">
                  {weekItem ? (
                    <Link
                      href={`/admin/ia/calendar/${weekItem.id}`}
                      className={`block p-3 rounded-none border-2 hover:shadow-md transition-shadow ${typeColors[weekItem.type]}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${statusColors[weekItem.contentStatus]}`} />
                        <span className="text-xs font-medium uppercase">{weekItem.type}</span>
                      </div>
                      <h3 className="font-medium text-sm mb-2 line-clamp-3">{weekItem.title}</h3>
                      <code className="text-xs opacity-75 block truncate">{weekItem.slug}</code>
                      {weekItem.adobeMention && (
                        <span className="mt-2 inline-block px-2 py-0.5 bg-black/50 rounded text-xs">
                          Adobe mention
                        </span>
                      )}
                    </Link>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-300">
                      <Calendar className="w-8 h-8" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month Thumbnails */}
      <div className="bg-black rounded-none border border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">All Months</h3>
        <div className="flex flex-wrap gap-2">
          {grouped.map((month, index) => (
            <button
              key={month.month}
              onClick={() => setCurrentMonthIndex(index)}
              className={`px-3 py-2 rounded-none text-sm transition-colors ${
                index === currentMonthIndex
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {formatMonth(month.month)}
              <span className="ml-2 opacity-60">({month.items.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {grouped.length === 0 && (
        <div className="bg-black rounded-none border border-slate-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Calendar Items</h3>
          <p className="text-slate-500 mb-4">Import an IA plan to see the content calendar.</p>
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
