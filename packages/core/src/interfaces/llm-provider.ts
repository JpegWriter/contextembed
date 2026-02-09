/**
 * LLM Provider Interface
 * Abstracts text generation capabilities for metadata synthesis
 */

import { SynthesizedMetadata } from '../types/domain';
import { OnboardingProfile } from '../types/onboarding';
import { VisionAnalysis } from '../types/domain';

export interface LLMProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}

export interface LLMRequest {
  visionAnalysis: VisionAnalysis;
  onboardingProfile: OnboardingProfile;
  userComment?: string;
  eventContext?: {
    eventId: string;
    eventName?: string;
    eventDate?: string;
    storySequence?: number;
    galleryId?: string;
    galleryName?: string;
  };
}

export interface LLMResponse {
  success: boolean;
  metadata?: SynthesizedMetadata;
  rawResponse?: unknown;
  error?: LLMError;
  usage: LLMUsage;
  timing: {
    startedAt: Date;
    completedAt: Date;
    durationMs: number;
  };
}

export interface LLMError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * LLM Provider interface - implement this for different AI providers
 */
export interface ILLMProvider {
  readonly providerId: string;
  readonly modelId: string;
  readonly promptVersion: string;
  
  /**
   * Synthesize metadata from vision analysis and context
   */
  synthesize(request: LLMRequest): Promise<LLMResponse>;
  
  /**
   * Check if the provider is properly configured and accessible
   */
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;
  
  /**
   * Get the current configuration (without sensitive data)
   */
  getConfig(): { model: string; maxTokens: number };
}

/**
 * Factory function type for creating LLM providers
 */
export type LLMProviderFactory = (config: LLMProviderConfig) => ILLMProvider;
