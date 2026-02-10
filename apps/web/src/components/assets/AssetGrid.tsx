'use client';

import { useState, useMemo } from 'react';
import { 
  Clock, 
  Loader2, 
  Eye,
  MessageSquarePlus,
  CheckCircle2,
  XCircle,
  Grid3X3,
  LayoutList,
  Check,
  Award,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Bot,
} from 'lucide-react';
import { assetsApi } from '@/lib/api';
import { calculateMetadataStrength, type MetadataQualityData } from './MetadataQuality';

export interface AssetMetadata {
  headline?: string;
  description?: string;
  keywords?: string[];
  creator?: string;
  copyright?: string;
  credit?: string;
  city?: string;
  country?: string;
}

export interface Asset {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  status: 'pending' | 'processing' | 'analyzing' | 'completed' | 'failed' | 'approved';
  thumbnailPath: string;
  width?: number;
  height?: number;
  userComment?: string;
  createdAt: string;
  metadata?: AssetMetadata;
  jobError?: string;
  authorshipStatus?: 'VERIFIED_ORIGINAL' | 'DECLARED_BY_USER' | 'UNVERIFIED' | 'SYNTHETIC_AI';
  needsDeclaration?: boolean;
}

interface AssetGridProps {
  assets: Asset[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onAssetClick: (asset: Asset) => void;
  onAddContext: (asset: Asset) => void;
}

const statusConfig = {
  pending: { 
    icon: Clock, 
    bg: 'bg-gray-600', 
    text: 'PND',
    textFull: 'Pending',
    animate: false
  },
  processing: { 
    icon: Loader2, 
    bg: 'bg-blue-600', 
    text: 'RUN',
    textFull: 'Processing',
    animate: true
  },
  analyzing: { 
    icon: Loader2, 
    bg: 'bg-cyan-600', 
    text: 'AI',
    textFull: 'Analyzing',
    animate: true
  },
  completed: { 
    icon: CheckCircle2, 
    bg: 'bg-emerald-600', 
    text: 'OK',
    textFull: 'Completed',
    animate: false
  },
  approved: { 
    icon: Check, 
    bg: 'bg-green-600', 
    text: '✓',
    textFull: 'Approved',
    animate: false
  },
  failed: { 
    icon: XCircle, 
    bg: 'bg-red-600', 
    text: 'ERR',
    textFull: 'Failed',
    animate: false
  },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function AssetGrid({ 
  assets, 
  selectedIds, 
  onSelect, 
  onSelectAll,
  onAssetClick,
  onAddContext,
}: AssetGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'filmstrip'>('grid');
  const allSelected = assets.length > 0 && assets.every(a => selectedIds.has(a.id));
  const someSelected = assets.some(a => selectedIds.has(a.id));

  return (
    <div>
      {/* Toolbar - Compact Pro Style */}
      <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-gray-700">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="w-4 h-4 rounded-sm border-gray-500 bg-gray-800 text-cyan-500 
              focus:ring-cyan-500 focus:ring-offset-0"
          />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {selectedIds.size > 0 ? `${selectedIds.size} sel` : 'All'}
          </span>
        </label>

        {/* View toggle */}
        <div className="flex items-center border border-gray-700 rounded overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('filmstrip')}
            className={`p-1.5 transition-colors ${viewMode === 'filmstrip' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            title="Filmstrip view"
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid - Tight spacing, sharp edges */}
      <div className={`grid gap-1.5 ${
        viewMode === 'grid' 
          ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8' 
          : 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12'
      }`}>
        {assets.map((asset) => {
          const status = statusConfig[asset.status] || statusConfig.pending;
          const StatusIcon = status.icon;
          const isSelected = selectedIds.has(asset.id);
          const hasContext = !!asset.userComment;
          const isCompleted = asset.status === 'completed' || asset.status === 'approved';
          
          // Calculate metadata strength for completed assets
          const qualityData: MetadataQualityData | undefined = asset.metadata ? {
            descriptive: {
              headline: asset.metadata.headline,
              description: asset.metadata.description,
              keywords: asset.metadata.keywords,
            },
            attribution: {
              creator: asset.metadata.creator,
              copyrightNotice: asset.metadata.copyright,
              creditLine: asset.metadata.credit,
            },
            location: {
              city: asset.metadata.city,
              country: asset.metadata.country,
              locationMode: asset.metadata.city ? 'fromProfile' : 'none',
            },
          } : undefined;
          
          const strength = isCompleted && qualityData 
            ? calculateMetadataStrength(qualityData) 
            : null;

          return (
            <div
              key={asset.id}
              className={`
                group relative bg-gray-900 border overflow-hidden rounded
                transition-all duration-75 cursor-pointer
                ${isSelected 
                  ? 'border-cyan-500 ring-1 ring-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                  : 'border-gray-700 hover:border-gray-500'}
              `}
            >
              {/* Checkbox - top left */}
              <div className="absolute top-1 left-1 z-20">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelect(asset.id, e.target.checked);
                  }}
                  className="w-3.5 h-3.5 rounded-sm border-gray-500 bg-gray-900/90 
                    text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                />
              </div>

              {/* Status Badge - top right, compact */}
              <div className={`absolute top-1 right-1 z-20 ${status.bg} text-white 
                px-1 py-0.5 rounded text-[9px] font-bold tracking-wide flex items-center gap-0.5`}>
                <StatusIcon className={`w-2.5 h-2.5 ${status.animate ? 'animate-spin' : ''}`} />
                <span>{status.text}</span>
              </div>

              {/* Metadata Strength Badge - bottom right for completed */}
              {strength && (
                <div 
                  className={`absolute bottom-6 right-1 z-20 px-1 py-0.5 rounded text-[8px] 
                    font-bold uppercase tracking-wider flex items-center gap-0.5 ${
                    strength.strength === 'excellent' 
                      ? 'bg-green-900/80 text-green-400 border border-green-700/50' 
                      : strength.strength === 'good' 
                      ? 'bg-amber-900/80 text-amber-400 border border-amber-700/50' 
                      : 'bg-red-900/80 text-red-400 border border-red-700/50'
                  }`}
                  title={`Metadata: ${strength.strength} (${strength.score}/5)`}
                >
                  {strength.strength === 'excellent' ? (
                    <Award className="w-2.5 h-2.5" />
                  ) : strength.strength === 'good' ? (
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  ) : (
                    <AlertTriangle className="w-2.5 h-2.5" />
                  )}
                </div>
              )}

              {/* Context Indicator - bottom left */}
              {hasContext && (
                <div className="absolute bottom-6 left-1 z-20 bg-amber-600 text-white 
                  p-0.5 rounded" title="Has context">
                  <MessageSquarePlus className="w-2.5 h-2.5" />
                </div>
              )}

              {/* Authorship Status Badge - bottom left (above context) */}
              {asset.authorshipStatus && (
                <div 
                  className={`absolute ${hasContext ? 'bottom-11' : 'bottom-6'} left-1 z-20 
                    px-1 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5 ${
                    asset.authorshipStatus === 'VERIFIED_ORIGINAL'
                      ? 'bg-emerald-900/80 text-emerald-400 border border-emerald-700/50'
                      : asset.authorshipStatus === 'DECLARED_BY_USER'
                      ? 'bg-blue-900/80 text-blue-400 border border-blue-700/50'
                      : asset.authorshipStatus === 'SYNTHETIC_AI'
                      ? 'bg-purple-900/80 text-purple-400 border border-purple-700/50'
                      : 'bg-gray-800/80 text-gray-400 border border-gray-600/50'
                  }`}
                  title={{
                    VERIFIED_ORIGINAL: 'Verified Original — EXIF matches user profile',
                    DECLARED_BY_USER: 'Declared by User — not machine-verified',
                    UNVERIFIED: 'Unverified — no authorship claims permitted',
                    SYNTHETIC_AI: 'AI-Generated — synthetic content detected',
                  }[asset.authorshipStatus]}
                >
                  {asset.authorshipStatus === 'VERIFIED_ORIGINAL' ? (
                    <ShieldCheck className="w-2.5 h-2.5" />
                  ) : asset.authorshipStatus === 'DECLARED_BY_USER' ? (
                    <Shield className="w-2.5 h-2.5" />
                  ) : asset.authorshipStatus === 'SYNTHETIC_AI' ? (
                    <Bot className="w-2.5 h-2.5" />
                  ) : (
                    <ShieldAlert className="w-2.5 h-2.5" />
                  )}
                </div>
              )}

              {/* Image */}
              <div 
                className={`${viewMode === 'grid' ? 'aspect-square' : 'aspect-[4/3]'} relative overflow-hidden`}
                onClick={() => onAssetClick(asset)}
              >
                {asset.thumbnailPath ? (
                  <img
                    src={assetsApi.getFileUrl(asset.id, 'thumbnail')}
                    alt={asset.originalFilename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                  </div>
                )}

                {/* Processing Overlay - Shows during pending/processing/analyzing */}
                {(asset.status === 'pending' || asset.status === 'processing' || asset.status === 'analyzing') && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                    <div className="relative">
                      {/* Outer ring animation */}
                      <div className="w-10 h-10 border-2 border-cyan-500/30 rounded-full absolute animate-ping" />
                      {/* Spinning loader */}
                      <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                    </div>
                    <span className="text-[10px] text-cyan-300 mt-2 font-medium uppercase tracking-wider">
                      {asset.status === 'pending' ? 'Queued' : asset.status === 'analyzing' ? 'AI Analyzing' : 'Processing'}
                    </span>
                  </div>
                )}

                {/* Failed Overlay - Shows error message */}
                {asset.status === 'failed' && (
                  <div className="absolute inset-0 bg-red-950/60 flex flex-col items-center justify-center z-10 p-2">
                    <XCircle className="w-6 h-6 text-red-400 mb-1" />
                    {asset.jobError && (
                      <p className="text-[8px] text-red-300 text-center leading-tight line-clamp-3" title={asset.jobError}>
                        {asset.jobError.length > 80 ? asset.jobError.slice(0, 80) + '...' : asset.jobError}
                      </p>
                    )}
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 
                  transition-all duration-75 flex items-center justify-center opacity-0 
                  group-hover:opacity-100">
                  <Eye className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Footer - compact info bar */}
              <div className="px-1 py-0.5 bg-gray-900/95 border-t border-gray-800">
                <p className="text-[9px] text-gray-300 truncate font-mono leading-tight" 
                  title={asset.originalFilename}>
                  {asset.originalFilename}
                </p>
                <div className="flex items-center justify-between text-[8px] text-gray-500 leading-tight">
                  <span className="font-mono">{formatFileSize(asset.size)}</span>
                  <span className="uppercase font-medium">{status.textFull}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm font-medium">No assets. Drop images to begin.</p>
        </div>
      )}
    </div>
  );
}
