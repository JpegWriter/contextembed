/**
 * Pipeline Orchestrator
 * Coordinates the full embedding pipeline: preprocess -> vision -> synthesis -> embed -> verify
 */

import { Asset, VisionResult, MetadataResult, EmbedResult } from '../types/domain';
import { OnboardingProfile } from '../types/onboarding';
import { 
  PipelineInput, 
  PipelineOutput, 
  PipelineError,
  PipelineTiming,
  PipelineStage,
  EmbedManifest 
} from '../types/pipeline';
import { Preprocessor } from './preprocessor';
import { VisionAnalyzer } from './vision-analyzer';
import { MetadataSynthesizer } from './metadata-synthesizer';
import { Embedder } from './embedder';
import { IAssetStore } from '../interfaces/asset-store';
import { computeInputHash } from '../utils/hash';
import { nanoid } from 'nanoid';

export interface PipelineOrchestratorConfig {
  preprocessor: Preprocessor;
  visionAnalyzer: VisionAnalyzer;
  metadataSynthesizer: MetadataSynthesizer;
  embedder: Embedder;
  assetStore: IAssetStore;
}

export interface PipelineCallbacks {
  onStageStart?: (stage: PipelineStage, asset: Asset) => void;
  onStageComplete?: (stage: PipelineStage, asset: Asset, result: unknown) => void;
  onStageError?: (stage: PipelineStage, asset: Asset, error: string) => void;
  onProgress?: (stage: PipelineStage, progress: number) => void;
}

/**
 * Pipeline Orchestrator class
 * Runs the complete embedding pipeline for an asset
 */
export class PipelineOrchestrator {
  private preprocessor: Preprocessor;
  private visionAnalyzer: VisionAnalyzer;
  private metadataSynthesizer: MetadataSynthesizer;
  private embedder: Embedder;
  private assetStore: IAssetStore;
  
  constructor(config: PipelineOrchestratorConfig) {
    this.preprocessor = config.preprocessor;
    this.visionAnalyzer = config.visionAnalyzer;
    this.metadataSynthesizer = config.metadataSynthesizer;
    this.embedder = config.embedder;
    this.assetStore = config.assetStore;
  }
  
  /**
   * Run the complete pipeline for an asset
   */
  async run(
    input: PipelineInput,
    callbacks?: PipelineCallbacks
  ): Promise<PipelineOutput> {
    const timing: PipelineTiming = { totalMs: 0 };
    const startTime = Date.now();
    
    let visionResult: VisionResult | undefined;
    let metadataResult: MetadataResult | undefined;
    let embedResult: EmbedResult | undefined;
    
    try {
      // Stage 1: Preprocess (if not skipped)
      if (!input.options?.skipPreprocess) {
        callbacks?.onStageStart?.('preprocess', input.asset);
        const preprocessStart = Date.now();
        
        // Retrieve the asset file
        const fileResponse = await this.assetStore.retrieve({ 
          path: input.asset.storagePath 
        });
        
        if (!fileResponse.success || !fileResponse.buffer) {
          return this.createErrorOutput(
            input.asset,
            'preprocess',
            'RETRIEVE_FAILED',
            'Failed to retrieve asset file',
            timing,
            startTime
          );
        }
        
        // Validate the file
        const validation = this.preprocessor.validate(
          input.asset.filename,
          input.asset.mimeType,
          input.asset.size
        );
        
        if (!validation.valid) {
          return this.createErrorOutput(
            input.asset,
            'preprocess',
            'VALIDATION_FAILED',
            validation.error || 'Validation failed',
            timing,
            startTime
          );
        }
        
        timing.preprocessMs = Date.now() - preprocessStart;
        callbacks?.onStageComplete?.('preprocess', input.asset, { success: true });
      }
      
      // Stage 2: Vision Analysis (if not skipped)
      if (!input.options?.skipVision) {
        callbacks?.onStageStart?.('vision', input.asset);
        const visionStart = Date.now();
        
        // Get the analysis image
        const analysisPath = input.asset.analysisPath || input.asset.storagePath;
        
        // Get URL for the image
        const urlResponse = await this.assetStore.getUrl({ 
          path: analysisPath,
          expiresIn: 3600 
        });
        
        if (!urlResponse.success || !urlResponse.url) {
          return this.createErrorOutput(
            input.asset,
            'vision',
            'URL_FAILED',
            'Failed to get image URL for analysis',
            timing,
            startTime
          );
        }
        
        const visionOutput = await this.visionAnalyzer.analyze(
          { url: urlResponse.url },
          input.asset.id,
          input.asset.hash
        );
        
        if (!visionOutput.success || !visionOutput.analysis) {
          return this.createErrorOutput(
            input.asset,
            'vision',
            'ANALYSIS_FAILED',
            visionOutput.error || 'Vision analysis failed',
            timing,
            startTime,
            true
          );
        }
        
        visionResult = this.visionAnalyzer.createVisionResult(
          input.asset.id,
          input.asset.hash,
          visionOutput
        ) || undefined;
        
        timing.visionMs = Date.now() - visionStart;
        callbacks?.onStageComplete?.('vision', input.asset, visionOutput);
      }
      
      // Stage 3: Metadata Synthesis
      if (visionResult) {
        callbacks?.onStageStart?.('synthesis', input.asset);
        const synthesisStart = Date.now();
        
        const synthesisOutput = await this.metadataSynthesizer.synthesize(
          visionResult.result,
          input.onboardingProfile,
          input.userComment
        );
        
        if (!synthesisOutput.success || !synthesisOutput.metadata) {
          return this.createErrorOutput(
            input.asset,
            'synthesis',
            'SYNTHESIS_FAILED',
            synthesisOutput.error || 'Metadata synthesis failed',
            timing,
            startTime,
            true
          );
        }
        
        // Compute input hash for reproducibility
        const inputHash = await computeInputHash({
          visionResult: visionResult.result,
          profileVersion: input.onboardingProfile.version,
          userComment: input.userComment,
        });
        
        metadataResult = this.metadataSynthesizer.createMetadataResult(
          input.asset.id,
          visionResult.id,
          input.onboardingProfile.id,
          inputHash,
          synthesisOutput
        ) || undefined;
        
        timing.synthesisMs = Date.now() - synthesisStart;
        callbacks?.onStageComplete?.('synthesis', input.asset, synthesisOutput);
      }
      
      // Stage 4: Embed (if not skipped and not dry run)
      if (metadataResult && !input.options?.skipEmbed && !input.options?.dryRun) {
        callbacks?.onStageStart?.('embed', input.asset);
        const embedStart = Date.now();
        
        // Get the source file
        const sourceResponse = await this.assetStore.retrieve({
          path: input.asset.storagePath
        });
        
        if (!sourceResponse.success || !sourceResponse.buffer) {
          return this.createErrorOutput(
            input.asset,
            'embed',
            'SOURCE_FAILED',
            'Failed to retrieve source file for embedding',
            timing,
            startTime
          );
        }
        
        // Generate output path
        const outputFilename = this.embedder.generateOutputPath(input.asset.filename);
        const outputPath = input.asset.storagePath.replace(
          input.asset.filename,
          outputFilename
        );
        
        // For now, we need the actual file path - this would be handled by the API
        // In a real implementation, the embedder would receive file buffers
        // and the API would handle the actual file system operations
        
        const { embedResult: embedOutput, verifyResult: verifyOutput } = 
          await this.embedder.embedAndVerify(
            input.asset.storagePath, // This would be a temp file path in practice
            outputPath,
            metadataResult.result
          );
        
        if (!embedOutput.success) {
          return this.createErrorOutput(
            input.asset,
            'embed',
            'EMBED_FAILED',
            embedOutput.error || 'Embedding failed',
            timing,
            startTime
          );
        }
        
        embedResult = this.embedder.createEmbedResult(
          input.asset.id,
          metadataResult.id,
          embedOutput,
          verifyOutput
        ) || undefined;
        
        timing.embedMs = Date.now() - embedStart;
        
        // Stage 5: Verify
        if (verifyOutput) {
          timing.verifyMs = Date.now() - embedStart - (timing.embedMs || 0);
          
          if (!verifyOutput.verified) {
            callbacks?.onStageError?.('verify', input.asset, 'Verification failed');
          }
        }
        
        callbacks?.onStageComplete?.('embed', input.asset, { embedOutput, verifyOutput });
      }
      
      timing.totalMs = Date.now() - startTime;
      
      return {
        success: true,
        asset: input.asset,
        visionResult,
        metadataResult,
        embedResult,
        timing,
      };
      
    } catch (error) {
      return this.createErrorOutput(
        input.asset,
        'preprocess', // Default to preprocess if we don't know the stage
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        timing,
        startTime
      );
    }
  }
  
  /**
   * Create an error output
   */
  private createErrorOutput(
    asset: Asset,
    stage: PipelineStage,
    code: string,
    message: string,
    timing: PipelineTiming,
    startTime: number,
    retryable: boolean = false
  ): PipelineOutput {
    timing.totalMs = Date.now() - startTime;
    
    const error: PipelineError = {
      stage,
      code,
      message,
      retryable,
    };
    
    return {
      success: false,
      asset,
      error,
      timing,
    };
  }
  
  /**
   * Create an embed manifest for auditability
   */
  createManifest(output: PipelineOutput): EmbedManifest | null {
    if (!output.success || !output.visionResult || !output.metadataResult || !output.embedResult) {
      return null;
    }
    
    return {
      id: nanoid(),
      assetId: output.asset.id,
      timestamp: new Date(),
      inputHash: output.asset.hash,
      outputHash: '', // Would be computed from the embedded file
      visionModelId: output.visionResult.modelId,
      visionPromptVersion: output.visionResult.promptVersion,
      llmModelId: output.metadataResult.modelId,
      llmPromptVersion: output.metadataResult.promptVersion,
      onboardingProfileVersion: 1, // Would come from the profile
      fieldsWritten: output.embedResult.fieldsWritten,
      verified: output.embedResult.verified,
    };
  }
  
  /**
   * Check health of all pipeline components
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    components: Record<string, { healthy: boolean; error?: string }>;
  }> {
    const [visionHealth, writerHealth, storeHealth] = await Promise.all([
      this.visionAnalyzer.healthCheck(),
      this.embedder.healthCheck(),
      this.assetStore.healthCheck(),
    ]);
    
    const components = {
      visionAnalyzer: visionHealth,
      embedder: writerHealth,
      assetStore: storeHealth,
    };
    
    const healthy = Object.values(components).every(c => c.healthy);
    
    return { healthy, components };
  }
}

/**
 * Create a pipeline orchestrator instance
 */
export function createPipelineOrchestrator(
  config: PipelineOrchestratorConfig
): PipelineOrchestrator {
  return new PipelineOrchestrator(config);
}
