/**
 * Export Processor
 * Handles format conversion, quality settings, and metadata embedding for exports
 * 
 * CRITICAL: All exports go through IPTC validation before writing
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { 
  AdvancedExportOptions,
  ExportFormat,
  SynthesizedMetadata,
  PresetExportedFile,
} from '@contextembed/core';
import { 
  ExifToolWriter,
  validateMetadataContract,
  toMetadataContract,
  MetadataContract,
  isExportReady,
  getValidationReport,
} from '@contextembed/metadata';

export interface ProcessFileRequest {
  assetId: string;
  sourcePath: string;
  originalFilename: string;
  outputDir: string;
  metadata: SynthesizedMetadata;
  options: AdvancedExportOptions;
  sequence?: number;
  /** Business context for IPTC contract - required for validated exports */
  businessContext?: {
    brand: string;
    photographerName: string;
    credit?: string;
    city: string;
    country: string;
    copyrightTemplate?: string;
    usageTerms?: string;
    sessionType?: string;
    // Governance attestation (NEW v2.2)
    governance?: {
      aiGenerated?: boolean | null;
      aiConfidence?: number | null;
      status?: 'approved' | 'blocked' | 'warning' | 'pending';
      policy?: 'deny_ai_proof' | 'conditional' | 'allow';
      reason?: string | null;
      checkedAt?: string | null;
      decisionRef?: string | null;
    };
    // Public verification (NEW v2.3 - forensic-grade)
    verification?: {
      token?: string;
      url?: string;
    };
  };
  /** Skip IPTC validation (not recommended) */
  skipValidation?: boolean;
}

export interface ProcessFileResult {
  success: boolean;
  file?: PresetExportedFile;
  error?: string;
  /** IPTC validation report if validation was performed */
  validationReport?: string;
  /** Indicates if export was blocked due to validation failure */
  blockedByValidation?: boolean;
}

/**
 * RAW file extensions that should not be modified
 */
const RAW_EXTENSIONS = new Set([
  '.cr2', '.cr3', '.nef', '.arw', '.dng', '.orf', '.rw2',
  '.pef', '.srw', '.raf', '.raw', '.3fr', '.fff', '.iiq',
]);

/**
 * Check if file is a RAW format
 */
function isRawFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return RAW_EXTENSIONS.has(ext);
}

/**
 * Get Sharp format options based on export settings
 */
function getSharpOutputOptions(options: AdvancedExportOptions): sharp.OutputOptions & { format?: string } {
  switch (options.format) {
    case 'jpeg':
      return {
        format: 'jpeg',
        quality: options.jpegOptions?.quality || 95,
        progressive: options.jpegOptions?.progressive ?? true,
        chromaSubsampling: options.jpegOptions?.chromaSubsampling === '4:4:4' ? '4:4:4' : '4:2:0',
      } as sharp.JpegOptions & { format: string };
      
    case 'tiff':
      return {
        format: 'tiff',
        compression: options.tiffOptions?.compression || 'lzw',
        bitdepth: options.tiffOptions?.bitDepth || 8,
      } as sharp.TiffOptions & { format: string };
      
    case 'png':
      return {
        format: 'png',
        compressionLevel: options.pngOptions?.compressionLevel || 6,
        progressive: options.pngOptions?.interlaced ?? false,
      } as sharp.PngOptions & { format: string };
      
    default:
      return {};
  }
}

/**
 * Process a single file for export
 * 
 * IPTC Contract Enforcement:
 * - If businessContext is provided, IPTC validation is performed
 * - Exports are BLOCKED if required metadata is missing
 * - Use skipValidation: true to bypass (not recommended)
 */
export async function processFileForExport(
  request: ProcessFileRequest,
  metadataWriter: ExifToolWriter
): Promise<ProcessFileResult> {
  const { 
    assetId, 
    sourcePath, 
    originalFilename, 
    outputDir, 
    metadata, 
    options,
    sequence,
    businessContext,
    skipValidation,
  } = request;
  
  try {
    // =========================================================================
    // IPTC CONTRACT VALIDATION (blocks export if failed)
    // =========================================================================
    if (businessContext && !skipValidation) {
      const contract = toMetadataContract(metadata, businessContext);
      
      if (!isExportReady(contract)) {
        const report = getValidationReport(contract);
        console.error(`[IPTC] Export blocked for ${originalFilename}:\n${report}`);
        
        return {
          success: false,
          error: 'IPTC validation failed - required metadata missing',
          validationReport: report,
          blockedByValidation: true,
        };
      }
      
      console.log(`[IPTC] Validation passed for ${originalFilename}`);
    }
    
    // Determine output filename
    const outputFilename = generateExportFilename(
      originalFilename, 
      metadata, 
      options, 
      sequence
    );
    
    const isRaw = isRawFile(originalFilename);
    
    // For RAW files, only generate sidecar - never modify original
    if (isRaw) {
      return await handleRawFileExport(
        assetId,
        sourcePath,
        originalFilename,
        outputDir,
        outputFilename,
        metadata,
        options,
        metadataWriter
      );
    }
    
    // For other files, process based on format option
    if (options.format === 'original') {
      return await handleOriginalFormatExport(
        assetId,
        sourcePath,
        originalFilename,
        outputDir,
        outputFilename,
        metadata,
        options,
        metadataWriter
      );
    } else {
      return await handleConvertedExport(
        assetId,
        sourcePath,
        originalFilename,
        outputDir,
        outputFilename,
        metadata,
        options,
        metadataWriter
      );
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle RAW file export - sidecar only
 */
async function handleRawFileExport(
  assetId: string,
  sourcePath: string,
  originalFilename: string,
  outputDir: string,
  outputFilename: string,
  metadata: SynthesizedMetadata,
  options: AdvancedExportOptions,
  metadataWriter: ExifToolWriter
): Promise<ProcessFileResult> {
  // Copy RAW file as-is
  const outputPath = path.join(outputDir, outputFilename);
  await fs.copyFile(sourcePath, outputPath);
  
  const stats = await fs.stat(outputPath);
  let sidecarPath: string | undefined;
  
  // Generate XMP sidecar
  if (options.includeXmpSidecars || options.metadataMethod === 'sidecar' || options.metadataMethod === 'both') {
    const sidecarResult = await metadataWriter.writeSidecar(
      sourcePath,
      metadata,
      path.join(outputDir, outputFilename.replace(/\.[^.]+$/, '.xmp'))
    );
    
    if (sidecarResult.success) {
      sidecarPath = sidecarResult.sidecarPath;
    }
  }
  
  return {
    success: true,
    file: {
      assetId,
      originalFilename,
      exportedFilename: outputFilename,
      exportedPath: outputPath,
      sidecarPath,
      format: 'original' as ExportFormat,
      sizeBytes: stats.size,
      success: true,
    },
  };
}

/**
 * Handle export keeping original format
 */
async function handleOriginalFormatExport(
  assetId: string,
  sourcePath: string,
  originalFilename: string,
  outputDir: string,
  outputFilename: string,
  metadata: SynthesizedMetadata,
  options: AdvancedExportOptions,
  metadataWriter: ExifToolWriter
): Promise<ProcessFileResult> {
  const outputPath = path.join(outputDir, outputFilename);
  
  // Check if we need to resize
  if (!options.preserveResolution && options.maxDimension) {
    // Resize but keep format
    const image = sharp(sourcePath);
    const meta = await image.metadata();
    const format = meta.format || 'jpeg';
    
    let pipeline = image.resize({
      width: options.maxDimension,
      height: options.maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    });
    
    // Re-encode in original format with high quality
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: 100, chromaSubsampling: '4:4:4' });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 6 });
        break;
      case 'tiff':
        pipeline = pipeline.tiff({ compression: 'lzw' });
        break;
    }
    
    await pipeline.toFile(outputPath);
  } else {
    // Just copy
    await fs.copyFile(sourcePath, outputPath);
  }
  
  // Embed metadata
  if (options.metadataMethod === 'embed' || options.metadataMethod === 'both') {
    const writeResult = await metadataWriter.write({
      sourcePath: outputPath,
      outputPath: outputPath, // Overwrite in place
      metadata,
      options: {
        includeXmp: options.includeXmp,
        includeIptc: options.includeIptc,
        includeExif: options.includeExif,
        preserveOriginal: false, // We're working on the copy
      },
    });
    
    if (!writeResult.success) {
      console.warn(`Metadata embedding warning for ${originalFilename}:`, writeResult.error);
    }
  }
  
  // Generate sidecar if requested
  let sidecarPath: string | undefined;
  if (options.includeXmpSidecars || options.metadataMethod === 'sidecar' || options.metadataMethod === 'both') {
    const sidecarResult = await metadataWriter.writeSidecar(
      outputPath,
      metadata,
      path.join(outputDir, outputFilename.replace(/\.[^.]+$/, '.xmp'))
    );
    
    if (sidecarResult.success) {
      sidecarPath = sidecarResult.sidecarPath;
    }
  }
  
  const stats = await fs.stat(outputPath);
  
  return {
    success: true,
    file: {
      assetId,
      originalFilename,
      exportedFilename: outputFilename,
      exportedPath: outputPath,
      sidecarPath,
      format: 'original' as ExportFormat,
      sizeBytes: stats.size,
      success: true,
    },
  };
}

/**
 * Handle export with format conversion
 */
async function handleConvertedExport(
  assetId: string,
  sourcePath: string,
  originalFilename: string,
  outputDir: string,
  outputFilename: string,
  metadata: SynthesizedMetadata,
  options: AdvancedExportOptions,
  metadataWriter: ExifToolWriter
): Promise<ProcessFileResult> {
  // Update filename extension for new format
  const newExt = options.format === 'jpeg' ? '.jpg' 
    : options.format === 'tiff' ? '.tif'
    : options.format === 'png' ? '.png'
    : path.extname(originalFilename);
    
  const convertedFilename = outputFilename.replace(/\.[^.]+$/, newExt);
  const outputPath = path.join(outputDir, convertedFilename);
  
  // Process with Sharp
  let pipeline = sharp(sourcePath);
  
  // Resize if needed
  if (!options.preserveResolution && options.maxDimension) {
    pipeline = pipeline.resize({
      width: options.maxDimension,
      height: options.maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
      kernel: options.resampleFilter === 'lanczos3' ? 'lanczos3' 
        : options.resampleFilter === 'mitchell' ? 'mitchell'
        : 'cubic',
    });
  }
  
  // Apply color profile conversion if needed
  if (options.colorProfile && options.colorProfile !== 'original') {
    pipeline = pipeline.toColorspace(
      options.colorProfile === 'sRGB' ? 'srgb'
        : options.colorProfile === 'AdobeRGB' ? 'rgb16' // Approximate
        : 'srgb'
    );
  }
  
  // Convert to target format
  const sharpOptions = getSharpOutputOptions(options);
  
  switch (options.format) {
    case 'jpeg':
      pipeline = pipeline.jpeg(sharpOptions as sharp.JpegOptions);
      break;
    case 'tiff':
      pipeline = pipeline.tiff(sharpOptions as sharp.TiffOptions);
      break;
    case 'png':
      pipeline = pipeline.png(sharpOptions as sharp.PngOptions);
      break;
  }
  
  await pipeline.toFile(outputPath);
  
  // Embed metadata
  if (options.metadataMethod === 'embed' || options.metadataMethod === 'both') {
    const writeResult = await metadataWriter.write({
      sourcePath: outputPath,
      outputPath: outputPath,
      metadata,
      options: {
        includeXmp: options.includeXmp,
        includeIptc: options.includeIptc,
        includeExif: options.includeExif,
        preserveOriginal: false,
      },
    });
    
    if (!writeResult.success) {
      console.warn(`Metadata embedding warning for ${originalFilename}:`, writeResult.error);
    }
  }
  
  // Generate sidecar if requested
  let sidecarPath: string | undefined;
  if (options.includeXmpSidecars || options.metadataMethod === 'sidecar' || options.metadataMethod === 'both') {
    const sidecarResult = await metadataWriter.writeSidecar(
      outputPath,
      metadata,
      path.join(outputDir, convertedFilename.replace(/\.[^.]+$/, '.xmp'))
    );
    
    if (sidecarResult.success) {
      sidecarPath = sidecarResult.sidecarPath;
    }
  }
  
  const stats = await fs.stat(outputPath);
  
  return {
    success: true,
    file: {
      assetId,
      originalFilename,
      exportedFilename: convertedFilename,
      exportedPath: outputPath,
      sidecarPath,
      format: options.format,
      sizeBytes: stats.size,
      success: true,
    },
  };
}

/**
 * Generate output filename based on options
 */
function generateExportFilename(
  originalFilename: string,
  metadata: SynthesizedMetadata,
  options: AdvancedExportOptions,
  sequence?: number
): string {
  const ext = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, ext);
  
  const sanitize = (str: string): string => {
    return str
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 200);
  };
  
  switch (options.outputNaming) {
    case 'headline':
      const headline = metadata.headline || baseName;
      return sanitize(headline) + ext;
      
    case 'title':
      const title = metadata.title || baseName;
      return sanitize(title) + ext;
      
    case 'date-title':
      const date = new Date().toISOString().split('T')[0];
      const titlePart = metadata.title || baseName;
      return `${date}_${sanitize(titlePart)}${ext}`;
      
    case 'sequence':
      return String(sequence || 1).padStart(4, '0') + ext;
      
    case 'custom':
      // Parse template like "{date}_{headline}_{seq}"
      if (options.namingTemplate) {
        return parseNamingTemplate(options.namingTemplate, {
          originalFilename,
          metadata,
          sequence,
        }) + ext;
      }
      return baseName + ext;
      
    case 'original':
    default:
      return baseName + ext;
  }
}

/**
 * Parse naming template with variables
 */
function parseNamingTemplate(
  template: string,
  context: {
    originalFilename: string;
    metadata: SynthesizedMetadata;
    sequence?: number;
  }
): string {
  const { originalFilename, metadata, sequence } = context;
  const baseName = path.basename(originalFilename, path.extname(originalFilename));
  const date = new Date().toISOString().split('T')[0];
  
  const sanitize = (str: string): string => {
    return str
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  };
  
  return template
    .replace(/\{date\}/g, date)
    .replace(/\{year\}/g, new Date().getFullYear().toString())
    .replace(/\{month\}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
    .replace(/\{day\}/g, String(new Date().getDate()).padStart(2, '0'))
    .replace(/\{headline\}/g, sanitize(metadata.headline || baseName))
    .replace(/\{title\}/g, sanitize(metadata.title || baseName))
    .replace(/\{original\}/g, sanitize(baseName))
    .replace(/\{seq\}/g, String(sequence || 1).padStart(4, '0'))
    .replace(/\{creator\}/g, sanitize(metadata.creator || 'unknown'))
    .replace(/\{city\}/g, sanitize(metadata.city || ''))
    .replace(/\{country\}/g, sanitize(metadata.country || ''));
}

/**
 * Generate export manifest JSON
 */
export function generateExportManifest(
  projectId: string,
  files: PresetExportedFile[],
  options: AdvancedExportOptions,
  durationMs: number
): string {
  const manifest = {
    version: '1.0',
    generator: 'ContextEmbed',
    generatedAt: new Date().toISOString(),
    project: {
      id: projectId,
    },
    export: {
      format: options.format,
      colorProfile: options.colorProfile,
      metadataMethod: options.metadataMethod,
      totalFiles: files.length,
      successfulFiles: files.filter(f => f.success).length,
      failedFiles: files.filter(f => !f.success).length,
      durationMs,
    },
    files: files.map(f => ({
      assetId: f.assetId,
      originalFilename: f.originalFilename,
      exportedFilename: f.exportedFilename,
      sidecarFilename: f.sidecarPath ? path.basename(f.sidecarPath) : null,
      format: f.format,
      sizeBytes: f.sizeBytes,
      success: f.success,
      error: f.error || null,
    })),
  };
  
  return JSON.stringify(manifest, null, 2);
}
