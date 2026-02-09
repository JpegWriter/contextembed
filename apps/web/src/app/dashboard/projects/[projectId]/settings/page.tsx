'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings,
  Shield,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { projectsApi, governanceApi } from '@/lib/api';
import toast from 'react-hot-toast';

type VisualAuthenticityPolicy = 'conditional' | 'deny_ai_proof' | 'allow';

interface Project {
  id: string;
  name: string;
  goal: string;
  visualAuthenticityPolicy: VisualAuthenticityPolicy;
  startupModeEnabled: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

const POLICY_OPTIONS: {
  value: VisualAuthenticityPolicy;
  label: string;
  description: string;
  icon: typeof Shield;
  color: string;
}[] = [
  {
    value: 'deny_ai_proof',
    label: 'Strict - Deny AI for Proof',
    description: 'AI-generated images cannot be used as proof of work. Best for service businesses that need to demonstrate real results.',
    icon: Shield,
    color: 'text-red-500',
  },
  {
    value: 'conditional',
    label: 'Conditional - Review AI Proof',
    description: 'AI-generated proof images require manual review. Balanced approach for most businesses.',
    icon: AlertTriangle,
    color: 'text-amber-500',
  },
  {
    value: 'allow',
    label: 'Permissive - Allow All',
    description: 'All images are allowed regardless of AI generation. Use for stock photos, social media, or when AI content is acceptable.',
    icon: CheckCircle2,
    color: 'text-green-500',
  },
];

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { supabase } = useSupabase();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<VisualAuthenticityPolicy>('conditional');

  const loadProject = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const data = await projectsApi.get(session.access_token, projectId);
      setProject(data.project);
      setSelectedPolicy(data.project.visualAuthenticityPolicy || 'conditional');
    } catch (error: any) {
      if (error?.message?.includes('token') || error?.message?.includes('Unauthorized')) {
        router.push('/login');
        return;
      }
      toast.error('Failed to load project settings');
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase, router]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handlePolicyChange = async (policy: VisualAuthenticityPolicy) => {
    if (!supabase || !project) return;
    
    // If startup mode is enabled, policy is locked
    if (project.startupModeEnabled) {
      toast.error('Policy is locked in Startup Mode');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      await governanceApi.updatePolicy(session.access_token, projectId, policy);
      setSelectedPolicy(policy);
      setProject(prev => prev ? { ...prev, visualAuthenticityPolicy: policy } : null);
      toast.success('Policy updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update policy');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableStartupMode = async () => {
    if (!supabase || !project) return;

    const confirmed = window.confirm(
      'Enabling Startup Mode will lock the visual authenticity policy to "Deny AI for Proof" and cannot be undone. This ensures all proof images are authentic. Continue?'
    );

    if (!confirmed) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      await governanceApi.enableStartupMode(session.access_token, projectId);
      setSelectedPolicy('deny_ai_proof');
      setProject(prev => prev ? { 
        ...prev, 
        startupModeEnabled: true,
        visualAuthenticityPolicy: 'deny_ai_proof' 
      } : null);
      toast.success('Startup Mode enabled. Policy locked to "Deny AI for Proof".');
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable Startup Mode');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Project not found</p>
        <Link href="/dashboard" className="text-blue-500 hover:underline mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Project Settings
          </h1>
          <p className="text-gray-500">{project.name}</p>
        </div>
      </div>

      {/* Governance Section */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Governance</h2>
              <p className="text-sm text-gray-500">
                Control how AI-generated images are handled in this project
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Startup Mode Lock Banner */}
          {project.startupModeEnabled && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <Lock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-800">Startup Mode Active</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Visual authenticity policy is locked to &quot;Deny AI for Proof&quot; to ensure all proof-of-work 
                  images are authentic. This helps build trust with clients and protects your reputation.
                </p>
              </div>
            </div>
          )}

          {/* Visual Authenticity Policy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Visual Authenticity Policy
            </label>
            
            <div className="space-y-3">
              {POLICY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedPolicy === option.value;
                const isLocked = project.startupModeEnabled && option.value !== 'deny_ai_proof';
                const isLockedActive = project.startupModeEnabled && option.value === 'deny_ai_proof';

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={saving || isLocked || isLockedActive}
                    onClick={() => handlePolicyChange(option.value)}
                    className={`
                      w-full text-left p-4 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                      ${(isLocked || isLockedActive) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${option.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {option.label}
                          </span>
                          {isLockedActive && (
                            <Lock className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">How does this affect my images?</p>
              <ul className="mt-2 space-y-1 list-disc list-inside text-blue-700">
                <li><strong>Proof images:</strong> Photos showing completed work, before/after comparisons, case studies</li>
                <li><strong>Hero images:</strong> Main visuals on landing pages, banners</li>
                <li><strong>Decorative images:</strong> Background patterns, icons, stock illustrations</li>
                <li><strong>Stock images:</strong> Licensed third-party photography</li>
              </ul>
            </div>
          </div>

          {/* Startup Mode CTA */}
          {!project.startupModeEnabled && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900">Enable Startup Mode</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Lock policy to &quot;Deny AI for Proof&quot; to ensure authenticity for all proof-of-work images. 
                    Recommended for new service businesses building their portfolio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnableStartupMode}
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Lock className="h-4 w-4" />
                  Enable Startup Mode
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* General Settings Section */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">General</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <p className="text-gray-900">{project.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
            <p className="text-gray-900 capitalize">{project.goal?.replace(/_/g, ' ') || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
            <p className="text-gray-900">{new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
