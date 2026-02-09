'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Folder, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { projectsApi, userProfileApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { NewProjectModal, type NewProjectData } from '@/components/dashboard/NewProjectModal';

interface Project {
  id: string;
  name: string;
  description?: string;
  onboardingCompleted: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const { supabase, user } = useSupabase();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  useEffect(() => {
    checkOnboardingAndLoadProjects();
  }, []);

  async function checkOnboardingAndLoadProjects() {
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Check if user has completed their profile onboarding
      try {
        const onboardingStatus = await userProfileApi.getOnboardingStatus(session.access_token);
        
        if (!onboardingStatus.onboardingCompleted) {
          // Redirect to user onboarding - business profile setup
          router.push('/dashboard/onboarding');
          return;
        }
      } catch (onboardingError) {
        console.error('Failed to check onboarding status:', onboardingError);
        // If we can't check onboarding status, redirect to onboarding to be safe
        router.push('/dashboard/onboarding');
        return;
      }

      // User has completed onboarding, load their projects
      const data = await projectsApi.list(session.access_token);
      setProjects(data.projects);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(formData: NewProjectData) {
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Create project with form data
      const data = await projectsApi.create(session.access_token, { 
        name: formData.name,
        description: formData.description,
        eventLocation: formData.eventLocation,
        eventDate: formData.eventDate,
        galleryContext: formData.galleryContext,
      });
      
      setProjects(prev => [data.project, ...prev]);
      toast.success('Project created!');
      
      // Navigate to onboarding to complete setup
      router.push(`/dashboard/projects/${data.project.id}/onboarding`);
    } catch (error) {
      toast.error('Failed to create project');
      throw error;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Projects</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your metadata embedding projects
          </p>
        </div>
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 
            text-white rounded-lg text-sm font-semibold hover:from-cyan-500 hover:to-cyan-400 
            transition-all shadow-lg shadow-cyan-900/30"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded">
          <Folder className="h-12 w-12 text-gray-700 mx-auto mb-4" />
          <h2 className="text-sm font-semibold text-gray-300 mb-1">No projects yet</h2>
          <p className="text-xs text-gray-500 mb-6">
            Create your first project to start embedding metadata
          </p>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 
              text-white rounded-lg text-sm font-semibold hover:from-cyan-500 hover:to-cyan-400 
              transition-all shadow-lg shadow-cyan-900/30"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link
              key={project.id}
              href={
                project.onboardingCompleted
                  ? `/dashboard/projects/${project.id}`
                  : `/dashboard/projects/${project.id}/onboarding`
              }
              className="block p-4 bg-gray-900 border border-gray-800 rounded hover:border-gray-700 
                hover:bg-gray-800/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-gray-800 rounded">
                  <Folder className="h-5 w-5 text-cyan-400" />
                </div>
                {!project.onboardingCompleted && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-900/40 text-amber-400 
                    border border-amber-700/50 rounded font-medium uppercase">
                    Setup
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white mb-0.5">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center justify-between text-[10px] text-gray-600">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="h-3 w-3" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
                <ArrowRight className="h-3 w-3 group-hover:text-cyan-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
