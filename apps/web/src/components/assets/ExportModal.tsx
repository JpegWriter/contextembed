'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Camera, 
  Globe, 
  Archive, 
  Share2, 
  Users, 
  Settings,
  Loader2,
  Check,
  FileImage,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { exportsApi } from '@/lib/api';
import toast from 'react-hot-toast';

// Preset configurations matching backend
const PRESETS = [
  {
    id: 'lightroom-ready',
    name: 'Lightroom Ready',
    description: 'Optimized for Adobe Lightroom import with XMP sidecars',
    icon: Camera,
    recommended: true,
    tags: ['lightroom', 'professional'],
  },
  {
    id: 'archive-quality',
    name: 'Archive Quality',
    description: 'Maximum quality TIFF for long-term archival',
    icon: Archive,
    tags: ['archive', 'lossless'],
  },
  {
    id: 'client-delivery',
    name: 'Client Delivery',
    description: 'High quality JPEG for client handoff',
    icon: Users,
    tags: ['client', 'professional'],
  },
  {
    id: 'web-optimized',
    name: 'Web Optimized',
    description: 'Compressed JPEG for web use',
    icon: Globe,
    tags: ['web', 'small'],
  },
  {
    id: 'social-media',
    name: 'Social Media',
    description: 'Optimized for Instagram, Facebook',
    icon: Share2,
    tags: ['social', 'instagram'],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Customize all settings',
    icon: Settings,
    tags: ['custom'],
  },
] as const;

type PresetId = typeof PRESETS[number]['id'];

interface ExportOptions {
  format: 'original' | 'jpeg' | 'tiff' | 'png';
  colorProfile: 'sRGB' | 'AdobeRGB' | 'ProPhotoRGB' | 'original';
  jpegQuality: number;
  preserveResolution: boolean;
  maxDimension: number;
  metadataMethod: 'embed' | 'sidecar' | 'both';
  includeXmpSidecars: boolean;
  outputNaming: 'original' | 'headline' | 'title' | 'date-title' | 'sequence';
  includeManifest: boolean;
  zipOutput: boolean;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  assetIds: string[];
  assetCount: number;
  token: string;
}

export function ExportModal({ 
  isOpen, 
  onClose, 
  projectId, 
  assetIds, 
  assetCount,
  token 
}: ExportModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetId>('lightroom-ready');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  
  // Progress tracking
  const [progress, setProgress] = useState<{
    currentFile: number;
    totalFiles: number;
    currentFileName: string;
    stage: string;
    message: string;
  } | null>(null);
  
  const [options, setOptions] = useState<ExportOptions>({
    format: 'original',
    colorProfile: 'original',
    jpegQuality: 95,
    preserveResolution: true,
    maxDimension: 4096,
    metadataMethod: 'both',
    includeXmpSidecars: true,
    outputNaming: 'original',
    includeManifest: false,
    zipOutput: true,
  });

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPreset('lightroom-ready');
      setShowAdvanced(false);
      setExportResult(null);
      setProgress(null);
      setExporting(false);
    }
  }, [isOpen]);

  // Update options when preset changes
  useEffect(() => {
    switch (selectedPreset) {
      case 'lightroom-ready':
        setOptions({
          format: 'original',
          colorProfile: 'original',
          jpegQuality: 100,
          preserveResolution: true,
          maxDimension: 4096,
          metadataMethod: 'both',
          includeXmpSidecars: true,
          outputNaming: 'original',
          includeManifest: false,
          zipOutput: false,
        });
        break;
      case 'archive-quality':
        setOptions({
          format: 'tiff',
          colorProfile: 'ProPhotoRGB',
          jpegQuality: 100,
          preserveResolution: true,
          maxDimension: 10000,
          metadataMethod: 'embed',
          includeXmpSidecars: true,
          outputNaming: 'date-title',
          includeManifest: true,
          zipOutput: true,
        });
        break;
      case 'client-delivery':
        setOptions({
          format: 'jpeg',
          colorProfile: 'sRGB',
          jpegQuality: 95,
          preserveResolution: true,
          maxDimension: 4096,
          metadataMethod: 'embed',
          includeXmpSidecars: false,
          outputNaming: 'headline',
          includeManifest: true,
          zipOutput: true,
        });
        break;
      case 'web-optimized':
        setOptions({
          format: 'jpeg',
          colorProfile: 'sRGB',
          jpegQuality: 85,
          preserveResolution: false,
          maxDimension: 2048,
          metadataMethod: 'embed',
          includeXmpSidecars: false,
          outputNaming: 'headline',
          includeManifest: false,
          zipOutput: true,
        });
        break;
      case 'social-media':
        setOptions({
          format: 'jpeg',
          colorProfile: 'sRGB',
          jpegQuality: 90,
          preserveResolution: false,
          maxDimension: 1600,
          metadataMethod: 'embed',
          includeXmpSidecars: false,
          outputNaming: 'headline',
          includeManifest: false,
          zipOutput: true,
        });
        break;
      case 'custom':
        // Keep current options
        break;
    }
  }, [selectedPreset]);

  async function handleExport() {
    setExporting(true);
    setProgress(null);
    
    try {
      const result = await exportsApi.createAdvanced(token, {
        projectId,
        assetIds,
        preset: selectedPreset,
        options: selectedPreset === 'custom' ? options : undefined,
      });
      
      // Connect to SSE for progress updates during processing
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const eventSource = new EventSource(`${API_URL}/exports/${result.export.id}/progress`);
      
      eventSource.onmessage = (event) => {
        try {
          const progressData = JSON.parse(event.data);
          setProgress({
            currentFile: progressData.currentFile,
            totalFiles: progressData.totalFiles,
            currentFileName: progressData.currentFileName,
            stage: progressData.stage,
            message: progressData.message,
          });
          
          if (progressData.status === 'completed' || progressData.status === 'failed') {
            eventSource.close();
          }
        } catch (e) {
          // Ignore parse errors
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
      };
      
      setExportResult(result.export);
      
      if (result.export.downloadUrl) {
        // Auto-download for ZIP exports
        window.open(exportsApi.download(result.export.id), '_blank');
        toast.success(`Export complete! ${result.export.successfulFiles} files exported.`);
      } else {
        toast.success(`Export complete! Files saved.`);
      }
    } catch (error) {
      toast.error('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-none w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600/20 rounded-none flex items-center justify-center">
              <Download className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Export Images</h2>
              <p className="text-xs text-gray-500">{assetCount} image{assetCount !== 1 ? 's' : ''} selected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-none transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {exportResult ? (
            /* Export Complete State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-900/30 border border-emerald-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Export Complete!</h3>
              <p className="text-gray-400 mb-4">
                {exportResult.successfulFiles} of {exportResult.totalFiles} files exported successfully
              </p>
              <div className="bg-gray-800/50 rounded-none p-4 text-left mb-6 max-w-sm mx-auto">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-gray-500">Format:</span>
                  <span className="text-gray-300">{exportResult.format}</span>
                  <span className="text-gray-500">Duration:</span>
                  <span className="text-gray-300">{(exportResult.durationMs / 1000).toFixed(1)}s</span>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-none hover:bg-gray-700 border border-gray-700"
                >
                  Close
                </button>
                {exportResult.downloadUrl && (
                  <button
                    onClick={() => window.open(exportsApi.download(exportResult.id), '_blank')}
                    className="px-4 py-2 bg-brand-600 text-white rounded-none hover:bg-brand-500 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Again
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Preset Selection */
            <>
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  Export Preset
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PRESETS.map(preset => {
                    const Icon = preset.icon;
                    const isSelected = selectedPreset === preset.id;
                    
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`relative p-4 rounded-none border text-left transition-all ${
                          isSelected
                            ? 'bg-brand-600/20 border-brand-500 ring-1 ring-brand-500/50'
                            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {'recommended' in preset && preset.recommended && (
                          <span className="absolute -top-2 -right-2 bg-brand-500 text-[10px] font-medium text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Best
                          </span>
                        )}
                        <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-brand-400' : 'text-gray-500'}`} />
                        <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">
                          {preset.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Summary */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-none p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-400">Export Settings</span>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    {showAdvanced ? 'Hide' : 'Customize'}
                    <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Format</span>
                    <div className="text-gray-200 font-medium">{options.format.toUpperCase()}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Quality</span>
                    <div className="text-gray-200 font-medium">
                      {options.format === 'jpeg' ? `${options.jpegQuality}%` : 'Lossless'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Metadata</span>
                    <div className="text-gray-200 font-medium capitalize">{options.metadataMethod}</div>
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="space-y-4 mb-4 p-4 bg-gray-800/20 rounded-none border border-gray-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Format
                      </label>
                      <select
                        value={options.format}
                        onChange={(e) => {
                          setOptions(o => ({ ...o, format: e.target.value as any }));
                          setSelectedPreset('custom');
                        }}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200"
                      >
                        <option value="original">Original</option>
                        <option value="jpeg">JPEG</option>
                        <option value="tiff">TIFF</option>
                        <option value="png">PNG</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Color Profile
                      </label>
                      <select
                        value={options.colorProfile}
                        onChange={(e) => {
                          setOptions(o => ({ ...o, colorProfile: e.target.value as any }));
                          setSelectedPreset('custom');
                        }}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200"
                      >
                        <option value="original">Original</option>
                        <option value="sRGB">sRGB</option>
                        <option value="AdobeRGB">Adobe RGB</option>
                        <option value="ProPhotoRGB">ProPhoto RGB</option>
                      </select>
                    </div>
                  </div>

                  {options.format === 'jpeg' && (
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                        JPEG Quality: {options.jpegQuality}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={options.jpegQuality}
                        onChange={(e) => {
                          setOptions(o => ({ ...o, jpegQuality: parseInt(e.target.value) }));
                          setSelectedPreset('custom');
                        }}
                        className="w-full accent-brand-500"
                      />
                      <div className="flex justify-between text-[10px] text-gray-600">
                        <span>50 (smaller)</span>
                        <span>100 (best)</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Metadata Method
                      </label>
                      <select
                        value={options.metadataMethod}
                        onChange={(e) => {
                          setOptions(o => ({ ...o, metadataMethod: e.target.value as any }));
                          setSelectedPreset('custom');
                        }}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200"
                      >
                        <option value="embed">Embed in file</option>
                        <option value="sidecar">XMP sidecar only</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                        File Naming
                      </label>
                      <select
                        value={options.outputNaming}
                        onChange={(e) => {
                          setOptions(o => ({ ...o, outputNaming: e.target.value as any }));
                          setSelectedPreset('custom');
                        }}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200"
                      >
                        <option value="original">Original filename</option>
                        <option value="headline">From headline</option>
                        <option value="title">From title</option>
                        <option value="date-title">Date + title</option>
                        <option value="sequence">Sequence (001, 002...)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeXmpSidecars}
                        onChange={(e) => {
                          setOptions(o => ({ ...o, includeXmpSidecars: e.target.checked }));
                          setSelectedPreset('custom');
                        }}
                        className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-xs text-gray-300">Include XMP sidecars</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeManifest}
                        onChange={(e) => {
                          setOptions(o => ({ ...o, includeManifest: e.target.checked }));
                          setSelectedPreset('custom');
                        }}
                        className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-xs text-gray-300">Include manifest.json</span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!exportResult && (
          <div className="border-t border-gray-800 bg-gray-900/50">
            {/* Progress Bar */}
            {exporting && progress && (
              <div className="px-6 py-3 border-b border-gray-800/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-400 truncate max-w-[200px]">
                    {progress.message || `Processing ${progress.currentFileName}...`}
                  </span>
                  <span className="text-brand-400">
                    {progress.currentFile}/{progress.totalFiles}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div 
                    className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${progress.totalFiles > 0 
                        ? (progress.currentFile / progress.totalFiles) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between px-6 py-4">
              <div className="text-xs text-gray-500">
                <FileImage className="w-4 h-4 inline mr-1" />
                {assetCount} image{assetCount !== 1 ? 's' : ''} • {PRESETS.find(p => p.id === selectedPreset)?.name}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={exporting}
                  className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-none hover:bg-gray-700 border border-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting || assetCount === 0}
                  className="px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-none hover:bg-brand-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
