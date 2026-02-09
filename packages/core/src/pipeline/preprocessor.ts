/**
 * Preprocessor Service
 * Handles image validation, resizing, thumbnail generation, and hashing
 */

import { PreprocessResult, PreprocessOptions } from '../types/pipeline';
import { Asset } from '../types/domain';
import { computeHash } from '../utils/hash';

const DEFAULT_OPTIONS: PreprocessOptions = {
  thumbnailSize: 200,
  previewSize: 800,
  analysisSize: 1600,
  quality: 85,
};

const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
];

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp'];

/**
 * Validate that a file is a supported image type
 */
export function validateImageType(
  filename: string, 
  mimeType: string
): { valid: boolean; error?: string } {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension: ${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }
  
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Unsupported MIME type: ${mimeType}. Supported: ${SUPPORTED_MIME_TYPES.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * Check if RAW file (for future desktop support)
 */
export function isRawFile(filename: string): boolean {
  const rawExtensions = [
    '.raw', '.cr2', '.cr3', '.nef', '.arw', '.orf', 
    '.rw2', '.dng', '.raf', '.pef', '.srw', '.x3f'
  ];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return rawExtensions.includes(ext);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.substring(filename.lastIndexOf('.')).toLowerCase();
}

/**
 * Generate output filename with suffix
 */
export function generateOutputFilename(
  originalFilename: string, 
  suffix: string
): string {
  const ext = getFileExtension(originalFilename);
  const base = originalFilename.substring(0, originalFilename.lastIndexOf('.'));
  return `${base}${suffix}${ext}`;
}

/**
 * Generate storage paths for an asset
 */
export function generateStoragePaths(
  projectId: string,
  assetId: string,
  filename: string
): {
  original: string;
  thumbnail: string;
  preview: string;
  analysis: string;
  embedded: string;
} {
  const ext = getFileExtension(filename);
  const base = `projects/${projectId}/assets/${assetId}`;
  
  return {
    original: `${base}/original${ext}`,
    thumbnail: `${base}/thumbnail${ext}`,
    preview: `${base}/preview${ext}`,
    analysis: `${base}/analysis${ext}`,
    embedded: `${base}/embedded${ext}`,
  };
}

/**
 * Preprocessor class for image processing
 * Note: Actual image resizing requires sharp or similar library
 * This implementation provides the structure; actual resize is in the API
 */
export class Preprocessor {
  private options: PreprocessOptions;
  
  constructor(options: Partial<PreprocessOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Validate an image file
   */
  validate(filename: string, mimeType: string, size: number): { 
    valid: boolean; 
    error?: string 
  } {
    // Check file type
    const typeCheck = validateImageType(filename, mimeType);
    if (!typeCheck.valid) {
      return typeCheck;
    }
    
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (size > maxSize) {
      return {
        valid: false,
        error: `File too large: ${(size / 1024 / 1024).toFixed(2)}MB. Maximum: 50MB`,
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Compute hash for image data
   */
  async computeHash(buffer: Buffer): Promise<string> {
    return computeHash(buffer);
  }
  
  /**
   * Get resize dimensions maintaining aspect ratio
   */
  getResizeDimensions(
    width: number, 
    height: number, 
    maxSize: number
  ): { width: number; height: number } {
    const aspectRatio = width / height;
    
    if (width > height) {
      // Landscape
      if (width > maxSize) {
        return {
          width: maxSize,
          height: Math.round(maxSize / aspectRatio),
        };
      }
    } else {
      // Portrait or square
      if (height > maxSize) {
        return {
          width: Math.round(maxSize * aspectRatio),
          height: maxSize,
        };
      }
    }
    
    // Image is smaller than max, return original dimensions
    return { width, height };
  }
  
  /**
   * Get configuration for preprocessing
   */
  getConfig(): PreprocessOptions {
    return { ...this.options };
  }
  
  /**
   * Create a preprocess result structure
   */
  createResult(
    asset: Asset,
    success: boolean,
    paths: {
      thumbnailPath?: string;
      previewPath?: string;
      analysisPath?: string;
    },
    hash: string,
    dimensions?: { width: number; height: number },
    error?: string
  ): PreprocessResult {
    return {
      success,
      asset,
      thumbnailPath: paths.thumbnailPath,
      previewPath: paths.previewPath,
      analysisPath: paths.analysisPath,
      hash,
      dimensions,
      error,
    };
  }
}

/**
 * Create a preprocessor instance
 */
export function createPreprocessor(
  options?: Partial<PreprocessOptions>
): Preprocessor {
  return new Preprocessor(options);
}
