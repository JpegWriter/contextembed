import { Metadata } from 'next';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  Calendar,
  ArrowRight,
  DollarSign,
  HelpCircle,
  Shield,
  FileText,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Content Calendar | ContextEmbed',
  description: 'Preview our upcoming content schedule for the next 12 months.',
};

// Load plan data at build time using Node.js fs (works in Server Components)
function loadPlanData() {
  // In monorepo, cwd is apps/web, so we go up to root then into data
  const paths = [
    join(process.cwd(), '..', '..', 'data', 'ia', 'contextembed_ia_plan_v1.json'),
    join(process.cwd(), 'data', 'ia', 'contextembed_ia_plan_v1.json'),
  ];
  
  for (const planPath of paths) {
    try {
      const content = readFileSync(planPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      continue;
    }
  }
  return null;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  money: {
    label: 'Product',
    icon: <DollarSign className="w-4 h-4" />,
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  support: {
    label: 'How-To',
    icon: <HelpCircle className="w-4 h-4" />,
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  trust: {
    label: 'Trust',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  trust_or_release: {
    label: 'Update',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  caseStudy: {
    label: 'Case Study',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-pink-100 text-pink-800 border-pink-200',
  },
  release: {
    label: 'Release',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-slate-100 text-slate-800 border-slate-200',
  },
};

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

export default function ContentCalendarPage() {
  const planData = loadPlanData();
  
  if (!planData?.contentCalendar) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Calendar Unavailable</h1>
          <p className="text-slate-600">The content calendar data could not be loaded.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const calendar = planData.contentCalendar;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalItems = calendar.months.reduce((sum: number, m: any) => sum + m.items.length, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <Calendar className="w-10 h-10 text-slate-400" />
            <h1 className="text-3xl font-bold text-slate-900">Content Calendar</h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl">
            A preview of our upcoming content over the next 12 months.
            We publish {calendar.cadence?.postsPerMonth || 4} pieces per month covering
            metadata, workflows, and best practices.
          </p>
          <div className="mt-6 flex items-center gap-6 text-sm text-slate-500">
            <span>{calendar.months.length} months planned</span>
            <span>•</span>
            <span>{totalItems} content pieces</span>
            <span>•</span>
            <span>Starting {formatMonth(calendar.startMonth)}</span>
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-500">Content Types:</span>
            {Object.entries(typeConfig).map(([type, config]) => (
              <span
                key={type}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}
              >
                {config.icon}
                {config.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {calendar.months.map((month: any) => (
            <section key={month.month} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Month Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {formatMonth(month.month)}
                    </h2>
                    <p className="text-sm text-slate-500">{month.theme}</p>
                  </div>
                  <span className="text-sm text-slate-400">
                    {month.items.length} items
                  </span>
                </div>
              </div>

              {/* Week Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {[1, 2, 3, 4].map((week) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const item = month.items.find((i: any) => i.week === week);
                  const config = item ? typeConfig[item.type] : null;

                  return (
                    <div key={week} className="p-4 min-h-[160px]">
                      <div className="text-xs font-medium text-slate-400 mb-3">
                        Week {week}
                      </div>
                      {item && config ? (
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${config.color}`}
                          >
                            {config.icon}
                            {config.label}
                          </span>
                          <h3 className="text-sm font-medium text-slate-900 line-clamp-3">
                            {item.title}
                          </h3>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-200">
                          <Calendar className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 bg-slate-900 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Want Updates When We Publish?
          </h2>
          <p className="text-slate-300 mb-6 max-w-lg mx-auto">
            Join our mailing list to get notified when new guides and resources
            are published. No spam, just practical metadata content.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* About */}
        <div className="mt-8 p-6 bg-white rounded-xl border border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            This calendar is auto-generated from our content planning system.
            Topics and timing may shift as we respond to user needs and industry changes.
          </p>
        </div>
      </main>
    </div>
  );
}
