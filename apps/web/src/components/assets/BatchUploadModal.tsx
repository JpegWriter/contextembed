'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  X, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Image as ImageIcon,
  AlertCircle,
  Pause,
  Play,
  Trash2,
  Clock,
} from 'lucide-react';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
}

interface BatchUploadStats {
  total: number;
  pending: number;
  uploading: number;
  success: number;
  error: number;
  currentBatch: number;
  totalBatches: number;
}

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onUploadComplete: () => void;
  uploadFn: (files: File[]) => Promise<{ uploaded?: any[]; failed?: any[] }>;
  batchSize?: number;
}

const BATCH_SIZE = 10; // Match backend limit

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function BatchUploadModal({
  isOpen,
  onClose,
  files,
  onUploadComplete,
  uploadFn,
  batchSize = BATCH_SIZE,
}: BatchUploadModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Initialize files when modal opens
  useEffect(() => {
    if (isOpen && files.length > 0) {
      setUploadFiles(
        files.map((file, index) => ({
          id: `${index}-${file.name}-${Date.now()}`,
          file,
          status: 'pending',
        }))
      );
      setCurrentBatchIndex(0);
      setIsUploading(false);
      setIsPaused(false);
    }
  }, [isOpen, files]);

  // Calculate stats
  const stats: BatchUploadStats = {
    total: uploadFiles.length,
    pending: uploadFiles.filter(f => f.status === 'pending').length,
    uploading: uploadFiles.filter(f => f.status === 'uploading').length,
    success: uploadFiles.filter(f => f.status === 'success').length,
    error: uploadFiles.filter(f => f.status === 'error').length,
    currentBatch: currentBatchIndex + 1,
    totalBatches: Math.ceil(uploadFiles.length / batchSize),
  };

  const overallProgress = stats.total > 0 
    ? Math.round(((stats.success + stats.error) / stats.total) * 100) 
    : 0;

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const uploadedSize = uploadFiles
    .filter(f => f.status === 'success')
    .reduce((acc, f) => acc + f.file.size, 0);

  // Upload a single batch
  const uploadBatch = useCallback(async (batchFiles: UploadFile[]) => {
    // Mark batch as uploading
    setUploadFiles(prev => 
      prev.map(f => 
        batchFiles.some(bf => bf.id === f.id) 
          ? { ...f, status: 'uploading' as const } 
          : f
      )
    );

    try {
      const result = await uploadFn(batchFiles.map(f => f.file));
      
      // Mark successful uploads
      const uploadedNames = new Set(result.uploaded?.map(u => u.filename) || []);
      const failedNames = new Map(
        result.failed?.map(f => [f.filename, f.reason]) || []
      );

      setUploadFiles(prev =>
        prev.map(f => {
          if (!batchFiles.some(bf => bf.id === f.id)) return f;
          
          if (uploadedNames.has(f.file.name)) {
            return { ...f, status: 'success' as const };
          } else if (failedNames.has(f.file.name)) {
            return { 
              ...f, 
              status: 'error' as const, 
              error: failedNames.get(f.file.name) || 'Upload failed' 
            };
          } else {
            // Assume success if not in failed list
            return { ...f, status: 'success' as const };
          }
        })
      );

      return { success: true };
    } catch (error: any) {
      // Mark entire batch as failed
      setUploadFiles(prev =>
        prev.map(f =>
          batchFiles.some(bf => bf.id === f.id)
            ? { ...f, status: 'error' as const, error: error.message || 'Upload failed' }
            : f
        )
      );
      return { success: false, error: error.message };
    }
  }, [uploadFn]);

  // Start/resume upload
  const startUpload = useCallback(async () => {
    setIsUploading(true);
    setIsPaused(false);

    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    const batches: UploadFile[][] = [];
    
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      batches.push(pendingFiles.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      // Check if paused or aborted
      if (isPaused) break;
      
      setCurrentBatchIndex(i);
      await uploadBatch(batches[i]);
      
      // Small delay between batches to avoid overwhelming the server
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsUploading(false);
    
    // Check if all complete
    const finalStats = {
      success: uploadFiles.filter(f => f.status === 'success').length,
      error: uploadFiles.filter(f => f.status === 'error').length,
    };
    
    if (finalStats.success > 0 || finalStats.error > 0) {
      onUploadComplete();
    }
  }, [uploadFiles, batchSize, isPaused, uploadBatch, onUploadComplete]);

  const pauseUpload = () => {
    setIsPaused(true);
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const retryFailed = () => {
    setUploadFiles(prev =>
      prev.map(f => 
        f.status === 'error' ? { ...f, status: 'pending' as const, error: undefined } : f
      )
    );
  };

  const handleClose = () => {
    if (isUploading) {
      setIsPaused(true);
    }
    onClose();
  };

  if (!isOpen) return null;

  const isComplete = stats.pending === 0 && stats.uploading === 0;
  const hasErrors = stats.error > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Upload className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Batch Upload</h2>
              <p className="text-sm text-zinc-400">
                {stats.total} images • {formatBytes(totalSize)}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Overview */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">
              {isUploading ? (
                <>Uploading batch {stats.currentBatch} of {stats.totalBatches}...</>
              ) : isComplete ? (
                <>Upload complete</>
              ) : (
                <>Ready to upload {stats.total} images</>
              )}
            </span>
            <span className="text-sm font-medium text-white">
              {overallProgress}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                hasErrors ? 'bg-gradient-to-r from-cyan-500 to-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          
          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{stats.pending} pending</span>
            </div>
            {stats.uploading > 0 && (
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{stats.uploading} uploading</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{stats.success} complete</span>
            </div>
            {stats.error > 0 && (
              <div className="flex items-center gap-1.5 text-red-400">
                <XCircle className="w-3.5 h-3.5" />
                <span>{stats.error} failed</span>
              </div>
            )}
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {uploadFiles.map((uploadFile) => (
            <div 
              key={uploadFile.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                uploadFile.status === 'uploading' ? 'bg-cyan-500/10 border border-cyan-500/30' :
                uploadFile.status === 'success' ? 'bg-emerald-500/10' :
                uploadFile.status === 'error' ? 'bg-red-500/10' :
                'bg-zinc-800/50'
              }`}
            >
              {/* Thumbnail placeholder */}
              <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-5 h-5 text-zinc-500" />
              </div>
              
              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{uploadFile.file.name}</p>
                <p className="text-xs text-zinc-500">{formatBytes(uploadFile.file.size)}</p>
              </div>
              
              {/* Status icon */}
              <div className="flex-shrink-0">
                {uploadFile.status === 'pending' && (
                  <button 
                    onClick={() => removeFile(uploadFile.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {uploadFile.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                )}
                {uploadFile.status === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                {uploadFile.status === 'error' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400 max-w-[150px] truncate" title={uploadFile.error}>
                      {uploadFile.error}
                    </span>
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-700 flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            {isComplete ? (
              <span className="text-emerald-400">
                {stats.success} images uploaded successfully
                {stats.error > 0 && `, ${stats.error} failed`}
              </span>
            ) : (
              <span>
                Images will be uploaded in batches of {batchSize}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {hasErrors && !isUploading && (
              <button
                onClick={retryFailed}
                className="px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
              >
                Retry Failed
              </button>
            )}
            
            {isComplete ? (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors"
              >
                Done
              </button>
            ) : isUploading ? (
              <button
                onClick={pauseUpload}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            ) : (
              <button
                onClick={startUpload}
                disabled={stats.pending === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Start Upload
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
