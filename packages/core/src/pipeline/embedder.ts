/**
 * Embedder Service
 * Orchestrates metadata embedding using the metadata writer
 */

import { 
  IMetadataWriter, 
  WriteRequest, 
  VerifyRequest 
} from '../interfaces/metadata-writer';
import { SynthesizedMetadata, EmbedResult } from '../types/domain';
import { EmbedOutput, VerifyOutput } from '../types/pipeline';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

export interface EmbedderConfig {
  preserveOriginal?: boolean;
  outputSuffix?: string;
  verifyAfterWrite?: boolean;
}

const DEFAULT_CONFIG: Required<EmbedderConfig> = {
  preserveOriginal: true,
  outputSuffix: '_embedded',
  verifyAfterWrite: true,
};

/**
 * Embedder class
 * Wraps the metadata writer with copy management and verification
 */
export class Embedder {
  private writer: IMetadataWriter;
  private config: Required<EmbedderConfig>;
  
  constructor(
    writer: IMetadataWriter,
    config: Partial<EmbedderConfig> = {}
  ) {
    this.writer = writer;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Embed metadata into an image
   * Adds audit fields (documentId, instanceId, verification hash, timestamp)
   */
  async embed(
    sourcePath: string,
    outputPath: string,
    metadata: SynthesizedMetadata,
    sourceHash?: string  // Optional pre-computed hash of source file
  ): Promise<EmbedOutput> {
    const startTime = Date.now();
    
    try {
      // Enrich metadata with audit fields
      const enrichedMetadata = this.enrichWithAuditFields(metadata, sourceHash);
      
      const request: WriteRequest = {
        sourcePath,
        outputPath,
        metadata: enrichedMetadata,
        options: {
          overwrite: false,
          preserveOriginal: this.config.preserveOriginal,
          includeXmp: true,
          includeIptc: true,
          includeExif: true,
        },
      };
      
      const response = await this.writer.write(request);
      
      if (!response.success) {
        return {
          success: false,
          fieldsWritten: [],
          logs: response.logs,
          error: response.error?.message || 'Embed failed',
        };
      }
      
      return {
        success: true,
        outputPath: response.outputPath,
        fieldsWritten: response.fieldsWritten,
        logs: response.logs,
      };
      
    } catch (error) {
      return {
        success: false,
        fieldsWritten: [],
        logs: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Verify that metadata was written correctly
   */
  async verify(
    filePath: string,
    expectedMetadata: SynthesizedMetadata
  ): Promise<VerifyOutput> {
    try {
      const request: VerifyRequest = {
        filePath,
        expectedMetadata,
      };
      
      const response = await this.writer.verify(request);
      
      return {
        success: response.success,
        verified: response.verified,
        fieldsVerified: response.matches.map(m => ({
          field: m.field,
          expected: String(m.expected),
          actual: String(m.actual),
          matches: true,
        })),
        missingFields: response.missing,
        mismatchedFields: response.mismatches.map(m => ({
          field: m.field,
          expected: String(m.expected),
          actual: String(m.actual),
          reason: m.reason,
        })),
      };
      
    } catch (error) {
      return {
        success: false,
        verified: false,
        fieldsVerified: [],
        missingFields: [],
        mismatchedFields: [],
      };
    }
  }
  
  /**
   * Embed and verify in one operation
   */
  async embedAndVerify(
    sourcePath: string,
    outputPath: string,
    metadata: SynthesizedMetadata,
    sourceHash?: string  // Optional pre-computed hash of source file
  ): Promise<{
    embedResult: EmbedOutput;
    verifyResult?: VerifyOutput;
  }> {
    const embedResult = await this.embed(sourcePath, outputPath, metadata, sourceHash);
    
    if (!embedResult.success || !this.config.verifyAfterWrite) {
      return { embedResult };
    }
    
    const verifyResult = await this.verify(
      embedResult.outputPath || outputPath, 
      metadata
    );
    
    return { embedResult, verifyResult };
  }
  
  /**
   * Create an embed result record for storage
   */
  createEmbedResult(
    assetId: string,
    metadataResultId: string,
    embedOutput: EmbedOutput,
    verifyOutput?: VerifyOutput
  ): EmbedResult | null {
    if (!embedOutput.success || !embedOutput.outputPath) {
      return null;
    }
    
    return {
      id: nanoid(),
      assetId,
      metadataResultId,
      embeddedPath: embedOutput.outputPath,
      fieldsWritten: embedOutput.fieldsWritten,
      exiftoolLogs: embedOutput.logs,
      verified: verifyOutput?.verified ?? false,
      verificationDetails: verifyOutput ? {
        fieldsVerified: verifyOutput.fieldsVerified.length,
        missingFields: verifyOutput.missingFields,
        mismatchedFields: verifyOutput.mismatchedFields,
      } : undefined,
      createdAt: new Date(),
    };
  }
  
  /**
   * Generate output path with suffix
   */
  generateOutputPath(sourcePath: string): string {
    const ext = sourcePath.substring(sourcePath.lastIndexOf('.'));
    const base = sourcePath.substring(0, sourcePath.lastIndexOf('.'));
    return `${base}${this.config.outputSuffix}${ext}`;
  }
  
  /**
   * Enrich metadata with audit fields (documentId, instanceId, verification hash, timestamp)
   */
  private enrichWithAuditFields(
    metadata: SynthesizedMetadata,
    sourceHash?: string
  ): SynthesizedMetadata {
    const now = new Date().toISOString();
    
    // Generate unique IDs for XMP Media Management
    const documentId = metadata.documentId || `xmp.did:${nanoid(32)}`;
    const instanceId = `xmp.iid:${nanoid(32)}`;
    
    // Create verification hash of the metadata payload
    const metadataForHash = {
      headline: metadata.headline,
      description: metadata.description,
      keywords: metadata.keywords,
      creator: metadata.creator,
      copyright: metadata.copyright,
    };
    const verificationHash = createHash('sha256')
      .update(JSON.stringify(metadataForHash))
      .digest('hex');
    
    return {
      ...metadata,
      documentId,
      instanceId,
      originalDocumentId: metadata.originalDocumentId || documentId,
      audit: {
        ...metadata.audit,
        ceVersion: '2.0.0',
        embeddedAt: now,
        sourceHash: sourceHash || metadata.audit?.sourceHash,
        verificationHash,
        hashAlgorithm: 'sha256',
        processingPipeline: 'full_pipeline',
      },
    };
  }
  
  /**
   * Check writer health
   */
  async healthCheck(): Promise<{ 
    healthy: boolean; 
    version?: string; 
    error?: string 
  }> {
    return this.writer.healthCheck();
  }
  
  /**
   * Get writer info
   */
  getWriterInfo(): { writerId: string } {
    return {
      writerId: this.writer.writerId,
    };
  }
}

/**
 * Create an embedder instance
 */
export function createEmbedder(
  writer: IMetadataWriter,
  config?: Partial<EmbedderConfig>
): Embedder {
  return new Embedder(writer, config);
}
