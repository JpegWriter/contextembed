/**
 * ExifTool Metadata Writer
 * Implements IMetadataWriter using exiftool-vendored
 */

import { ExifTool, Tags } from 'exiftool-vendored';
import { 
  IMetadataWriter,
  MetadataWriterConfig,
  WriteRequest,
  WriteResponse,
  ReadRequest,
  ReadResponse,
  VerifyRequest,
  VerifyResponse,
  SynthesizedMetadata,
} from '@contextembed/core';
import { mapMetadataToExifTool, mapExifToolToMetadata } from './field-mapper';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExifToolWriterConfig extends MetadataWriterConfig {
  taskTimeoutMs?: number;
}

// Manage a shared ExifTool instance that can be recreated if needed
let sharedExifTool: ExifTool | null = null;

function getExifTool(): ExifTool {
  if (!sharedExifTool || sharedExifTool.ended) {
    sharedExifTool = new ExifTool({ taskTimeoutMillis: 60000 });
  }
  return sharedExifTool;
}

/**
 * ExifTool Metadata Writer implementation
 */
export class ExifToolWriter implements IMetadataWriter {
  readonly writerId = 'exiftool';
  
  private config: ExifToolWriterConfig;
  
  constructor(config: ExifToolWriterConfig = {}) {
    this.config = {
      preserveOriginal: true,
      outputSuffix: '_embedded',
      timeout: 30000,
      ...config,
    };
  }
  
  /**
   * Get a working ExifTool instance
   */
  private get et(): ExifTool {
    return getExifTool();
  }
  
  /**
   * Ensure ExifTool is ready
   */
  private async ensureInitialized(): Promise<void> {
    // ExifTool is initialized lazily via getExifTool()
  }
  
  /**
   * Write metadata to an image file
   */
  async write(request: WriteRequest): Promise<WriteResponse> {
    const startedAt = new Date();
    const logs: string[] = [];
    const fieldsWritten: string[] = [];
    const fieldsSkipped: string[] = [];
    const warnings: string[] = [];
    
    try {
      await this.ensureInitialized();
      
      // Determine output path
      let outputPath = request.outputPath;
      
      if (!outputPath) {
        const ext = path.extname(request.sourcePath);
        const base = path.basename(request.sourcePath, ext);
        const dir = path.dirname(request.sourcePath);
        outputPath = path.join(dir, `${base}${this.config.outputSuffix}${ext}`);
      }
      
      // Copy file if preserving original
      if (request.options?.preserveOriginal !== false) {
        await fs.copyFile(request.sourcePath, outputPath);
        logs.push(`Copied source to: ${outputPath}`);
      } else {
        outputPath = request.sourcePath;
      }
      
      // Map metadata to ExifTool tags
      const tags = mapMetadataToExifTool(request.metadata);
      logs.push(`Mapped ${Object.keys(tags).length} fields`);
      
      // Write metadata
      await this.et.write(outputPath, tags, ['-overwrite_original']);
      
      // Track written fields
      for (const key of Object.keys(tags)) {
        fieldsWritten.push(key);
      }
      
      logs.push(`Successfully wrote ${fieldsWritten.length} fields`);
      
      const completedAt = new Date();
      
      return {
        success: true,
        outputPath,
        fieldsWritten,
        fieldsSkipped,
        warnings,
        logs: logs.join('\n'),
        timing: {
          startedAt,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
        },
      };
      
    } catch (error) {
      const completedAt = new Date();
      logs.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        fieldsWritten,
        fieldsSkipped,
        warnings,
        logs: logs.join('\n'),
        error: {
          code: 'WRITE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timing: {
          startedAt,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
        },
      };
    }
  }
  
  /**
   * Read metadata from an image file
   */
  async read(request: ReadRequest): Promise<ReadResponse> {
    try {
      await this.ensureInitialized();
      
      const tags = await this.et.read(request.filePath);
      
      // Convert to plain object
      const metadata: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(tags)) {
        if (value !== undefined && value !== null) {
          metadata[key] = value;
        }
      }
      
      return {
        success: true,
        metadata,
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Verify that expected metadata was written correctly
   */
  async verify(request: VerifyRequest): Promise<VerifyResponse> {
    try {
      const readResult = await this.read({ filePath: request.filePath });
      
      if (!readResult.success || !readResult.metadata) {
        return {
          success: false,
          verified: false,
          matches: [],
          mismatches: [],
          missing: [],
        };
      }
      
      const matches: VerifyResponse['matches'] = [];
      const mismatches: VerifyResponse['mismatches'] = [];
      const missing: string[] = [];
      
      // Map expected metadata to compare
      const expected = request.expectedMetadata;
      const actual = mapExifToolToMetadata(readResult.metadata as Tags);
      
      // Compare headline
      if (expected.headline) {
        if (actual.headline === expected.headline) {
          matches.push({ field: 'headline', expected: expected.headline, actual: actual.headline || '' });
        } else if (!actual.headline) {
          missing.push('headline');
        } else {
          mismatches.push({ 
            field: 'headline', 
            expected: expected.headline, 
            actual: actual.headline,
            reason: 'Value mismatch'
          });
        }
      }
      
      // Compare description
      if (expected.description) {
        if (actual.description === expected.description) {
          matches.push({ field: 'description', expected: expected.description, actual: actual.description || '' });
        } else if (!actual.description) {
          missing.push('description');
        } else {
          mismatches.push({ 
            field: 'description', 
            expected: expected.description, 
            actual: actual.description || '',
            reason: 'Value mismatch'
          });
        }
      }
      
      // Compare keywords
      if (expected.keywords && expected.keywords.length > 0) {
        const expectedKeywords = expected.keywords.sort().join(',');
        const actualKeywords = (actual.keywords || []).sort().join(',');
        
        if (expectedKeywords === actualKeywords) {
          matches.push({ field: 'keywords', expected: expectedKeywords, actual: actualKeywords });
        } else if (!actual.keywords || actual.keywords.length === 0) {
          missing.push('keywords');
        } else {
          mismatches.push({
            field: 'keywords',
            expected: expectedKeywords,
            actual: actualKeywords,
            reason: 'Keywords do not match'
          });
        }
      }
      
      // Compare creator
      if (expected.creator) {
        if (actual.creator === expected.creator) {
          matches.push({ field: 'creator', expected: expected.creator, actual: actual.creator || '' });
        } else if (!actual.creator) {
          missing.push('creator');
        } else {
          mismatches.push({
            field: 'creator',
            expected: expected.creator,
            actual: actual.creator || '',
            reason: 'Value mismatch'
          });
        }
      }
      
      // Compare copyright
      if (expected.copyright) {
        if (actual.copyright === expected.copyright) {
          matches.push({ field: 'copyright', expected: expected.copyright, actual: actual.copyright || '' });
        } else if (!actual.copyright) {
          missing.push('copyright');
        } else {
          mismatches.push({
            field: 'copyright',
            expected: expected.copyright,
            actual: actual.copyright || '',
            reason: 'Value mismatch'
          });
        }
      }
      
      const verified = mismatches.length === 0 && missing.length === 0;
      
      return {
        success: true,
        verified,
        matches,
        mismatches,
        missing,
      };
      
    } catch (error) {
      return {
        success: false,
        verified: false,
        matches: [],
        mismatches: [],
        missing: [],
      };
    }
  }
  
  /**
   * Health check - verify ExifTool is available
   */
  async healthCheck(): Promise<{ healthy: boolean; version?: string; error?: string }> {
    try {
      await this.ensureInitialized();
      const version = await this.et.version();
      
      return {
        healthy: true,
        version,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'ExifTool not available',
      };
    }
  }
  
  /**
   * Write XMP sidecar file alongside the original
   * This is the preferred method for RAW files - doesn't modify original
   */
  async writeSidecar(
    sourcePath: string, 
    metadata: SynthesizedMetadata,
    outputPath?: string
  ): Promise<{ success: boolean; sidecarPath?: string; error?: string }> {
    try {
      await this.ensureInitialized();
      
      // Determine sidecar path (.xmp alongside original)
      const ext = path.extname(sourcePath);
      const base = path.basename(sourcePath, ext);
      const dir = path.dirname(sourcePath);
      const sidecarPath = outputPath || path.join(dir, `${base}.xmp`);
      
      // Map metadata to ExifTool tags
      const tags = mapMetadataToExifTool(metadata);
      
      // Create XMP sidecar using ExifTool's sidecar mode
      // We create a minimal XMP file first, then write tags to it
      await this.et.write(
        sourcePath, 
        tags, 
        ['-o', sidecarPath, '-xmp:all<all']
      );
      
      return {
        success: true,
        sidecarPath,
      };
    } catch (error) {
      // Fallback: generate XMP manually if exiftool sidecar mode fails
      try {
        const sidecarPath = outputPath || (() => {
          const ext = path.extname(sourcePath);
          const base = path.basename(sourcePath, ext);
          const dir = path.dirname(sourcePath);
          return path.join(dir, `${base}.xmp`);
        })();
        
        const xmpContent = this.generateXmpContent(metadata);
        await fs.writeFile(sidecarPath, xmpContent, 'utf-8');
        
        return {
          success: true,
          sidecarPath,
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: fallbackError instanceof Error ? fallbackError.message : 'Failed to write sidecar',
        };
      }
    }
  }
  
  /**
   * Read metadata from XMP sidecar file
   */
  async readSidecar(sidecarPath: string): Promise<ReadResponse> {
    try {
      await this.ensureInitialized();
      
      const tags = await this.et.read(sidecarPath);
      
      const metadata: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(tags)) {
        if (value !== undefined && value !== null) {
          metadata[key] = value;
        }
      }
      
      return {
        success: true,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read sidecar',
      };
    }
  }
  
  /**
   * Generate XMP file content manually (fallback)
   */
  private generateXmpContent(metadata: SynthesizedMetadata): string {
    const escapeXml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    const keywords = (metadata.keywords || [])
      .map(k => `<rdf:li>${escapeXml(k)}</rdf:li>`)
      .join('\n          ');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="ContextEmbed Export">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
        xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
        xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/"
        xmlns:plus="http://ns.useplus.org/ldf/xmp/1.0/">
      ${metadata.headline ? `<photoshop:Headline>${escapeXml(metadata.headline)}</photoshop:Headline>` : ''}
      ${metadata.title ? `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(metadata.title)}</rdf:li></rdf:Alt></dc:title>` : ''}
      ${metadata.description ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(metadata.description)}</rdf:li></rdf:Alt></dc:description>` : ''}
      ${metadata.creator ? `<dc:creator><rdf:Seq><rdf:li>${escapeXml(metadata.creator)}</rdf:li></rdf:Seq></dc:creator>` : ''}
      ${metadata.copyright ? `<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(metadata.copyright)}</rdf:li></rdf:Alt></dc:rights>` : ''}
      ${metadata.credit ? `<photoshop:Credit>${escapeXml(metadata.credit)}</photoshop:Credit>` : ''}
      ${metadata.source ? `<photoshop:Source>${escapeXml(metadata.source)}</photoshop:Source>` : ''}
      ${metadata.city ? `<photoshop:City>${escapeXml(metadata.city)}</photoshop:City>` : ''}
      ${metadata.state ? `<photoshop:State>${escapeXml(metadata.state)}</photoshop:State>` : ''}
      ${metadata.country ? `<photoshop:Country>${escapeXml(metadata.country)}</photoshop:Country>` : ''}
      ${keywords ? `<dc:subject><rdf:Bag>${keywords}</rdf:Bag></dc:subject>` : ''}
      ${metadata.usageTerms ? `<xmpRights:UsageTerms><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(metadata.usageTerms)}</rdf:li></rdf:Alt></xmpRights:UsageTerms>` : ''}
      ${metadata.webStatement ? `<xmpRights:WebStatement>${escapeXml(metadata.webStatement)}</xmpRights:WebStatement>` : ''}
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
  }
  
  /**
   * Close ExifTool process (call on app shutdown)
   */
  async close(): Promise<void> {
    // Don't close the shared instance from individual writers
    // Use closeSharedExifTool() for cleanup on app shutdown
  }
}

/**
 * Close the shared ExifTool instance (call on app shutdown)
 */
export async function closeSharedExifTool(): Promise<void> {
  if (sharedExifTool && !sharedExifTool.ended) {
    await sharedExifTool.end();
    sharedExifTool = null;
  }
}

/**
 * Create an ExifTool writer instance
 */
export function createExifToolWriter(
  config?: ExifToolWriterConfig
): ExifToolWriter {
  return new ExifToolWriter(config);
}

// Singleton instance for convenience
let defaultWriter: ExifToolWriter | null = null;

/**
 * Get or create the default ExifTool writer
 */
export function getDefaultExifToolWriter(): ExifToolWriter {
  if (!defaultWriter) {
    defaultWriter = new ExifToolWriter();
  }
  return defaultWriter;
}

/**
 * Close the default writer (call on app shutdown)
 */
export async function closeDefaultExifToolWriter(): Promise<void> {
  if (defaultWriter) {
    await defaultWriter.close();
    defaultWriter = null;
  }
  await closeSharedExifTool();
}
