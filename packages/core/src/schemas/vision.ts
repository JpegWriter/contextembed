/**
 * Zod schemas for Vision API responses
 */

import { z } from 'zod';

export const SubjectInfoSchema = z.object({
  type: z.enum(['person', 'animal', 'object', 'building', 'vehicle', 'nature', 'food', 'other']),
  description: z.string().max(500),
  prominence: z.enum(['primary', 'secondary', 'background']),
  count: z.number().int().positive().optional(),
});

export const SceneInfoSchema = z.object({
  type: z.enum(['indoor', 'outdoor', 'studio', 'mixed', 'abstract']),
  setting: z.string().max(200),
  timeOfDay: z.enum(['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night', 'unknown']).optional(),
  weather: z.string().max(100).optional(),
});

export const LocationCuesSchema = z.object({
  possibleType: z.enum(['urban', 'rural', 'suburban', 'natural', 'industrial', 'commercial', 'unknown']).optional(),
  landmarks: z.array(z.string().max(100)).max(10).optional(),
  hints: z.array(z.string().max(200)).max(10),
  confidence: z.enum(['none', 'low', 'medium', 'high']),
});

export const TextInfoSchema = z.object({
  text: z.string().max(500),
  type: z.enum(['sign', 'label', 'overlay', 'watermark', 'other']),
  language: z.string().max(50).optional(),
});

export const VisionAnalysisSchema = z.object({
  subjects: z.array(SubjectInfoSchema).max(20),
  scene: SceneInfoSchema,
  emotions: z.array(z.string().max(50)).max(10),
  styleCues: z.array(z.string().max(100)).max(10),
  locationCues: LocationCuesSchema,
  notableObjects: z.array(z.string().max(100)).max(30),
  textFound: z.array(TextInfoSchema).max(20),
  qualityIssues: z.array(z.string().max(200)).max(10),
  colorPalette: z.array(z.string().max(50)).max(10),
  composition: z.string().max(200),
  rawDescription: z.string().max(2000),
});

export type VisionAnalysisInput = z.infer<typeof VisionAnalysisSchema>;

/**
 * Vision API prompt version - increment when changing the prompt
 */
export const VISION_PROMPT_VERSION = '1.0.0';

/**
 * System prompt for vision analysis
 */
export const VISION_SYSTEM_PROMPT = `You are an expert image analyst for a metadata embedding system. Analyze the provided image and return a structured JSON response.

Your analysis will be used to generate SEO-optimized metadata (titles, descriptions, keywords) for images.

IMPORTANT RULES:
1. Be descriptive but factual - describe what you see, not what you assume
2. Do NOT identify specific individuals by name unless there's clear text/signage
3. Do NOT guess specific locations unless there are clear identifying features (signs, landmarks)
4. Focus on visual elements, composition, style, mood, and searchable attributes
5. Note any text visible in the image
6. Identify potential quality issues (blur, noise, over/underexposure)

Return a JSON object matching this structure exactly.`;

/**
 * Get the user prompt for vision analysis
 */
export function getVisionUserPrompt(): string {
  return `Analyze this image and return a JSON object with the following structure:

{
  "subjects": [
    {
      "type": "person|animal|object|building|vehicle|nature|food|other",
      "description": "brief description of the subject",
      "prominence": "primary|secondary|background",
      "count": number (optional, for multiple similar subjects)
    }
  ],
  "scene": {
    "type": "indoor|outdoor|studio|mixed|abstract",
    "setting": "description of the setting/environment",
    "timeOfDay": "dawn|morning|midday|afternoon|evening|night|unknown" (optional),
    "weather": "weather conditions if visible" (optional)
  },
  "emotions": ["list of emotional tones conveyed"],
  "styleCues": ["professional", "candid", "artistic", "documentary", etc.],
  "locationCues": {
    "possibleType": "urban|rural|suburban|natural|industrial|commercial|unknown" (optional),
    "landmarks": ["any identifiable landmarks"] (optional),
    "hints": ["any location hints without specific identification"],
    "confidence": "none|low|medium|high"
  },
  "notableObjects": ["list of notable objects visible"],
  "textFound": [
    {
      "text": "exact text found",
      "type": "sign|label|overlay|watermark|other",
      "language": "detected language" (optional)
    }
  ],
  "qualityIssues": ["any quality problems noticed"],
  "colorPalette": ["dominant colors"],
  "composition": "brief description of composition style",
  "rawDescription": "A detailed 2-3 sentence description of the entire image"
}

Respond ONLY with valid JSON, no additional text.`;
}
