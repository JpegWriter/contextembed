import { Metadata } from 'next';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  FileText,
  DollarSign,
  BookOpen,
  Shield,
  HelpCircle,
  Briefcase,
  Newspaper,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sitemap | ContextEmbed',
  description: 'Browse all pages on ContextEmbed organized by content type.',
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

const roleConfig: Record<string, { label: string; icon: React.ReactNode; description: string; color: string }> = {
  money: {
    label: 'Product Pages',
    icon: <DollarSign className="w-5 h-5" />,
    description: 'Core product and conversion pages',
    color: 'bg-green-50 border-green-200 text-green-800',
  },
  pillar: {
    label: 'Guides',
    icon: <BookOpen className="w-5 h-5" />,
    description: 'Comprehensive topic guides',
    color: 'bg-purple-50 border-purple-200 text-purple-800',
  },
  trust: {
    label: 'Trust & Transparency',
    icon: <Shield className="w-5 h-5" />,
    description: 'Security, methodology, and compliance',
    color: 'bg-brand-900/20 border-brand-700/50 text-brand-300',
  },
  support: {
    label: 'Help & Resources',
    icon: <HelpCircle className="w-5 h-5" />,
    description: 'How-to guides and documentation',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
  },
  caseStudy: {
    label: 'Case Studies',
    icon: <Briefcase className="w-5 h-5" />,
    description: 'Real-world workflows and results',
    color: 'bg-pink-50 border-pink-200 text-pink-800',
  },
  release: {
    label: 'Updates',
    icon: <Newspaper className="w-5 h-5" />,
    description: 'Changelog and release notes',
    color: 'bg-slate-50 border-slate-200 text-slate-800',
  },
};

interface PageItem {
  id: string;
  title: string;
  slug: string;
}

interface SitemapSection {
  role: string;
  pages: PageItem[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSitemapSections(planData: any): SitemapSection[] {
  if (!planData?.siteMap) return [];
  
  const sections: SitemapSection[] = [];
  
  // Money pages
  if (planData.siteMap.moneyPages) {
    sections.push({
      role: 'money',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages: planData.siteMap.moneyPages.map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
      })),
    });
  }
  
  // Pillars
  if (planData.siteMap.pillars) {
    sections.push({
      role: 'pillar',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages: planData.siteMap.pillars.map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
      })),
    });
  }
  
  // Trust
  if (planData.siteMap.trustPages) {
    sections.push({
      role: 'trust',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages: planData.siteMap.trustPages.map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
      })),
    });
  }
  
  // Support
  if (planData.siteMap.supportPages) {
    sections.push({
      role: 'support',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages: planData.siteMap.supportPages.map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
      })),
    });
  }
  
  // Case Studies
  if (planData.siteMap.caseStudies) {
    sections.push({
      role: 'caseStudy',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages: planData.siteMap.caseStudies.map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
      })),
    });
  }
  
  // Release Notes
  if (planData.siteMap.releaseNotes) {
    sections.push({
      role: 'release',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages: planData.siteMap.releaseNotes.map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
      })),
    });
  }
  
  return sections;
}

export default function SitemapIAPage() {
  const planData = loadPlanData();
  const sections = getSitemapSections(planData);
  const totalPages = sections.reduce((sum, s) => sum + s.pages.length, 0);

  if (!planData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Sitemap Unavailable</h1>
          <p className="text-slate-600">The IA plan data could not be loaded.</p>
          <Link href="/" className="mt-4 inline-block text-brand-400 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-black border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Site Map</h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Browse all {totalPages} pages on ContextEmbed, organized by content type.
            This map reflects our information architecture and content strategy.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {sections.map((section) => {
            const config = roleConfig[section.role];
            if (!config || section.pages.length === 0) return null;

            return (
              <section
                key={section.role}
                className={`rounded-none border-2 overflow-hidden ${config.color}`}
              >
                <div className="px-6 py-4 border-b border-current/10">
                  <div className="flex items-center gap-3">
                    {config.icon}
                    <div>
                      <h2 className="font-semibold">{config.label}</h2>
                      <p className="text-sm opacity-80">{config.description}</p>
                    </div>
                    <span className="ml-auto px-2 py-1 bg-black/50 rounded text-sm">
                      {section.pages.length} pages
                    </span>
                  </div>
                </div>
                <div className="bg-black/80 divide-y divide-slate-100">
                  {section.pages.map((page) => (
                    <Link
                      key={page.id}
                      href={page.slug}
                      className="block px-6 py-3 hover:bg-black transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900 group-hover:text-slate-700">
                          {page.title}
                        </span>
                        <code className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {page.slug}
                        </code>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-black rounded-none border border-slate-200">
          <div className="flex items-start gap-4">
            <FileText className="w-6 h-6 text-slate-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">About This Sitemap</h3>
              <p className="text-sm text-slate-600 mb-4">
                This sitemap is auto-generated from our Information Architecture (IA) plan.
                It represents the complete content structure of ContextEmbed, including
                product pages, educational guides, trust documentation, and help resources.
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>Plan Version: {planData.planVersion}</span>
                <span>•</span>
                <span>Product: {planData.product?.name}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
