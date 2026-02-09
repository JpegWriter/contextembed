/**
 * Provider Factory
 * Creates provider instances based on configuration
 */

import { IVisionProvider, ILLMProvider } from '@contextembed/core';
import { OpenAIVisionProvider, OpenAIVisionConfig } from './openai/vision-provider';
import { OpenAILLMProvider, OpenAILLMConfig } from './openai/llm-provider';

export type ProviderType = 'openai' | 'anthropic' | 'google';

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
  organization?: string;
}

/**
 * Create a vision provider based on configuration
 */
export function createVisionProvider(config: ProviderConfig): IVisionProvider {
  switch (config.type) {
    case 'openai':
      return new OpenAIVisionProvider({
        apiKey: config.apiKey,
        model: config.model || 'gpt-4o',
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        baseUrl: config.baseUrl,
        organization: config.organization,
      });
      
    case 'anthropic':
      // Stub for future implementation
      throw new Error('Anthropic provider not yet implemented');
      
    case 'google':
      // Stub for future implementation
      throw new Error('Google provider not yet implemented');
      
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

/**
 * Create an LLM provider based on configuration
 */
export function createLLMProvider(config: ProviderConfig): ILLMProvider {
  switch (config.type) {
    case 'openai':
      return new OpenAILLMProvider({
        apiKey: config.apiKey,
        model: config.model || 'gpt-4o',
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        baseUrl: config.baseUrl,
        organization: config.organization,
      });
      
    case 'anthropic':
      // Stub for future implementation
      throw new Error('Anthropic provider not yet implemented');
      
    case 'google':
      // Stub for future implementation
      throw new Error('Google provider not yet implemented');
      
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

/**
 * Get default provider configuration from environment
 */
export function getDefaultProviderConfig(): ProviderConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  return {
    type: 'openai',
    apiKey,
    model: process.env.VISION_MODEL || process.env.LLM_MODEL || 'gpt-4o',
    maxTokens: parseInt(process.env.VISION_MAX_TOKENS || '4096', 10),
  };
}
