'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Upload, Database, CheckCircle2, XCircle, 
  Loader2, AlertCircle, Shield, FileImage
} from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import { survivalLabApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface MetadataReport {
  exifPresent: boolean;
  xmpPresent: boolean;
  iptcPresent: boolean;
  creatorValue: string | null;
  rightsValue: string | null;
  creditValue: string | null;
  descriptionValue: string | null;
  encodingOk: boolean;
  notes: string | null;
}

interface Baseline {
  id: string;
  label: string;
  originalFilename: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  createdAt: string;
  metadataReport: MetadataReport | null;
}

export default function BaselinesPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!supabase) return;
    loadBaselines();
  }, [supabase]);

  async function loadBaselines() {
    try {
      setLoading(true);
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const result = await survivalLabApi.listBaselines(session.access_token);
      setBaselines(result.baselines || []);
    } catch (error) {
      console.error('Failed to load baselines:', error);
      toast.error('Failed to load baselines');
    } finally {
      setLoading(false);
    }
  }

  async function uploadBaseline() {
    if (!selectedFile || !uploadLabel.trim()) {
      toast.error('Please select a file and enter a label');
      return;
    }
    
    try {
      setUploading(true);
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      await survivalLabApi.uploadBaseline(
        session.access_token,
        selectedFile,
        uploadLabel.trim()
      );
      
      toast.success('Baseline uploaded successfully!');
      setShowUploadModal(false);
      setUploadLabel('');
      setSelectedFile(null);
      await loadBaselines();
    } catch (error: any) {
      console.error('Failed to upload baseline:', error);
      toast.error(error.message || 'Failed to upload baseline');
    } finally {
      setUploading(false);
    }
  }

  async function verifyIntegrity(id: string) {
    try {
      setVerifying(id);
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const result = await survivalLabApi.verifyBaseline(session.access_token, id);
      
      if (result.integrityOk) {
        toast.success('Integrity verified! SHA256 matches.');
      } else {
        toast.error('INTEGRITY FAILURE: File has been modified!');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error('Verification failed');
    } finally {
      setVerifying(null);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/survival-lab"
            className="p-2 hover:bg-steel-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-steel-400" />
          </Link>
          <Database className="h-6 w-6 text-brand-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Baseline Images</h1>
            <p className="text-sm text-steel-500">
              CE-embedded originals for comparison testing
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 border border-brand-500
            text-white text-sm font-bold hover:bg-brand-500 transition-all shadow-glow-green"
        >
          <Upload className="w-4 h-4" />
          Upload Baseline
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-steel-900/50 border border-steel-700/50 p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-steel-400">
            <p className="font-medium text-white mb-1">Upload CE-Embedded Images</p>
            <p>
              Upload images that have been processed through ContextEmbed with full metadata.
              These will serve as the "ground truth" for comparing against platform downloads.
              Files are stored as raw binary - no transformation occurs.
            </p>
          </div>
        </div>
      </div>

      {/* Baselines List */}
      {baselines.length === 0 ? (
        <div className="bg-steel-900/50 border border-steel-700/50 p-8 text-center">
          <FileImage className="h-10 w-10 text-steel-600 mx-auto mb-3" />
          <p className="text-sm text-steel-400 mb-4">
            No baseline images yet. Upload CE-embedded images to use as comparison references.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 border border-brand-500
              text-white text-sm font-bold hover:bg-brand-500 transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload First Baseline
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {baselines.map(baseline => {
            const report = baseline.metadataReport;
            return (
              <div
                key={baseline.id}
                className="bg-steel-900/50 border border-steel-700/50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-brand-400">{baseline.label}</span>
                      <span className="text-xs text-steel-500">{baseline.originalFilename}</span>
                    </div>
                    <p className="text-xs text-steel-500 mb-2">
                      {baseline.width} × {baseline.height} • {formatBytes(baseline.bytes)}
                    </p>
                    
                    {/* Metadata Badges */}
                    {report && (
                      <div className="flex flex-wrap gap-2">
                        <MetaBadge label="EXIF" present={report.exifPresent} />
                        <MetaBadge label="XMP" present={report.xmpPresent} />
                        <MetaBadge label="IPTC" present={report.iptcPresent} />
                        {!report.encodingOk && (
                          <span className="px-2 py-0.5 bg-red-900/50 text-red-400 text-[10px] uppercase">
                            Encoding Issue
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Extracted Values */}
                    {report && (report.creatorValue || report.rightsValue) && (
                      <div className="mt-2 text-xs text-steel-500">
                        {report.creatorValue && <span>Creator: {report.creatorValue}</span>}
                        {report.creatorValue && report.rightsValue && <span> • </span>}
                        {report.rightsValue && <span>Rights: {report.rightsValue}</span>}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => verifyIntegrity(baseline.id)}
                    disabled={verifying === baseline.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-steel-800 border border-steel-700
                      text-steel-300 text-xs font-medium hover:bg-steel-700 transition-all disabled:opacity-50"
                  >
                    {verifying === baseline.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Shield className="w-3 h-3" />
                    )}
                    Verify
                  </button>
                </div>
                
                <div className="mt-2 pt-2 border-t border-steel-800">
                  <p className="text-[10px] text-steel-600 font-mono">
                    SHA256: {baseline.sha256}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-steel-900 border border-steel-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Upload Baseline Image</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-steel-400 uppercase mb-1">Label</label>
                <input
                  type="text"
                  value={uploadLabel}
                  onChange={(e) => setUploadLabel(e.target.value)}
                  placeholder="e.g., CE_TEST_01"
                  className="w-full bg-black border border-steel-700 text-white px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs text-steel-400 uppercase mb-1">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-black border border-steel-700 text-steel-400 px-3 py-4 text-sm
                    hover:border-brand-600 transition-colors"
                >
                  {selectedFile ? (
                    <span className="text-white">{selectedFile.name}</span>
                  ) : (
                    <span>Click to select image...</span>
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadLabel('');
                  setSelectedFile(null);
                }}
                className="flex-1 px-4 py-2 bg-steel-800 border border-steel-700 text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={uploadBaseline}
                disabled={uploading || !selectedFile || !uploadLabel.trim()}
                className="flex-1 px-4 py-2 bg-brand-600 border border-brand-500 text-white text-sm font-bold
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaBadge({ label, present }: { label: string; present: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-medium
      ${present 
        ? 'bg-green-900/50 text-green-400' 
        : 'bg-steel-800 text-steel-500'
      }`}
    >
      {present ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {label}
    </span>
  );
}
