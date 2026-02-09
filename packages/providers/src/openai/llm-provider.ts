/**
 * OpenAI LLM Provider
 * Implements ILLMProvider for metadata synthesis using GPT-4
 */

import OpenAI from 'openai';
import {
  ILLMProvider,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
} from '@contextembed/core';
import {
  SynthesizedMetadataSchema,
  METADATA_PROMPT_VERSION,
  METADATA_SYSTEM_PROMPT,
  getMetadataSynthesisPrompt,
} from '@contextembed/core';

export interface OpenAILLMConfig extends LLMProviderConfig {
  organization?: string;
}

/**
 * OpenAI LLM Provider implementation
 */
export class OpenAILLMProvider implements ILLMProvider {
  readonly providerId = 'openai';
  readonly modelId: string;
  readonly promptVersion = METADATA_PROMPT_VERSION;
  
  private client: OpenAI;
  private maxTokens: number;
  private temperature: number;
  
  constructor(config: OpenAILLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseUrl,
    });
    
    this.modelId = config.model || 'gpt-4o';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.5;
  }
  
  /**
   * Synthesize metadata from vision analysis and context
   */
  async synthesize(request: LLMRequest): Promise<LLMResponse> {
    const startedAt = new Date();
    
    try {
      const ctx = request.onboardingProfile.confirmedContext;
      
      // Extract context from onboarding profile
      const brandContext = {
        brandName: ctx.brandName,
        industry: ctx.industry,
        niche: ctx.niche,
        services: ctx.services,
        targetAudience: ctx.targetAudience,
        brandVoice: ctx.brandVoice,
        location: ctx.location,
        // Authority fields for enhanced SEO signals
        yearsExperience: ctx.yearsExperience,
        credentials: ctx.credentials,
        specializations: ctx.specializations,
        awardsRecognition: ctx.awardsRecognition,
        clientTypes: ctx.clientTypes,
        keyDifferentiator: ctx.keyDifferentiator,
        pricePoint: ctx.pricePoint,
        brandStory: ctx.brandStory,
        serviceArea: ctx.serviceArea,
        defaultEventType: ctx.defaultEventType,
        typicalDeliverables: ctx.typicalDeliverables,
      };
      
      const rights = {
        creatorName: request.onboardingProfile.rights.creatorName,
        studioName: request.onboardingProfile.rights.studioName,
        copyrightTemplate: this.interpolateCopyright(
          request.onboardingProfile.rights.copyrightTemplate
        ),
        creditTemplate: request.onboardingProfile.rights.creditTemplate,
        usageTermsTemplate: request.onboardingProfile.rights.usageTermsTemplate,
        website: request.onboardingProfile.rights.website,
        email: request.onboardingProfile.rights.email,
      };
      
      const preferences = {
        primaryLanguage: request.onboardingProfile.preferences.primaryLanguage,
        keywordStyle: request.onboardingProfile.preferences.keywordStyle,
        maxKeywords: request.onboardingProfile.preferences.maxKeywords,
        locationBehavior: request.onboardingProfile.preferences.locationBehavior,
      };
      
      const userPrompt = getMetadataSynthesisPrompt(
        request.visionAnalysis,
        brandContext,
        rights,
        preferences,
        request.userComment,
        request.eventContext
      );
      
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'system',
            content: METADATA_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        response_format: { type: 'json_object' },
      });
      
      const completedAt = new Date();
      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        return this.createErrorResponse(
          'NO_CONTENT',
          'No content in response',
          true,
          startedAt,
          completedAt
        );
      }
      
      // Parse the JSON response
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return this.createErrorResponse(
          'PARSE_ERROR',
          'Failed to parse JSON response',
          true,
          startedAt,
          completedAt
        );
      }
      
      // Validate against schema
      const validated = SynthesizedMetadataSchema.safeParse(parsed);
      
      if (!validated.success) {
        return this.createErrorResponse(
          'VALIDATION_ERROR',
          `Schema validation failed: ${validated.error.message}`,
          true,
          startedAt,
          completedAt,
          { rawResponse: parsed }
        );
      }
      
      return {
        success: true,
        metadata: validated.data,
        rawResponse: parsed,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        timing: {
          startedAt,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
        },
      };
      
    } catch (error) {
      const completedAt = new Date();
      
      if (error instanceof OpenAI.APIError) {
        return this.createErrorResponse(
          error.code || 'API_ERROR',
          error.message,
          this.isRetryableError(error),
          startedAt,
          completedAt,
          { status: error.status }
        );
      }
      
      return this.createErrorResponse(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        false,
        startedAt,
        completedAt
      );
    }
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
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 429 || status === 500 || status === 503) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Create an error response
   */
  private createErrorResponse(
    code: string,
    message: string,
    retryable: boolean,
    startedAt: Date,
    completedAt: Date = new Date(),
    details?: unknown
  ): LLMResponse {
    return {
      success: false,
      error: {
        code,
        message,
        retryable,
        details,
      },
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      timing: {
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      },
    };
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      await this.client.models.list();
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }
  
  /**
   * Get configuration
   */
  getConfig(): { model: string; maxTokens: number } {
    return {
      model: this.modelId,
      maxTokens: this.maxTokens,
    };
  }
}

/**
 * Create an OpenAI LLM provider
 */
export function createOpenAILLMProvider(
  config: OpenAILLMConfig
): OpenAILLMProvider {
  return new OpenAILLMProvider(config);
}
