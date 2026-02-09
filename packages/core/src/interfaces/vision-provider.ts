/**
 * Vision Provider Interface
 * Abstracts vision analysis capabilities (OpenAI, Claude, etc.)
 */

import { VisionAnalysis } from '../types/domain';

export interface VisionProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}

export interface VisionRequest {
  imageBase64?: string;
  imageUrl?: string;
  imagePath?: string;
  detailLevel?: 'low' | 'high' | 'auto';
}

export interface VisionResponse {
  success: boolean;
  analysis?: VisionAnalysis;
  rawResponse?: unknown;
  error?: VisionError;
  usage: VisionUsage;
  timing: {
    startedAt: Date;
    completedAt: Date;
    durationMs: number;
  };
}

export interface VisionError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export interface VisionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  imageTokens?: number;
}

/**
 * Vision Provider interface - implement this for different AI providers
 */
export interface IVisionProvider {
  readonly providerId: string;
  readonly modelId: string;
  readonly promptVersion: string;
  
  /**
   * Analyze an image and return structured vision analysis
   */
  analyze(request: VisionRequest): Promise<VisionResponse>;
  
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
 * Factory function type for creating vision providers
 */
export type VisionProviderFactory = (config: VisionProviderConfig) => IVisionProvider;
