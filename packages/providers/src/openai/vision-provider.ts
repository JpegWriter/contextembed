/**
 * OpenAI Vision Provider
 * Implements IVisionProvider using OpenAI's GPT-4 Vision API
 */

import OpenAI from 'openai';
import {
  IVisionProvider,
  VisionProviderConfig,
  VisionRequest,
  VisionResponse,
} from '@contextembed/core';
import { 
  VisionAnalysisSchema, 
  VISION_PROMPT_VERSION,
  VISION_SYSTEM_PROMPT,
  getVisionUserPrompt,
} from '@contextembed/core';

export interface OpenAIVisionConfig extends VisionProviderConfig {
  organization?: string;
}

/**
 * OpenAI Vision Provider implementation
 */
export class OpenAIVisionProvider implements IVisionProvider {
  readonly providerId = 'openai';
  readonly modelId: string;
  readonly promptVersion = VISION_PROMPT_VERSION;
  
  private client: OpenAI;
  private maxTokens: number;
  private temperature: number;
  
  constructor(config: OpenAIVisionConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseUrl,
    });
    
    this.modelId = config.model || 'gpt-4o';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.3;
  }
  
  /**
   * Analyze an image using OpenAI Vision
   */
  async analyze(request: VisionRequest): Promise<VisionResponse> {
    const startedAt = new Date();
    
    try {
      // Build the image content
      const imageContent = this.buildImageContent(request);
      
      if (!imageContent) {
        return this.createErrorResponse(
          'NO_IMAGE',
          'No image provided (base64, URL, or path required)',
          false,
          startedAt
        );
      }
      
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'system',
            content: VISION_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              imageContent,
              {
                type: 'text',
                text: getVisionUserPrompt(),
              },
            ],
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
      const validated = VisionAnalysisSchema.safeParse(parsed);
      
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
        analysis: validated.data,
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
   * Build image content for the API request
   */
  private buildImageContent(request: VisionRequest): OpenAI.ChatCompletionContentPartImage | null {
    if (request.imageBase64) {
      // Detect image type from base64 header or default to jpeg
      let mediaType = 'image/jpeg';
      if (request.imageBase64.startsWith('/9j/')) {
        mediaType = 'image/jpeg';
      } else if (request.imageBase64.startsWith('iVBORw')) {
        mediaType = 'image/png';
      }
      
      return {
        type: 'image_url',
        image_url: {
          url: `data:${mediaType};base64,${request.imageBase64}`,
          detail: request.detailLevel || 'high',
        },
      };
    }
    
    if (request.imageUrl) {
      return {
        type: 'image_url',
        image_url: {
          url: request.imageUrl,
          detail: request.detailLevel || 'high',
        },
      };
    }
    
    // imagePath would need to be converted to base64 or URL first
    // This is handled by the caller
    return null;
  }
  
  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    // Rate limits and server errors are retryable
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
  ): VisionResponse {
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
      // Simple models list to verify API key works
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
 * Create an OpenAI Vision provider
 */
export function createOpenAIVisionProvider(
  config: OpenAIVisionConfig
): OpenAIVisionProvider {
  return new OpenAIVisionProvider(config);
}
