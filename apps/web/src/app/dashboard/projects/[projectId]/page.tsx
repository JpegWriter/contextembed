'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Play,
  Download,
  RefreshCw,
  ArrowLeft,
  MessageSquarePlus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Settings,
  Filter,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { projectsApi, assetsApi, jobsApi, exportsApi, userProfileApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { AssetGrid, type Asset } from '@/components/assets/AssetGrid';
import { MetadataSidebar } from '@/components/assets/MetadataSidebar';
import { BatchContextModal, type BatchContextData } from '@/components/assets/BatchContextModal';
import { ExportModal } from '@/components/assets/ExportModal';
import { BatchUploadModal } from '@/components/assets/BatchUploadModal';

interface JobStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed' | 'approved';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { supabase } = useSupabase();

  const [project, setProject] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [detailAsset, setDetailAsset] = useState<any>(null);
  const [showBatchContext, setShowBatchContext] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportAssetIds, setExportAssetIds] = useState<string[]>([]);
  const [authToken, setAuthToken] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [batchUploadFiles, setBatchUploadFiles] = useState<File[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Embed confirmation (persisted per project in localStorage)
  const [embedConfirmed, setEmbedConfirmed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`ce_embed_confirmed_${projectId}`) === 'true';
  });

  const loadData = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session, redirect to login
        router.push('/login');
        return;
      }

      const [projectData, assetsData, statsData] = await Promise.all([
        projectsApi.get(session.access_token, projectId),
        assetsApi.list(session.access_token, projectId),
        jobsApi.stats(session.access_token, projectId),
      ]);

      // Fetch user profile once for quality signals (cached after first load)
      if (!userProfile) {
        try {
          const profileData = await userProfileApi.get(session.access_token);
          if (profileData?.profile) setUserProfile(profileData.profile);
        } catch { /* non-critical */ }
      }

      setProject(projectData.project);
      setAssets(prev => {
        const next = assetsData.assets;
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
      setJobStats(statsData.stats);
      
      // No per-project onboarding needed - user profile handles defaults
    } catch (error: any) {
      // On auth errors, redirect to login instead of retrying
      if (error?.message?.includes('token') || error?.message?.includes('Unauthorized') || error?.message?.includes('expired')) {
        router.push('/login');
        return;
      }
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase, router]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Close context dropdown on outside click
  useEffect(() => {
    if (!showContextMenu) return;
    const handleClick = () => setShowContextMenu(false);
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handleClick); };
  }, [showContextMenu]);

  // Load full asset details when selected
  useEffect(() => {
    async function loadAssetDetails() {
      if (!selectedAsset || !supabase) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const data = await assetsApi.get(session.access_token, selectedAsset.id);
        setDetailAsset(data.asset);
      } catch {
        toast.error('Failed to load asset details');
      }
    }
    
    loadAssetDetails();
  }, [selectedAsset, supabase]);

  // Threshold for showing batch upload modal
  const BATCH_UPLOAD_THRESHOLD = 10;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // For large uploads (>10 files), show the batch upload modal
    if (acceptedFiles.length > BATCH_UPLOAD_THRESHOLD) {
      setBatchUploadFiles(acceptedFiles);
      setShowBatchUpload(true);
      return;
    }

    // For small uploads, use direct upload
    setUploading(true);
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const result = await assetsApi.upload(session.access_token, projectId, acceptedFiles);
      
      if (result.failed?.length > 0) {
        toast.error(`${result.failed.length} files failed to upload`);
      }
      
      if (result.uploaded?.length > 0) {
        toast.success(`${result.uploaded.length} files uploaded`);
        loadData();
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [projectId, supabase, loadData]);

  // Upload function for batch modal
  const handleBatchUpload = useCallback(async (files: File[]) => {
    if (!supabase) throw new Error('Not authenticated');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    
    return assetsApi.upload(session.access_token, projectId, files);
  }, [supabase, projectId]);

  const handleBatchUploadComplete = useCallback(() => {
    loadData();
    toast.success('Upload complete!');
  }, [loadData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/tiff': ['.tif', '.tiff'], 'image/webp': ['.webp'] },
    maxSize: 50 * 1024 * 1024,
  });

  async function handleProcess() {
    let assetIds = Array.from(selectedIds);
    
    if (assetIds.length === 0) {
      const pendingAssets = assets.filter(a => 
        a.status === 'pending' || a.status === 'failed'
      );
      if (pendingAssets.length === 0) {
        toast.error('No assets to process');
        return;
      }
      assetIds = pendingAssets.map(a => a.id);
    }

    setProcessing(true);
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await assetsApi.process(session.access_token, projectId, assetIds);
      toast.success(`Processing ${assetIds.length} assets`);
      // Reset embed confirmation — user must re-confirm after new embed
      setEmbedConfirmed(false);
      localStorage.removeItem(`ce_embed_confirmed_${projectId}`);
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      toast.error('Failed to start processing');
    } finally {
      setProcessing(false);
    }
  }

  async function handleExport() {
    const completedAssets = assets.filter(a => 
      a.status === 'completed' || a.status === 'approved'
    );
    if (completedAssets.length === 0) {
      toast.error('No completed assets to export');
      return;
    }

    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const assetIds = selectedIds.size > 0 
        ? Array.from(selectedIds).filter(id => {
            const asset = assets.find(a => a.id === id);
            return asset?.status === 'completed' || asset?.status === 'approved';
          })
        : completedAssets.map(a => a.id);

      if (assetIds.length === 0) {
        toast.error('No completed assets selected');
        return;
      }

      // Open the export modal with options
      setExportAssetIds(assetIds);
      setAuthToken(session.access_token);
      setShowExportModal(true);
    } catch (error) {
      toast.error('Export failed');
    }
  }

  async function handleApprove(assetId: string) {
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await assetsApi.approve(session.access_token, assetId);
      toast.success('Asset approved');
      loadData();
    } catch {
      toast.error('Failed to approve asset');
    }
  }

  async function handleReprocess(assetId: string) {
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await assetsApi.process(session.access_token, projectId, [assetId]);
      toast.success('Reprocessing started');
      loadData();
    } catch {
      toast.error('Failed to reprocess');
    }
  }

  async function handleDownload(assetId: string) {
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const result = await exportsApi.create(session.access_token, projectId, [assetId]);
      window.open(exportsApi.download(result.export.id), '_blank');
    } catch {
      toast.error('Failed to download');
    }
  }

  async function handleUpdateComment(assetId: string, comment: string) {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await assetsApi.updateComment(session.access_token, assetId, comment);
    loadData();
  }

  async function handleBatchContext(data: BatchContextData) {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const ids = Array.from(selectedIds);
    // Store context and situational lock together
    const contextWithLock = data.situationalLock !== 'auto' 
      ? `[${data.situationalLock}] ${data.context}`
      : data.context;
    
    await Promise.all(
      ids.map(id => assetsApi.updateComment(session.access_token, id, contextWithLock))
    );
    toast.success(`Context applied to ${ids.length} assets`);
    setSelectedIds(new Set());
    loadData();
  }

  const filteredAssets = statusFilter === 'all' 
    ? assets 
    : assets.filter(a => a.status === statusFilter);

  const stats = {
    pending: assets.filter(a => a.status === 'pending').length,
    processing: assets.filter(a => a.status === 'processing').length,
    completed: assets.filter(a => a.status === 'completed').length,
    approved: assets.filter(a => a.status === 'approved').length,
    failed: assets.filter(a => a.status === 'failed').length,
  };

  // ── ABC Flow: derived state booleans ──
  const hasAssets = assets.length > 0;

  // Context is considered "present" if the asset has a userComment
  const assetsToCheck = selectedIds.size > 0
    ? assets.filter(a => selectedIds.has(a.id))
    : assets;
  const hasRequiredContext = hasAssets && assetsToCheck.length > 0 &&
    assetsToCheck.every(a => !!a.userComment);

  const embedReady = hasAssets && hasRequiredContext;
  const embedCompleted = (stats.completed + stats.approved) > 0;
  const exportReady = embedCompleted && embedConfirmed;

  // Determine current ABC step for guidance
  type FlowStep = 'upload' | 'context' | 'run' | 'confirm' | 'export';
  const currentStep: FlowStep = !hasAssets
    ? 'upload'
    : !hasRequiredContext
    ? 'context'
    : !embedCompleted
    ? 'run'
    : !embedConfirmed
    ? 'confirm'
    : 'export';

  // Dynamic button labels
  const runEmbedLabel = !hasAssets
    ? 'Run Embed (upload images first)'
    : !hasRequiredContext
    ? 'Run Embed (add context first)'
    : selectedIds.size > 0
    ? `Run Embed (${selectedIds.size})`
    : 'Run Embed';

  const exportLabel = !embedCompleted
    ? 'Export (run embed first)'
    : !embedConfirmed
    ? 'Export (confirm embed first)'
    : 'Export Images';

  function handleConfirmEmbed() {
    setEmbedConfirmed(true);
    localStorage.setItem(`ce_embed_confirmed_${projectId}`, 'true');
    toast.success('Embed confirmed — export unlocked');
  }

  // Open batch context modal for all assets (no selection required)
  function handleBatchContextAll() {
    setSelectedIds(new Set(assets.map(a => a.id)));
    setShowBatchContext(true);
    setShowContextMenu(false);
  }

  // Open batch context modal for selected assets only
  function handleBatchContextSelected() {
    setShowBatchContext(true);
    setShowContextMenu(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header - Compact, black */}
      <header className="bg-black border-b border-steel-700/50 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-3">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard"
                className="p-1.5 hover:bg-steel-800/60 transition-colors text-steel-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-sm font-bold text-white">{project?.name}</h1>
                <p className="text-xs text-steel-500 font-mono">{assets.length} assets</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href={`/dashboard/projects/${projectId}/settings`}
                className="p-1.5 hover:bg-steel-800/60 transition-colors text-steel-400 hover:text-white"
                title="Project Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
              
              <button
                onClick={() => loadData()}
                className="px-2 hover:bg-steel-800/60 transition-colors text-steel-400 hover:text-white"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-3 py-3">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border ${
              statusFilter === 'pending'
                ? 'bg-steel-800 text-white border-steel-500'
                : 'bg-black text-steel-400 border-steel-700/50 hover:border-steel-500 hover:text-steel-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{stats.pending} Pending</span>
          </button>
          
          <button
            onClick={() => setStatusFilter(statusFilter === 'processing' ? 'all' : 'processing')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border ${
              statusFilter === 'processing'
                ? 'bg-blue-950/50 text-blue-400 border-brand-500'
                : 'bg-black text-steel-400 border-steel-700/50 hover:border-steel-500 hover:text-steel-300'
            }`}
          >
            <Loader2 className={`w-3.5 h-3.5 ${stats.processing > 0 ? 'animate-spin' : ''}`} />
            <span>{stats.processing} Processing</span>
          </button>
          
          <button
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border ${
              statusFilter === 'completed'
                ? 'bg-brand-950/50 text-brand-400 border-brand-500'
                : 'bg-black text-steel-400 border-steel-700/50 hover:border-steel-500 hover:text-steel-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{stats.completed} Completed</span>
          </button>
          
          <button
            onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border ${
              statusFilter === 'approved'
                ? 'bg-green-950/50 text-green-400 border-green-500'
                : 'bg-black text-steel-400 border-steel-700/50 hover:border-steel-500 hover:text-steel-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{stats.approved} Approved</span>
          </button>
          
          <button
            onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border ${
              stats.failed === 0 ? 'hidden' : ''
            } ${
              statusFilter === 'failed'
                ? 'bg-red-950/50 text-red-400 border-red-500'
                : 'bg-black text-red-400/60 border-red-900/50 hover:border-red-500'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{stats.failed} Failed</span>
          </button>
        </div>

        {/* Action Buttons — ABC Flow */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-steel-700/50">
          {/* A → B → C: Run Embed */}
          <button
            onClick={handleProcess}
            disabled={processing || !embedReady}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-brand-600 border border-brand-500
              hover:bg-brand-500 text-white text-sm font-bold uppercase tracking-wider
              disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-green"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {runEmbedLabel}
          </button>

          {/* B: Add Context — visible when assets exist */}
          {hasAssets && (
            <div className="relative">
              <button
                onClick={() => setShowContextMenu(!showContextMenu)}
                className="flex items-center gap-2.5 px-5 py-2.5 bg-amber-700 border border-amber-600
                  hover:bg-amber-600 text-white text-sm font-bold uppercase tracking-wider transition-all"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Add Context
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showContextMenu && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-steel-900 border border-steel-700/50 shadow-xl min-w-[220px]">
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBatchContextSelected}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-steel-800 transition-colors"
                    >
                      Add to selected ({selectedIds.size})
                    </button>
                  )}
                  <button
                    onClick={handleBatchContextAll}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-steel-800 transition-colors"
                  >
                    Add to all ({assets.length})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* C: Export — disabled until embed confirmed */}
          <button
            onClick={handleExport}
            disabled={exporting || !exportReady}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-black hover:bg-steel-800
              text-white text-sm font-bold uppercase tracking-wider border border-steel-600
              disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exportLabel}
          </button>

          <button
            onClick={() => setStatusFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-steel-400 
              hover:text-white hover:bg-steel-800/60 transition-all ${statusFilter === 'all' ? 'hidden' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Clear Filter
          </button>
        </div>

        {/* Confirm Embed Callout — shows between embed completion and confirmation */}
        {embedCompleted && !embedConfirmed && (
          <div className="mb-4 border border-brand-700/50 bg-brand-950/30 p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-brand-400 uppercase tracking-wider">Step C — Confirm Embed</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Quick check: previews look right? Confirm to unlock export.
              </p>
            </div>
            <button
              onClick={handleConfirmEmbed}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 border border-brand-500
                hover:bg-brand-500 text-white text-sm font-bold uppercase tracking-wider
                transition-all shadow-glow-green"
            >
              <ShieldCheck className="w-4 h-4" />
              Confirm Embed
            </button>
          </div>
        )}

        {/* Upload Zone — Step A */}
        <div
          {...getRootProps()}
          className={`
            mb-3 border border-dashed p-4 text-center cursor-pointer
            transition-all duration-75
            ${isDragActive 
              ? 'border-brand-500 bg-brand-950/20' 
              : 'border-steel-700/50 hover:border-steel-500 bg-black'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin mb-2" />
            ) : (
              <Upload className="w-6 h-6 text-steel-500 mb-2" />
            )}
            <p className="text-sm font-bold text-steel-300 uppercase tracking-wider">
              {isDragActive ? 'Drop files' : currentStep === 'upload' ? 'Step A — Upload Images' : 'Drop more images or click'}
            </p>
            <p className="text-xs text-steel-500 mt-0.5 font-mono">
              JPG, PNG, TIFF, WebP up to 50MB
            </p>
          </div>
        </div>

        {/* Step Guidance — contextual message above grid */}
        {hasAssets && currentStep === 'context' && (
          <div className="mb-3 border border-amber-700/50 bg-amber-950/20 p-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Step B — Add Context</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedIds.size > 0
                ? `${assetsToCheck.filter(a => !a.userComment).length} of ${assetsToCheck.length} selected images still need context.`
                : `${assets.filter(a => !a.userComment).length} of ${assets.length} images still need context.`
              }{' '}Use "Add Context" above to apply to selected or all images.
            </p>
          </div>
        )}
        {hasAssets && currentStep === 'run' && (
          <div className="mb-3 border border-brand-700/50 bg-brand-950/20 p-3">
            <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider">Step C — Run Embed</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Ready when you are. Hit "Run Embed" to write ContextEmbed metadata into your images.
            </p>
          </div>
        )}
        {exportReady && (
          <div className="mb-3 border border-green-700/50 bg-green-950/20 p-3">
            <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider">Export Ready</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Your embedded images are ready. Hit "Export Images" to download.
            </p>
          </div>
        )}

        {/* Asset Grid */}
        <AssetGrid
          assets={filteredAssets}
          selectedIds={selectedIds}
          onSelect={(id: string, selected: boolean) => {
            const next = new Set(selectedIds);
            if (selected) next.add(id);
            else next.delete(id);
            setSelectedIds(next);
          }}
          onSelectAll={(selected: boolean) => {
            if (selected) {
              setSelectedIds(new Set(filteredAssets.map(a => a.id)));
            } else {
              setSelectedIds(new Set());
            }
          }}
          onAssetClick={(asset: Asset) => setSelectedAsset(asset)}
          onAddContext={(asset: Asset) => {
            setSelectedIds(new Set([asset.id]));
            setShowBatchContext(true);
          }}
        />
      </main>

      {/* Detail Panel - Inspector style */}
      {selectedAsset && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => {
              setSelectedAsset(null);
              setDetailAsset(null);
            }}
          />
          <MetadataSidebar
            asset={detailAsset}
            projectId={projectId}
            onboarding={userProfile ? {
              brandName: userProfile.businessName,
              industry: userProfile.industry,
              niche: userProfile.niche,
              yearsExperience: userProfile.yearsExperience ? parseInt(userProfile.yearsExperience) : undefined,
              credentials: userProfile.credentials?.split(',').map((s: string) => s.trim()).filter(Boolean),
              specializations: userProfile.specializations?.split(',').map((s: string) => s.trim()).filter(Boolean),
              serviceArea: userProfile.serviceArea?.split(',').map((s: string) => s.trim()).filter(Boolean),
              creatorName: userProfile.creatorName,
              website: userProfile.website,
            } : undefined}
            onClose={() => {
              setSelectedAsset(null);
              setDetailAsset(null);
            }}
            onApprove={handleApprove}
            onReprocess={handleReprocess}
            onDownload={handleDownload}
            onUpdateComment={handleUpdateComment}
          />
        </>
      )}

      {/* Batch Context Modal */}
      <BatchContextModal
        isOpen={showBatchContext}
        selectedCount={selectedIds.size}
        onClose={() => setShowBatchContext(false)}
        onApply={handleBatchContext}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectId={projectId}
        assetIds={exportAssetIds}
        assetCount={exportAssetIds.length}
        token={authToken}
      />

      {/* Batch Upload Modal */}
      <BatchUploadModal
        isOpen={showBatchUpload}
        onClose={() => {
          setShowBatchUpload(false);
          setBatchUploadFiles([]);
        }}
        files={batchUploadFiles}
        onUploadComplete={handleBatchUploadComplete}
        uploadFn={handleBatchUpload}
      />
    </div>
  );
}
