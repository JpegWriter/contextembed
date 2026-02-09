'use client';

import { useState } from 'react';
import { 
  X, 
  Download, 
  RotateCcw, 
  Check,
  ChevronRight,
  Eye,
  FileText,
  Sparkles,
  AlertTriangle,
  Copy,
  Edit3,
  Save,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { assetsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface VisionAnalysis {
  subjects?: Array<{ type: string; description: string; prominence: string }>;
  scene?: { type: string; setting: string; timeOfDay?: string };
  mood?: string[];
  style?: string;
  objects?: string[];
  textContent?: Array<{ text: string; type: string }>;
  colors?: { dominant: string[]; palette?: string[] };
  composition?: string;
  naturalDescription?: string;
}

interface SynthesizedMetadata {
  headline?: string;
  description?: string;
  keywords?: string[];
  title?: string;
  creator?: string;
  copyright?: string;
  credit?: string;
  city?: string;
  state?: string;
  country?: string;
  confidence?: Record<string, number>;
  reasoning?: Record<string, string>;
}

// Database record wrappers
interface VisionResultRecord {
  id: string;
  modelId: string;
  result: VisionAnalysis;
  createdAt: string;
}

interface MetadataResultRecord {
  id: string;
  modelId: string;
  result: SynthesizedMetadata;
  createdAt: string;
}

interface AssetDetailPanelProps {
  asset: {
    id: string;
    originalFilename: string;
    mimeType: string;
    size: number;
    status: string;
    width?: number;
    height?: number;
    userComment?: string;
    createdAt: string;
    visionResult?: VisionResultRecord | null;
    metadataResult?: MetadataResultRecord | null;
  } | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReprocess: (id: string) => void;
  onDownload: (id: string) => void;
  onUpdateComment: (id: string, comment: string) => void;
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 0.8 ? 'bg-green-100 text-green-700' 
    : score >= 0.5 ? 'bg-yellow-100 text-yellow-700' 
    : 'bg-red-100 text-red-700';
  
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${color}`}>
      {Math.round(score * 100)}%
    </span>
  );
}

function MetadataField({ 
  label, 
  value, 
  confidence, 
  reasoning,
  editable = false,
  onSave,
}: { 
  label: string; 
  value?: string | string[]; 
  confidence?: number;
  reasoning?: string;
  editable?: boolean;
  onSave?: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  if (!value || (Array.isArray(value) && value.length === 0)) return null;

  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  const handleEdit = () => {
    setEditValue(displayValue);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave?.(editValue);
    setIsEditing(false);
  };

  return (
    <div className="group py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {confidence !== undefined && <ConfidenceBadge score={confidence} />}
          {editable && !isEditing && (
            <button 
              onClick={handleEdit}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 
                dark:hover:bg-gray-700 rounded transition-all"
            >
              <Edit3 className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>
      
      {isEditing ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 
              dark:border-gray-600"
            autoFocus
          />
          <button 
            onClick={handleSave}
            className="p-1 bg-brand-500 text-white rounded hover:bg-brand-600"
          >
            <Save className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsEditing(false)}
            className="p-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-900 dark:text-gray-100">
          {displayValue}
        </p>
      )}
      
      {reasoning && (
        <p className="text-xs text-gray-400 mt-1 italic">
          {reasoning}
        </p>
      )}
    </div>
  );
}

export function AssetDetailPanel({ 
  asset, 
  onClose, 
  onApprove,
  onReprocess,
  onDownload,
  onUpdateComment,
}: AssetDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'vision' | 'metadata'>('metadata');
  const [comment, setComment] = useState(asset?.userComment || '');
  const [savingComment, setSavingComment] = useState(false);

  if (!asset) return null;

  // Extract the actual result data from the database records
  const vision = asset.visionResult?.result;
  const metadata = asset.metadataResult?.result;
  const isCompleted = asset.status === 'completed' || asset.status === 'approved';

  const handleSaveComment = async () => {
    setSavingComment(true);
    try {
      await onUpdateComment(asset.id, comment);
      toast.success('Context saved');
    } catch {
      toast.error('Failed to save context');
    } finally {
      setSavingComment(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-gray-900 
      shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{asset.originalFilename}</h2>
          <p className="text-sm text-gray-500">
            {asset.width}×{asset.height} • {(asset.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          <img
            src={assetsApi.getFileUrl(asset.id, 'thumbnail')}
            alt={asset.originalFilename}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'metadata', label: 'Metadata', icon: FileText },
          { id: 'vision', label: 'AI Analysis', icon: Sparkles },
          { id: 'info', label: 'Info', icon: Eye },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium
              transition-colors border-b-2 -mb-px
              ${activeTab === tab.id 
                ? 'border-brand-500 text-brand-600 dark:text-brand-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'metadata' && (
          <div>
            {!isCompleted ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                <p className="font-medium">Not yet processed</p>
                <p className="text-sm">Process this asset to generate metadata</p>
              </div>
            ) : metadata ? (
              <div className="space-y-0">
                {/* Core IPTC Fields */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Attribution & Rights
                  </h3>
                  <MetadataField label="Creator" value={metadata.creator} editable />
                  <MetadataField label="Credit" value={metadata.credit} editable />
                  <MetadataField label="Copyright" value={metadata.copyright} editable />
                </div>

                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Descriptive
                  </h3>
                  <MetadataField 
                    label="Headline" 
                    value={metadata.headline} 
                    confidence={metadata.confidence?.headline}
                    reasoning={metadata.reasoning?.headline}
                    editable
                  />
                  <MetadataField 
                    label="Description" 
                    value={metadata.description} 
                    confidence={metadata.confidence?.description}
                    reasoning={metadata.reasoning?.description}
                    editable
                  />
                  <MetadataField 
                    label="Keywords" 
                    value={metadata.keywords} 
                    confidence={metadata.confidence?.keywords}
                  />
                </div>

                {(metadata.city || metadata.country) && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Location
                    </h3>
                    <MetadataField label="City" value={metadata.city} editable />
                    <MetadataField label="State" value={metadata.state} editable />
                    <MetadataField label="Country" value={metadata.country} editable />
                  </div>
                )}

                {/* Copy All Button */}
                <button
                  onClick={() => copyToClipboard(JSON.stringify(metadata, null, 2))}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 
                    text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 
                    dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 
                    rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy All Metadata
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No metadata available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vision' && (
          <div>
            {!vision ? (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No vision analysis available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {vision.naturalDescription && (
                  <div className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 
                    dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
                    <p className="text-sm italic text-gray-700 dark:text-gray-300">
                      "{vision.naturalDescription}"
                    </p>
                  </div>
                )}

                {vision.subjects && vision.subjects.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Subjects
                    </h4>
                    <div className="space-y-2">
                      {vision.subjects.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 
                            text-blue-700 dark:text-blue-300 rounded text-xs">
                            {s.type}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {s.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vision.scene && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Scene
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                        {vision.scene.type}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                        {vision.scene.setting}
                      </span>
                      {vision.scene.timeOfDay && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                          {vision.scene.timeOfDay}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {vision.mood && vision.mood.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Mood
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {vision.mood.map((m, i) => (
                        <span key={i} className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 
                          text-pink-700 dark:text-pink-300 rounded text-sm">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {vision.objects && vision.objects.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Objects
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {vision.objects.map((o, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 
                          rounded text-xs text-gray-600 dark:text-gray-400">
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {vision.colors?.dominant && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Colors
                    </h4>
                    <div className="flex gap-2">
                      {vision.colors.dominant.map((c, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div 
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: c.toLowerCase() }}
                          />
                          <span className="text-xs text-gray-500">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* User Context */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                User Context
              </h4>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add context about this image (e.g., 'Wedding reception at Grand Hotel Brighton, June 2025')"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 
                  rounded-lg text-sm bg-white dark:bg-gray-800 resize-none"
                rows={3}
              />
              <button
                onClick={handleSaveComment}
                disabled={savingComment || comment === (asset.userComment || '')}
                className="mt-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm
                  hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {savingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Context
              </button>
            </div>

            {/* File Info */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                File Information
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Filename</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{asset.originalFilename}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Type</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{asset.mimeType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Dimensions</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {asset.width} × {asset.height}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Size</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {(asset.size / 1024 / 1024).toFixed(2)} MB
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Uploaded</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {new Date(asset.createdAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {isCompleted && asset.status !== 'approved' && (
          <button
            onClick={() => onApprove(asset.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 
              bg-emerald-500 text-white rounded-lg font-medium
              hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-5 h-5" />
            Approve Metadata
          </button>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={() => onReprocess(asset.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 
              border border-gray-200 dark:border-gray-700 rounded-lg
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reprocess
          </button>
          
          {isCompleted && (
            <button
              onClick={() => onDownload(asset.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 
                bg-brand-500 text-white rounded-lg
                hover:bg-brand-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
