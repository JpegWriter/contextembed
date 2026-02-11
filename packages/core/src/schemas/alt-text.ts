/**
 * Alt Text Engine — Zod Schema + Prompt Builder
 *
 * Strict validation schema for LLM-generated alt text output,
 * plus deterministic prompt construction per AltTextMode.
 */

import { z } from 'zod';
import type { AltTextInput, AltTextMode, AltTextOutput } from '../types/alt-text';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

/**
 * Focus keyphrase must be ≤ 4 words.
 * e.g. "luxury wedding photography" ✓   "the big red house on the hill" ✗
 */
const FocusKeyphraseSchema = z
  .string()
  .min(2)
  .max(60)
  .refine(
    (val) => val.trim().split(/\s+/).length <= 4,
    { message: 'Focus keyphrase must be 4 words or fewer' },
  );

/**
 * Full alt-text output schema.
 * Length constraints are intentionally strict — the prompt tells the LLM
 * the exact limits, and Zod rejects anything that violates them.
 */
export const AltTextOutputSchema = z.object({
  alt_text_short: z
    .string()
    .min(30, 'alt_text_short must be at least 30 characters')
    .max(140, 'alt_text_short must be at most 140 characters'),

  alt_text_accessibility: z
    .string()
    .min(60, 'alt_text_accessibility must be at least 60 characters')
    .max(240, 'alt_text_accessibility must be at most 240 characters'),

  caption: z
    .string()
    .min(20, 'caption must be at least 20 characters')
    .max(200, 'caption must be at most 200 characters'),

  description: z
    .string()
    .min(80, 'description must be at least 80 characters')
    .max(900, 'description must be at most 900 characters'),

  focus_keyphrase: FocusKeyphraseSchema,

  safety_notes: z.string().max(500).nullish(),
});

// Re-export the inferred type for convenience
export type AltTextOutputParsed = z.infer<typeof AltTextOutputSchema>;

// ============================================================================
// PROMPT VERSION (bump when changing prompts)
// ============================================================================

export const ALT_TEXT_PROMPT_VERSION = '1.0.0';

// ============================================================================
// PROMPT BUILDER
// ============================================================================

/**
 * Mode-specific style instructions appended to the system prompt.
 */
const MODE_DIRECTIVES: Record<AltTextMode, string> = {
  seo: `STYLE: SEO-OPTIMISED
- Lead with the focus keyphrase naturally
- Front-load important keywords in alt_text_short
- Use action verbs and concrete nouns
- Avoid generic filler ("beautiful", "amazing")
- alt_text_short should read like a Google image snippet`,

  accessibility: `STYLE: ACCESSIBILITY / WCAG 2.1
- Describe what a sighted person would see, in reading order
- Include spatial relationships ("left", "foreground")
- Mention text visible in the image
- Do NOT start with "Image of" or "Photo of"
- alt_text_accessibility should let a blind user form a mental picture`,

  editorial: `STYLE: EDITORIAL / BRAND VOICE
- Write in a storytelling voice that matches the brand
- Weave emotional tone and narrative context
- Caption should work as a standalone social caption
- description should read like a magazine sidebar`,

  social: `STYLE: SOCIAL MEDIA
- Conversational, scroll-stopping tone
- Caption should work as an Instagram or LinkedIn caption
- Include a subtle call-to-action vibe
- Keep alt_text_short punchy and shareable`,
};

/**
 * Builds the system + user prompt pair for the alt-text generator.
 *
 * @returns  `{ system, user }` — ready to pass to OpenAI
 */
export function buildAltTextPrompt(
  input: AltTextInput,
  mode: AltTextMode,
): { system: string; user: string } {
  // ── System prompt ──
  const system = `You are the ContextEmbed Alt Text Engine.
Your ONLY job is to return a single JSON object with EXACTLY these keys:

  alt_text_short        (string, 30-140 chars)
  alt_text_accessibility (string, 60-240 chars)
  caption               (string, 20-200 chars)
  description           (string, 80-900 chars)
  focus_keyphrase       (string, max 4 words)
  safety_notes          (string or null)

## HARD RULES
1. Output MUST be a single valid JSON object — no markdown, no backticks, no explanation.
2. Every string length constraint is absolute — violating it is a schema error.
3. focus_keyphrase MUST be 4 words or fewer.
4. Do NOT start alt text with "Image of", "Photo of", or "Picture of".
5. alt_text_short must be a COMPLETE sentence — never truncated.
6. If people are identifiable, set safety_notes to describe the concern.
7. No invented details — only describe what the image analysis reports.

## ${MODE_DIRECTIVES[mode]}
`;

  // ── User prompt ──
  const parts: string[] = [];

  parts.push('## IMAGE ANALYSIS');
  parts.push(`Headline: ${input.headline}`);
  parts.push(`Description: ${input.description}`);
  parts.push(`Keywords: ${input.keywords.join(', ')}`);

  if (input.sceneType) parts.push(`Scene: ${input.sceneType}`);
  if (input.subjects?.length) parts.push(`Subjects: ${input.subjects.join(', ')}`);
  if (input.mood) parts.push(`Mood: ${input.mood}`);

  if (input.brandName || input.industry) {
    parts.push('');
    parts.push('## BRAND CONTEXT');
    if (input.brandName) parts.push(`Brand: ${input.brandName}`);
    if (input.industry) parts.push(`Industry: ${input.industry}`);
  }

  if (input.userComment) {
    parts.push('');
    parts.push('## USER CONTEXT (highest priority)');
    parts.push(input.userComment);
  }

  if (input.focusKeyphrase) {
    parts.push('');
    parts.push(`## REQUESTED FOCUS KEYPHRASE: "${input.focusKeyphrase}"`);
    parts.push('Incorporate this keyphrase naturally into alt_text_short and description.');
  }

  parts.push('');
  parts.push('Respond with the JSON object now.');

  const user = parts.join('\n');

  return { system, user };
}

// ============================================================================
// FALLBACK BUILDER
// ============================================================================

/**
 * Builds a safe deterministic fallback when the LLM call fails.
 * Uses the input's headline/description verbatim so there is always output.
 */
export function buildFallbackOutput(input: AltTextInput): AltTextOutput {
  const shortAlt = (input.headline || 'Image').slice(0, 140).padEnd(30, '.');
  const longAlt = (input.description || input.headline || 'Image description')
    .slice(0, 240)
    .padEnd(60, '.');
  const caption = (input.headline || 'Image').slice(0, 200).padEnd(20, '.');
  const desc = (input.description || input.headline || 'Image')
    .slice(0, 900)
    .padEnd(80, '.');
  const keyphrase = input.focusKeyphrase
    || input.keywords.slice(0, 3).join(' ')
    || 'image';

  return {
    alt_text_short: shortAlt,
    alt_text_accessibility: longAlt,
    caption,
    description: desc,
    focus_keyphrase: keyphrase.split(/\s+/).slice(0, 4).join(' '),
    safety_notes: undefined,
  };
}
