'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Folder, Clock, ArrowRight, Loader2, ImageIcon, BadgeCheck, Trash2, MoreVertical } from 'lucide-react';
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
  totalAssets?: number;
  embeddedCount?: number;
  isVerified?: boolean;
}

export default function DashboardPage() {
  const { supabase, user } = useSupabase();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

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

  async function handleDeleteProject(projectId: string) {
    try {
      if (!supabase) return;
      setDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await projectsApi.delete(session.access_token, projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setDeleteConfirm(null);
      setOpenMenu(null);
      toast.success('Project deleted');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    } finally {
      setDeleting(false);
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
          className="flex items-center gap-2 px-5 py-2.5
            text-white text-sm font-bold uppercase tracking-wider 
            transition-all btn-gradient-border"
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
            className="inline-flex items-center gap-2 px-5 py-2.5
              text-white text-sm font-bold uppercase tracking-wider 
              transition-all btn-gradient-border"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {projects.map(project => (
            <div
              key={project.id}
              className="relative bg-steel-950 border border-steel-700/50 hover:border-brand-600/50 
                hover:shadow-glow-green transition-all group overflow-hidden rounded-lg"
            >
              {/* Three-dot menu */}
              <div className="absolute top-1.5 left-1.5 z-10">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenu(openMenu === project.id ? null : project.id);
                  }}
                  className="w-6 h-6 flex items-center justify-center bg-black/70 hover:bg-black text-steel-400 hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
                {openMenu === project.id && (
                  <div className="absolute top-7 left-0 bg-steel-800 border border-steel-600 py-1 shadow-xl z-50 min-w-[120px]">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteConfirm(project.id);
                        setOpenMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-red-400 hover:bg-steel-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <Link
                href={`/dashboard/projects/${project.id}`}
                className="block"
              >
              {/* Cover Image - smaller 4:3 aspect ratio */}
              <div className="relative w-full aspect-[4/3] bg-steel-900 overflow-hidden">
                {project.coverAssetId ? (
                  <div className="absolute inset-0 flex items-center justify-center p-1">
                    <Image
                      src={assetsApi.getFileUrl(project.coverAssetId, 'thumbnail')}
                      alt={project.name}
                      fill
                      className="object-contain group-hover:scale-[1.02] transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-steel-600">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-[9px] uppercase tracking-wider font-mono">No cover yet</span>
                  </div>
                )}
                
                {/* Verified Badge - top right corner */}
                {project.isVerified && (
                  <div className="absolute top-1.5 right-1.5 bg-emerald-500/90 rounded-full p-1 shadow-lg">
                    <BadgeCheck className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
              
              {/* Content - compact section below image */}
              <div className="p-2.5 border-t border-steel-800/50">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="text-xs font-bold text-white truncate flex-1">{project.name}</h3>
                  {project.isVerified && (
                    <span className="text-[8px] px-1 py-0.5 bg-emerald-900/50 text-emerald-400 rounded uppercase font-mono shrink-0">
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[9px] text-steel-600 mt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <ArrowRight className="h-2.5 w-2.5 group-hover:text-brand-400 transition-colors" />
                </div>
              </div>
            </Link>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-steel-900 border border-steel-700 p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Delete Project</h3>
            <p className="text-xs text-steel-400 mb-1">
              Are you sure you want to delete <span className="text-white font-medium">{projects.find(p => p.id === deleteConfirm)?.name}</span>?
            </p>
            <p className="text-xs text-red-400 mb-6">
              This will permanently remove the project and all its assets. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-steel-800 border border-steel-700 text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
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
