'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Folder, Clock, ArrowRight, Loader2, ImageIcon } from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { projectsApi, userProfileApi, assetsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { NewProjectModal, type NewProjectData } from '@/components/dashboard/NewProjectModal';

interface Project {
  id: string;
  name: string;
  description?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  coverAssetId?: string;
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

      // Create project with form data including new industry-agnostic fields
      const data = await projectsApi.create(session.access_token, { 
        name: formData.name,
        description: formData.description,
        eventLocation: formData.eventLocation,
        eventDate: formData.eventDate,
        galleryContext: formData.galleryContext,
        contextScope: formData.contextScope,
        primaryContext: formData.primaryContext,
      });
      
      setProjects(prev => [data.project, ...prev]);
      toast.success('Project created!');
      
      // Navigate directly to project (user onboarding already complete)
      router.push(`/dashboard/projects/${data.project.id}`);
    } catch (error) {
      toast.error('Failed to create project');
      throw error;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-sm font-bold text-white uppercase tracking-wider">Projects</h1>
          <p className="text-xs text-steel-500 mt-0.5 font-mono">
            Manage your metadata embedding projects
          </p>
        </div>
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 border border-brand-500
            text-white text-sm font-bold uppercase tracking-wider hover:bg-brand-500 
            transition-all shadow-glow-green"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-black border border-steel-700/50">
          <Folder className="h-12 w-12 text-steel-700 mx-auto mb-4" />
          <h2 className="text-sm font-bold text-steel-300 mb-1 uppercase tracking-wider">No projects yet</h2>
          <p className="text-xs text-steel-500 mb-6 font-mono">
            Create your first project to start embedding metadata
          </p>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 border border-brand-500
              text-white text-sm font-bold uppercase tracking-wider hover:bg-brand-500 
              transition-all shadow-glow-green"
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
              href={`/dashboard/projects/${project.id}`}
              className="block bg-steel-950 border border-steel-700/50 hover:border-brand-600/50 
                hover:shadow-glow-green transition-all group overflow-hidden rounded-lg"
            >
              {/* Cover Image - 4:3 aspect ratio with object-contain (no crop) */}
              <div className="relative w-full aspect-[4/3] bg-steel-900 overflow-hidden">
                {project.coverAssetId ? (
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <Image
                      src={assetsApi.getFileUrl(project.coverAssetId, 'thumbnail')}
                      alt={project.name}
                      fill
                      className="object-contain group-hover:scale-[1.02] transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-steel-600">
                    <ImageIcon className="h-10 w-10" />
                    <span className="text-[10px] uppercase tracking-wider font-mono">No cover yet</span>
                  </div>
                )}
              </div>
              
              {/* Content - separate section below image */}
              <div className="p-4 border-t border-steel-800/50">
                <h3 className="text-sm font-bold text-white mb-0.5 truncate">{project.name}</h3>
                <div className="flex items-center justify-between text-[10px] text-steel-600">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <ArrowRight className="h-3 w-3 group-hover:text-brand-400 transition-colors" />
                </div>
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
