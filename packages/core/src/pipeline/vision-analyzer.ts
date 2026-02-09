/**
 * Vision Analyzer Service
 * Orchestrates vision analysis using the vision provider
 */

import { IVisionProvider, VisionRequest, VisionResponse } from '../interfaces/vision-provider';
import { VisionAnalysis, VisionResult } from '../types/domain';
import { VisionOutput } from '../types/pipeline';
import { VisionAnalysisSchema } from '../schemas/vision';
import { nanoid } from 'nanoid';

export interface VisionAnalyzerConfig {
  retryAttempts?: number;
  retryDelayMs?: number;
}

const DEFAULT_CONFIG: Required<VisionAnalyzerConfig> = {
  retryAttempts: 2,
  retryDelayMs: 1000,
};

/**
 * Vision Analyzer class
 * Wraps the vision provider with validation, retries, and result formatting
 */
export class VisionAnalyzer {
  private provider: IVisionProvider;
  private config: Required<VisionAnalyzerConfig>;
  
  constructor(
    provider: IVisionProvider,
    config: Partial<VisionAnalyzerConfig> = {}
  ) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Analyze an image and return structured vision analysis
   */
  async analyze(
    imageInput: { base64?: string; url?: string; path?: string },
    assetId: string,
    inputHash: string
  ): Promise<VisionOutput> {
    const startTime = Date.now();
    
    const request: VisionRequest = {
      imageBase64: imageInput.base64,
      imageUrl: imageInput.url,
      imagePath: imageInput.path,
      detailLevel: 'high',
    };
    
    let lastError: string | undefined;
    let attempts = 0;
    
    while (attempts <= this.config.retryAttempts) {
      attempts++;
      
      try {
        const response = await this.provider.analyze(request);
        
        if (!response.success || !response.analysis) {
          lastError = response.error?.message || 'Vision analysis failed';
          
          if (!response.error?.retryable) {
            break;
          }
          
          await this.delay(this.config.retryDelayMs * attempts);
          continue;
        }
        
        // Validate the response against our schema
        const validated = this.validateAnalysis(response.analysis);
        
        if (!validated.success) {
          lastError = `Invalid vision response: ${validated.error}`;
          break;
        }
        
        return {
          success: true,
          analysis: validated.data,
          modelId: this.provider.modelId,
          promptVersion: this.provider.promptVersion,
          tokensUsed: response.usage.totalTokens,
          processingTimeMs: Date.now() - startTime,
        };
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempts <= this.config.retryAttempts) {
          await this.delay(this.config.retryDelayMs * attempts);
        }
      }
    }
    
    return {
      success: false,
      modelId: this.provider.modelId,
      promptVersion: this.provider.promptVersion,
      tokensUsed: 0,
      processingTimeMs: Date.now() - startTime,
      error: lastError,
    };
  }
  
  /**
   * Validate vision analysis against schema
   */
  private validateAnalysis(analysis: unknown): { 
    success: boolean; 
    data?: VisionAnalysis; 
    error?: string 
  } {
    try {
      const result = VisionAnalysisSchema.safeParse(analysis);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        };
      }
      
      return {
        success: true,
        data: result.data as VisionAnalysis,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }
  
  /**
   * Create a vision result record for storage
   */
  createVisionResult(
    assetId: string,
    inputHash: string,
    output: VisionOutput
  ): VisionResult | null {
    if (!output.success || !output.analysis) {
      return null;
    }
    
    return {
      id: nanoid(),
      assetId,
      modelId: output.modelId,
      promptVersion: output.promptVersion,
      inputHash,
      result: output.analysis,
      tokensUsed: output.tokensUsed,
      processingTimeMs: output.processingTimeMs,
      createdAt: new Date(),
    };
  }
  
  /**
   * Check provider health
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    return this.provider.healthCheck();
  }
  
  /**
   * Get provider info
   */
  getProviderInfo(): { providerId: string; modelId: string; promptVersion: string } {
    return {
      providerId: this.provider.providerId,
      modelId: this.provider.modelId,
      promptVersion: this.provider.promptVersion,
    };
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a vision analyzer instance
 */
export function createVisionAnalyzer(
  provider: IVisionProvider,
  config?: Partial<VisionAnalyzerConfig>
): VisionAnalyzer {
  return new VisionAnalyzer(provider, config);
}
