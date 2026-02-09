/**
 * Export Types & Presets
 * World-class export system for Lightroom and professional workflows
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ExportFormat = 'original' | 'jpeg' | 'tiff' | 'png';

export type ExportColorProfile = 'sRGB' | 'AdobeRGB' | 'ProPhotoRGB' | 'original';

export type MetadataMethod = 'embed' | 'sidecar' | 'both';

export type OutputNaming = 
  | 'original'           // Keep original filename
  | 'headline'           // Use metadata headline
  | 'title'              // Use metadata title  
  | 'date-title'         // YYYY-MM-DD_title
  | 'sequence'           // 001, 002, 003...
  | 'custom';            // Custom template

export type FolderStructure = 
  | 'flat'               // All files in one folder
  | 'by-date'            // Organize by date (YYYY/MM/DD)
  | 'by-event'           // Organize by event name
  | 'by-project'         // Organize by project name
  | 'custom';            // Custom structure

export type ExportPresetId = 
  | 'lightroom-ready'    // Optimized for Lightroom import
  | 'web-optimized'      // Smaller files for web use
  | 'archive-quality'    // Maximum quality preservation
  | 'social-media'       // Optimized for social platforms
  | 'client-delivery'    // High quality for client handoff
  | 'custom';            // User-defined settings

// ============================================================================
// QUALITY OPTIONS
// ============================================================================

export interface JpegQualityOptions {
  quality: number;           // 1-100, default 95
  progressive: boolean;      // Progressive JPEG
  chromaSubsampling: '4:4:4' | '4:2:2' | '4:2:0';  // 4:4:4 = best quality
}

export interface TiffOptions {
  compression: 'none' | 'lzw' | 'zip' | 'jpeg';
  bitDepth: 8 | 16;
  preserveExif: boolean;
}

export interface PngOptions {
  compressionLevel: number;  // 0-9
  interlaced: boolean;
}

// ============================================================================
// EXPORT OPTIONS (Advanced - for preset system)
// ============================================================================

export interface AdvancedExportOptions {
  // Format & Quality
  format: ExportFormat;
  colorProfile: ExportColorProfile;
  jpegOptions?: JpegQualityOptions;
  tiffOptions?: TiffOptions;
  pngOptions?: PngOptions;
  
  // Resolution
  preserveResolution: boolean;
  maxDimension?: number;       // Max width/height in pixels
  resampleFilter?: 'lanczos3' | 'mitchell' | 'cubic';
  
  // Metadata
  metadataMethod: MetadataMethod;
  includeIptc: boolean;
  includeXmp: boolean;
  includeExif: boolean;
  stripGps?: boolean;          // Privacy: remove GPS data
  
  // Output
  outputNaming: OutputNaming;
  namingTemplate?: string;     // For custom naming: "{date}_{headline}_{seq}"
  folderStructure: FolderStructure;
  folderTemplate?: string;     // For custom structure: "{year}/{event}"
  
  // Extras
  includeManifest: boolean;    // JSON manifest of exported files
  includeXmpSidecars: boolean; // Generate .xmp files alongside
  zipOutput: boolean;          // Package as ZIP vs individual files
}

// Alias for backward compatibility
export type ExportOptionsAdvanced = AdvancedExportOptions;

// ============================================================================
// EXPORT PRESETS
// ============================================================================

export interface ExportPreset {
  id: ExportPresetId;
  name: string;
  description: string;
  icon: string;               // Icon name for UI
  options: AdvancedExportOptions;
  tags: string[];             // For filtering: ['lightroom', 'professional']
}

/**
 * Default export presets for common workflows
 */
export const EXPORT_PRESETS: Record<ExportPresetId, ExportPreset> = {
  'lightroom-ready': {
    id: 'lightroom-ready',
    name: 'Lightroom Ready',
    description: 'Optimized for Adobe Lightroom import with full metadata and XMP sidecars',
    icon: 'Camera',
    tags: ['lightroom', 'professional', 'metadata'],
    options: {
      format: 'original',
      colorProfile: 'original',
      preserveResolution: true,
      metadataMethod: 'both',
      includeIptc: true,
      includeXmp: true,
      includeExif: true,
      outputNaming: 'original',
      folderStructure: 'flat',
      includeManifest: false,
      includeXmpSidecars: true,
      zipOutput: false,
    },
  },
  
  'archive-quality': {
    id: 'archive-quality',
    name: 'Archive Quality',
    description: 'Maximum quality TIFF with full metadata for long-term archival',
    icon: 'Archive',
    tags: ['archive', 'lossless', 'professional'],
    options: {
      format: 'tiff',
      colorProfile: 'ProPhotoRGB',
      tiffOptions: {
        compression: 'zip',
        bitDepth: 16,
        preserveExif: true,
      },
      preserveResolution: true,
      metadataMethod: 'embed',
      includeIptc: true,
      includeXmp: true,
      includeExif: true,
      outputNaming: 'date-title',
      folderStructure: 'by-date',
      includeManifest: true,
      includeXmpSidecars: true,
      zipOutput: true,
    },
  },
  
  'web-optimized': {
    id: 'web-optimized',
    name: 'Web Optimized',
    description: 'Compressed JPEG for web use with essential metadata',
    icon: 'Globe',
    tags: ['web', 'fast', 'small'],
    options: {
      format: 'jpeg',
      colorProfile: 'sRGB',
      jpegOptions: {
        quality: 85,
        progressive: true,
        chromaSubsampling: '4:2:2',
      },
      preserveResolution: false,
      maxDimension: 2048,
      resampleFilter: 'lanczos3',
      metadataMethod: 'embed',
      includeIptc: true,
      includeXmp: true,
      includeExif: false,       // Strip EXIF for smaller files
      stripGps: true,           // Privacy
      outputNaming: 'headline',
      folderStructure: 'flat',
      includeManifest: false,
      includeXmpSidecars: false,
      zipOutput: true,
    },
  },
  
  'social-media': {
    id: 'social-media',
    name: 'Social Media',
    description: 'Optimized for Instagram, Facebook, and other platforms',
    icon: 'Share2',
    tags: ['social', 'instagram', 'facebook'],
    options: {
      format: 'jpeg',
      colorProfile: 'sRGB',
      jpegOptions: {
        quality: 90,
        progressive: true,
        chromaSubsampling: '4:2:0',
      },
      preserveResolution: false,
      maxDimension: 1600,
      resampleFilter: 'lanczos3',
      metadataMethod: 'embed',
      includeIptc: true,
      includeXmp: false,
      includeExif: false,
      stripGps: true,
      outputNaming: 'headline',
      folderStructure: 'flat',
      includeManifest: false,
      includeXmpSidecars: false,
      zipOutput: true,
    },
  },
  
  'client-delivery': {
    id: 'client-delivery',
    name: 'Client Delivery',
    description: 'High quality JPEG with full metadata for client handoff',
    icon: 'Users',
    tags: ['client', 'delivery', 'professional'],
    options: {
      format: 'jpeg',
      colorProfile: 'sRGB',
      jpegOptions: {
        quality: 95,
        progressive: true,
        chromaSubsampling: '4:4:4',
      },
      preserveResolution: true,
      metadataMethod: 'embed',
      includeIptc: true,
      includeXmp: true,
      includeExif: true,
      stripGps: false,
      outputNaming: 'headline',
      folderStructure: 'by-event',
      includeManifest: true,
      includeXmpSidecars: false,
      zipOutput: true,
    },
  },
  
  'custom': {
    id: 'custom',
    name: 'Custom',
    description: 'Customize all export settings',
    icon: 'Settings',
    tags: ['custom'],
    options: {
      format: 'jpeg',
      colorProfile: 'sRGB',
      jpegOptions: {
        quality: 95,
        progressive: true,
        chromaSubsampling: '4:4:4',
      },
      preserveResolution: true,
      metadataMethod: 'embed',
      includeIptc: true,
      includeXmp: true,
      includeExif: true,
      outputNaming: 'original',
      folderStructure: 'flat',
      includeManifest: false,
      includeXmpSidecars: false,
      zipOutput: true,
    },
  },
};

// ============================================================================
// EXPORT REQUEST & RESPONSE (Advanced - for preset system)
// ============================================================================

export interface PresetExportFile {
  assetId: string;
  sourcePath: string;
  originalFilename: string;
  metadata?: Record<string, unknown>;
}

export interface PresetExportRequest {
  projectId: string;
  files: PresetExportFile[];
  presetId?: ExportPresetId;
  options?: Partial<AdvancedExportOptions>;
  outputPath?: string;         // For folder export
}

export interface PresetExportedFile {
  assetId: string;
  originalFilename: string;
  exportedFilename: string;
  exportedPath: string;
  sidecarPath?: string;        // If XMP sidecar generated
  format: ExportFormat;
  sizeBytes: number;
  success: boolean;
  error?: string;
}

export interface ExportResult {
  success: boolean;
  exportId: string;
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  files: PresetExportedFile[];
  outputPath?: string;
  zipPath?: string;
  manifestPath?: string;
  durationMs: number;
  error?: string;
}

export interface ExportProgress {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentFile: number;
  totalFiles: number;
  currentFilename?: string;
  percentage: number;
  estimatedRemainingMs?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get preset by ID with fallback to custom
 */
export function getExportPreset(presetId: ExportPresetId): ExportPreset {
  return EXPORT_PRESETS[presetId] || EXPORT_PRESETS['custom'];
}

/**
 * Merge preset options with overrides
 */
export function mergeExportOptions(
  presetId: ExportPresetId,
  overrides?: Partial<AdvancedExportOptions>
): AdvancedExportOptions {
  const preset = getExportPreset(presetId);
  return {
    ...preset.options,
    ...overrides,
  };
}

/**
 * Get file extension for export format
 */
export function getExportExtension(format: ExportFormat, originalExt: string): string {
  switch (format) {
    case 'jpeg': return '.jpg';
    case 'tiff': return '.tif';
    case 'png': return '.png';
    case 'original':
    default:
      return originalExt;
  }
}

/**
 * Generate output filename based on naming option (for preset export system)
 */
export function generatePresetOutputFilename(
  originalFilename: string,
  metadata: Record<string, unknown>,
  options: AdvancedExportOptions,
  sequence?: number
): string {
  const ext = getExportExtension(options.format, 
    '.' + originalFilename.split('.').pop()?.toLowerCase());
  const baseName = originalFilename.replace(/\.[^.]+$/, '');
  
  switch (options.outputNaming) {
    case 'headline':
      const headline = (metadata.headline as string) || baseName;
      return sanitizeExportFilename(headline) + ext;
      
    case 'title':
      const title = (metadata.title as string) || baseName;
      return sanitizeExportFilename(title) + ext;
      
    case 'date-title':
      const date = new Date().toISOString().split('T')[0];
      const titlePart = (metadata.title as string) || baseName;
      return `${date}_${sanitizeExportFilename(titlePart)}${ext}`;
      
    case 'sequence':
      return String(sequence || 1).padStart(4, '0') + ext;
      
    case 'custom':
      // TODO: Implement template parsing
      return baseName + ext;
      
    case 'original':
    default:
      return baseName + ext;
  }
}

/**
 * Sanitize filename for filesystem (export-specific)
 */
function sanitizeExportFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')  // Remove illegal chars
    .replace(/\s+/g, '_')           // Spaces to underscores
    .replace(/_{2,}/g, '_')         // Collapse multiple underscores
    .replace(/^_|_$/g, '')          // Trim underscores
    .substring(0, 200);             // Max length
}
