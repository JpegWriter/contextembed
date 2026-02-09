/**
 * Metadata Synthesizer Service
 * Orchestrates metadata generation using the LLM provider
 */

import { ILLMProvider, LLMRequest } from '../interfaces/llm-provider';
import { VisionAnalysis, SynthesizedMetadata, MetadataResult } from '../types/domain';
import { OnboardingProfile } from '../types/onboarding';
import { SynthesisOutput } from '../types/pipeline';
import { SynthesizedMetadataSchema } from '../schemas/metadata';
import { validateFieldValue, FIELD_MAP } from '../types/metadata';
import { nanoid } from 'nanoid';

export interface MetadataSynthesizerConfig {
  retryAttempts?: number;
  retryDelayMs?: number;
  enforceLengths?: boolean;
}

const DEFAULT_CONFIG: Required<MetadataSynthesizerConfig> = {
  retryAttempts: 2,
  retryDelayMs: 1000,
  enforceLengths: true,
};

/**
 * Metadata Synthesizer class
 * Wraps the LLM provider with validation, field enforcement, and result formatting
 */
export class MetadataSynthesizer {
  private provider: ILLMProvider;
  private config: Required<MetadataSynthesizerConfig>;
  
  constructor(
    provider: ILLMProvider,
    config: Partial<MetadataSynthesizerConfig> = {}
  ) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Synthesize metadata from vision analysis and context
   */
  async synthesize(
    visionAnalysis: VisionAnalysis,
    onboardingProfile: OnboardingProfile,
    userComment?: string,
    eventContext?: {
      eventId: string;
      eventName?: string;
      eventDate?: string;
      storySequence?: number;
      galleryId?: string;
      galleryName?: string;
    }
  ): Promise<SynthesisOutput> {
    const startTime = Date.now();
    
    const request: LLMRequest = {
      visionAnalysis,
      onboardingProfile,
      userComment,
      eventContext,
    };
    
    let lastError: string | undefined;
    let attempts = 0;
    
    while (attempts <= this.config.retryAttempts) {
      attempts++;
      
      try {
        const response = await this.provider.synthesize(request);
        
        if (!response.success || !response.metadata) {
          lastError = response.error?.message || 'Metadata synthesis failed';
          
          if (!response.error?.retryable) {
            break;
          }
          
          await this.delay(this.config.retryDelayMs * attempts);
          continue;
        }
        
        // Validate and enforce field lengths
        const validated = this.validateAndEnforce(response.metadata);
        
        if (!validated.success) {
          lastError = `Invalid metadata response: ${validated.error}`;
          break;
        }
        
        return {
          success: true,
          metadata: validated.data,
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
   * Validate metadata against schema and enforce field lengths
   */
  private validateAndEnforce(metadata: unknown): {
    success: boolean;
    data?: SynthesizedMetadata;
    error?: string;
  } {
    try {
      // First, validate against schema
      const schemaResult = SynthesizedMetadataSchema.safeParse(metadata);
      
      if (!schemaResult.success) {
        return {
          success: false,
          error: schemaResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        };
      }
      
      let data = schemaResult.data as SynthesizedMetadata;
      
      // Enforce field lengths if configured
      if (this.config.enforceLengths) {
        data = this.enforceFieldLengths(data);
      }
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }
  
  /**
   * Enforce maximum field lengths by truncating if necessary
   */
  private enforceFieldLengths(metadata: SynthesizedMetadata): SynthesizedMetadata {
    const enforced = { ...metadata };
    
    // Enforce string fields
    for (const [key, value] of Object.entries(enforced)) {
      if (typeof value === 'string' && FIELD_MAP[key]) {
        const validation = validateFieldValue(key, value);
        if (validation.truncated && typeof validation.truncated === 'string') {
          (enforced as Record<string, unknown>)[key] = validation.truncated;
        }
      }
    }
    
    // Enforce keywords array
    if (enforced.keywords) {
      const validation = validateFieldValue('keywords', enforced.keywords);
      if (validation.truncated && Array.isArray(validation.truncated)) {
        enforced.keywords = validation.truncated;
      }
    }
    
    return enforced;
  }
  
  /**
   * Apply rights info from profile to metadata
   */
  applyRightsInfo(
    metadata: SynthesizedMetadata,
    profile: OnboardingProfile
  ): SynthesizedMetadata {
    return {
      ...metadata,
      creator: profile.rights.creatorName,
      copyright: this.interpolateCopyright(profile.rights.copyrightTemplate),
      credit: profile.rights.creditTemplate,
      source: profile.rights.studioName || profile.rights.creatorName,
      usageTerms: profile.rights.usageTermsTemplate,
    };
  }
  
  /**
   * Interpolate copyright template with current year
   */
  private interpolateCopyright(template: string): string {
    const year = new Date().getFullYear();
    return template
      .replace(/\{year\}/gi, year.toString())
      .replace(/\{YEAR\}/g, year.toString());
  }
  
  /**
   * Create a metadata result record for storage
   */
  createMetadataResult(
    assetId: string,
    visionResultId: string,
    onboardingProfileId: string,
    inputHash: string,
    output: SynthesisOutput
  ): MetadataResult | null {
    if (!output.success || !output.metadata) {
      return null;
    }
    
    return {
      id: nanoid(),
      assetId,
      visionResultId,
      onboardingProfileId,
      modelId: output.modelId,
      promptVersion: output.promptVersion,
      inputHash,
      result: output.metadata,
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
 * Create a metadata synthesizer instance
 */
export function createMetadataSynthesizer(
  provider: ILLMProvider,
  config?: Partial<MetadataSynthesizerConfig>
): MetadataSynthesizer {
  return new MetadataSynthesizer(provider, config);
}
