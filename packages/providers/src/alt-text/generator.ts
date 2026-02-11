/**
 * Alt Text Generator Service
 *
 * Calls OpenAI with the deterministic alt-text prompt, validates the response
 * with Zod, retries once on validation failure, and falls back to a safe
 * deterministic output if all else fails.
 */

import OpenAI from 'openai';
import {
  AltTextOutputSchema,
  buildAltTextPrompt,
  buildFallbackOutput,
  ALT_TEXT_PROMPT_VERSION,
} from '@contextembed/core';
import type {
  AltTextInput,
  AltTextMode,
  AltTextOutput,
  AltTextResult,
  AltTextGeneratorConfig,
} from '@contextembed/core';

// ============================================================================
// LOGGER
// ============================================================================

const LOG_PREFIX = '[CE:AltText]';

function log(level: 'info' | 'warn' | 'error', msg: string, data?: Record<string, unknown>) {
  const line = `${LOG_PREFIX} ${msg}`;
  if (level === 'error') console.error(line, data ?? '');
  else if (level === 'warn') console.warn(line, data ?? '');
  else console.log(line, data ?? '');
}

// ============================================================================
// GENERATOR CLASS
// ============================================================================

export class AltTextGenerator {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private retryOnFailure: boolean;

  constructor(config: AltTextGeneratorConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'gpt-4o';
    this.temperature = config.temperature ?? 0.4;
    this.maxTokens = config.maxTokens ?? 1024;
    this.retryOnFailure = config.retryOnFailure ?? true;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Generate structured alt text for an image.
   *
   * Flow:
   *  1. Build prompt from input + mode
   *  2. Call OpenAI (JSON mode)
   *  3. Parse + validate with Zod
   *  4. On validation failure → retry once with tighter instructions
   *  5. On total failure → return deterministic fallback
   */
  async generate(input: AltTextInput, mode: AltTextMode = 'seo'): Promise<AltTextResult> {
    const startMs = Date.now();
    let totalTokens = 0;

    // ── Attempt 1 ──
    const attempt1 = await this.callLLM(input, mode);
    totalTokens += attempt1.tokens;

    if (attempt1.output) {
      log('info', `Generated alt text (mode=${mode}) in ${Date.now() - startMs}ms`);
      return {
        success: true,
        output: attempt1.output,
        mode,
        usedFallback: false,
        durationMs: Date.now() - startMs,
        tokensUsed: totalTokens,
      };
    }

    // ── Attempt 2 (retry) ──
    if (this.retryOnFailure) {
      log('warn', `First attempt failed (${attempt1.error}), retrying...`);
      const attempt2 = await this.callLLM(input, mode, true);
      totalTokens += attempt2.tokens;

      if (attempt2.output) {
        log('info', `Retry succeeded (mode=${mode}) in ${Date.now() - startMs}ms`);
        return {
          success: true,
          output: attempt2.output,
          mode,
          usedFallback: false,
          durationMs: Date.now() - startMs,
          tokensUsed: totalTokens,
        };
      }

      log('error', `Retry also failed: ${attempt2.error}`);
    }

    // ── Fallback ──
    log('warn', 'Using deterministic fallback');
    const fallback = buildFallbackOutput(input);

    return {
      success: false,
      output: fallback,
      mode,
      usedFallback: true,
      error: attempt1.error || 'Generation failed',
      durationMs: Date.now() - startMs,
      tokensUsed: totalTokens,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private async callLLM(
    input: AltTextInput,
    mode: AltTextMode,
    isRetry = false,
  ): Promise<{ output: AltTextOutput | null; tokens: number; error?: string }> {
    try {
      const { system, user } = buildAltTextPrompt(input, mode);

      const retryAddendum = isRetry
        ? '\n\nPREVIOUS ATTEMPT FAILED VALIDATION. Ensure every string respects the exact char limits. ' +
          'alt_text_short: 30-140 chars. alt_text_accessibility: 60-240 chars. ' +
          'caption: 20-200 chars. description: 80-900 chars. focus_keyphrase: max 4 words.'
        : '';

      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system + retryAddendum },
          { role: 'user', content: user },
        ],
      });

      const tokens = response.usage?.total_tokens ?? 0;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        return { output: null, tokens, error: 'Empty response from LLM' };
      }

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return { output: null, tokens, error: `JSON parse error: ${content.slice(0, 200)}` };
      }

      // Validate with Zod
      const result = AltTextOutputSchema.safeParse(parsed);

      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        return { output: null, tokens, error: `Zod validation failed: ${issues}` };
      }

      return { output: result.data as AltTextOutput, tokens };
    } catch (err: any) {
      const msg = err instanceof OpenAI.APIError
        ? `OpenAI API ${err.status}: ${err.message}`
        : err.message || 'Unknown error';

      return { output: null, tokens: 0, error: msg };
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Creates an AltTextGenerator with default config from env vars.
 */
export function createAltTextGenerator(
  config?: Partial<AltTextGeneratorConfig>,
): AltTextGenerator {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for AltTextGenerator');
  }

  return new AltTextGenerator({
    apiKey,
    model: config?.model || process.env.ALT_TEXT_MODEL || 'gpt-4o',
    temperature: config?.temperature ?? 0.4,
    maxTokens: config?.maxTokens ?? 1024,
    retryOnFailure: config?.retryOnFailure ?? true,
  });
}
