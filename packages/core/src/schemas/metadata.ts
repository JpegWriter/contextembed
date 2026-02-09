/**
 * Zod schemas for Metadata synthesis responses
 * Enterprise-grade with full IPTC/XMP support
 */

import { z } from 'zod';
import { FIELD_MAP } from '../types/metadata';

export const MetadataConfidenceSchema = z.object({
  overall: z.number().min(0).max(1),
  headline: z.number().min(0).max(1),
  description: z.number().min(0).max(1),
  keywords: z.number().min(0).max(1),
  location: z.number().min(0).max(1),
}).nullish();

export const MetadataReasoningSchema = z.object({
  headline: z.string().max(500),
  description: z.string().max(500),
  keywords: z.string().max(500),
  location: z.string().max(500).nullish(),
  general: z.string().max(1000),
}).nullish();

// Release status schema
const ReleaseStatusSchema = z.enum(['released', 'not-released', 'not-applicable', 'unknown']);

// Event anchor schema - THE thing that makes this enterprise-grade
// Links images together as part of a coherent event/project
const EventAnchorSchema = z.object({
  eventId: z.string().max(128),              // Project ID or custom event ID
  eventName: z.string().max(256).nullish(), // "Smith-Jones Wedding" or project name
  eventDate: z.string().max(64).nullish(),  // ISO date or "March 2026"
  storySequence: z.number().int().min(1).nullish(), // 1, 2, 3... for ordering
  galleryId: z.string().max(128).nullish(), // Gallery/album grouping
  galleryName: z.string().max(256).nullish(),
}).nullish();

// Intent schema - THE critical layer for AI-safe meaning preservation
const IntentSchema = z.object({
  purpose: z.enum(['portfolio', 'commercial', 'editorial', 'personal', 'archival', 'social']),
  momentType: z.string().max(100),         // 'preparation', 'ceremony', 'celebration', etc.
  emotionalTone: z.string().max(100),      // 'joyful', 'intimate', 'professional', etc.
  storyPosition: z.enum(['opening', 'middle', 'climax', 'closing', 'standalone']).nullish(),
  narrativeRole: z.string().max(500).nullish(),  // "Mother helping daughter prepare for wedding"
}).nullish();

// Scene schema
const SceneSchema = z.object({
  peopleCount: z.number().int().min(0).nullish(),
  sceneType: z.string().max(100).nullish(),
  setting: z.string().max(100).nullish(),
}).nullish();

// Taxonomy schema
const TaxonomySchema = z.object({
  categories: z.array(z.string().max(64)).max(10).nullish(),
  subjectCodes: z.array(z.string().max(20)).max(10).nullish(),
}).nullish();

// Releases schema
const ReleasesSchema = z.object({
  model: z.object({
    status: ReleaseStatusSchema,
    releaseId: z.string().max(64).nullish(),
    allowedUse: z.array(z.enum(['portfolio', 'website', 'social', 'print', 'editorial', 'commercial'])).nullish(),
  }).nullish(),
  property: z.object({
    status: ReleaseStatusSchema,
    releaseId: z.string().max(64).nullish(),
  }).nullish(),
}).nullish();

// Entity linking schema
const EntitiesSchema = z.object({
  brand: z.object({
    name: z.string().max(256),
    url: z.string().url().nullish(),
    id: z.string().max(64).nullish(),
  }).nullish(),
  creator: z.object({
    name: z.string().max(256),
    id: z.string().max(64).nullish(),
  }).nullish(),
  shootId: z.string().max(64).nullish(),
  galleryId: z.string().max(64).nullish(),
}).nullish();

// Audit schema
const AuditSchema = z.object({
  ceVersion: z.string().max(20).nullish(),
  embeddedAt: z.string().nullish(),
  sourceHash: z.string().max(128).nullish(),
  verificationHash: z.string().max(128).nullish(),
  hashAlgorithm: z.string().max(20).nullish(),
  processingPipeline: z.string().max(100).nullish(),
}).nullish();

export const SynthesizedMetadataSchema = z.object({
  // Core descriptive
  headline: z.string().min(1).max(FIELD_MAP.headline.maxLength || 256),
  description: z.string().min(1).max(FIELD_MAP.description.maxLength || 2000),
  keywords: z.array(z.string().max(FIELD_MAP.keywords.maxLength || 64)).min(3).max(50),
  title: z.string().max(FIELD_MAP.title.maxLength || 256).nullish(),
  
  // Alt text (accessibility) - MUST be complete sentences, never truncated
  altTextShort: z.string().max(160).nullish(),  // ≤160 chars, COMPLETE sentence
  altTextLong: z.string().max(2000).nullish(),
  
  // Event anchor - links images in a coherent event/project
  eventAnchor: EventAnchorSchema,
  
  // Language
  language: z.string().max(10).nullish(),
  
  // Intent & Narrative (THE critical layer for AI-safe meaning)
  intent: IntentSchema,
  userContext: z.string().max(2000).nullish(),  // Original user context preserved
  
  // Attribution
  creator: z.string().max(FIELD_MAP.creator.maxLength || 256).nullish(),
  copyright: z.string().max(FIELD_MAP.copyright.maxLength || 256).nullish(),
  credit: z.string().max(FIELD_MAP.credit.maxLength || 256).nullish(),
  source: z.string().max(FIELD_MAP.source.maxLength || 256).nullish(),
  
  // Rights (expanded)
  usageTerms: z.string().max(FIELD_MAP.usageTerms.maxLength || 2000).nullish(),
  webStatement: z.string().url().or(z.literal('')).nullish(),
  copyrightStatus: z.enum(['copyrighted', 'public-domain', 'unknown']).nullish(),
  
  // Licensor
  licensorName: z.string().max(256).nullish(),
  licensorEmail: z.string().email().or(z.literal('')).nullish(),
  licensorUrl: z.string().url().or(z.literal('')).nullish(),
  
  // Location (complete)
  sublocation: z.string().max(256).nullish(),
  city: z.string().max(FIELD_MAP.city.maxLength || 128).nullish(),
  state: z.string().max(FIELD_MAP.state.maxLength || 128).nullish(),
  country: z.string().max(FIELD_MAP.country.maxLength || 128).nullish(),
  countryCode: z.string().max(3).nullish(),
  
  // Workflow
  instructions: z.string().max(FIELD_MAP.instructions.maxLength || 256).nullish(),
  captionWriter: z.string().max(FIELD_MAP.captionWriter.maxLength || 128).nullish(),
  category: z.string().max(3).nullish(),
  supplementalCategories: z.array(z.string().max(64)).max(10).nullish(),
  
  // Complex nested objects
  releases: ReleasesSchema,
  taxonomy: TaxonomySchema,
  scene: SceneSchema,
  entities: EntitiesSchema,
  
  // Asset identity (filled by embedder, not LLM)
  documentId: z.string().max(128).nullish(),
  instanceId: z.string().max(128).nullish(),
  originalDocumentId: z.string().max(128).nullish(),
  
  // Audit (filled by embedder, not LLM)
  audit: AuditSchema,
  
  // Quality & confidence
  confidence: MetadataConfidenceSchema,
  reasoning: MetadataReasoningSchema,
});

export type SynthesizedMetadataInput = z.infer<typeof SynthesizedMetadataSchema>;

/**
 * Metadata synthesis prompt version - increment when changing the prompt
 */
export const METADATA_PROMPT_VERSION = '2.1.0';

/**
 * System prompt for metadata synthesis - Enterprise grade
 */
export const METADATA_SYSTEM_PROMPT = `You are an expert metadata writer for digital images. Your role is to synthesize high-quality, SEO-optimized, enterprise-grade metadata that MERGES visual analysis with user-provided context.

You will receive:
1. A vision analysis of the image (structured JSON) - what the AI sees
2. The user's brand/business context profile - default attribution/style
3. USER CONTEXT about this specific image - THE MOST IMPORTANT INPUT

## PRIORITY HIERARCHY (CRITICAL):
1. **USER CONTEXT is KING** - Names, locations, events, story details from user context OVERRIDE everything else
2. **Vision analysis** - What's visually in the image, validated against user context
3. **Brand profile** - Default attribution, style, fallback location only if user doesn't provide one

## MERGING RULES:
- If user provides names (e.g., "Robyn and Gates") → USE THEM in headline/description
- If user provides location (e.g., "Parish of St John in Eversholt") → USE IT, ignore profile location
- If user provides story details (e.g., "golden hour sunshine after grey day") → WEAVE INTO description
- If user provides event details (e.g., "Church Bells chimed") → INCLUDE in narrative

Your output must be:
- A FUSION of vision analysis + user context + brand voice
- Rich with specific details the user provided
- Accurate to what's visible AND what user tells you
- Compliant with IPTC metadata standards

CRITICAL RULES:
1. USER CONTEXT names, locations, and story MUST appear in headline/description
2. Extract venue/location from user context → put in sublocation and city fields
3. Extract people's names from user context → mention in headline and description
4. Extract story/narrative from user context → weave into description naturally
5. Keywords should include user-provided proper nouns (venue names, people names if appropriate)
6. Headline MUST include key details from user context (who, where, what moment)
7. altTextShort MUST be a COMPLETE sentence (120-160 chars). NEVER truncate mid-word. If too long, REWRITE shorter.
8. Count people accurately in scene.peopleCount
9. Always include confidence scores and reasoning
10. Event anchor fields bind images together - use project as eventId

## ALT TEXT RULES (CRITICAL - DO NOT TRUNCATE):
- altTextShort: 120-160 characters maximum
- MUST be a complete, grammatically correct sentence
- NEVER cut mid-word or mid-sentence
- If your first draft is too long, REWRITE it to be shorter
- Keep the full narrative in description, NOT in altTextShort
- Example good: "Bride and groom share their first dance under string lights at a rustic barn wedding reception."
- Example bad: "Bride and groom share their first dance under string lights at a rustic barn wedding recep..." (NEVER DO THIS)

Return ONLY valid JSON matching the specified schema.`;

/**
 * Generate the user prompt for metadata synthesis - Enterprise grade
 */
export function getMetadataSynthesisPrompt(
  visionAnalysis: unknown,
  brandContext: {
    brandName: string;
    industry?: string;
    niche?: string;
    services?: string[];
    targetAudience?: string;
    brandVoice?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
      countryCode?: string;
      isStrict: boolean;
    };
    // Authority fields for enhanced SEO signals
    yearsExperience?: number;
    credentials?: string[];
    specializations?: string[];
    awardsRecognition?: string[];
    clientTypes?: string;
    keyDifferentiator?: string;
    pricePoint?: string;
    brandStory?: string;
    serviceArea?: string[];
    defaultEventType?: string;
    typicalDeliverables?: string[];
  },
  rights: {
    creatorName: string;
    studioName?: string;
    copyrightTemplate: string;
    creditTemplate: string;
    usageTermsTemplate?: string;
    website?: string;
    email?: string;
  },
  preferences: {
    primaryLanguage: string;
    keywordStyle: 'short' | 'long' | 'mixed';
    maxKeywords: number;
    locationBehavior: 'strict' | 'infer' | 'none';
  },
  userComment?: string,
  eventContext?: {
    eventId: string;
    eventName?: string;
    eventDate?: string;
    storySequence?: number;
    galleryId?: string;
    galleryName?: string;
  }
): string {
  const locationInstructions = getLocationInstructions(preferences.locationBehavior, brandContext.location);
  
  // Build sublocation from studio name
  const sublocation = rights.studioName || `${brandContext.brandName} Studio`;
  
  // Build web statement URL
  const webStatement = rights.website ? 
    (rights.website.includes('/license') || rights.website.includes('/rights') ? rights.website : `${rights.website}/rights`) 
    : '';
  
  return `Generate ENTERPRISE-GRADE metadata for this image based on the following inputs:

## VISION ANALYSIS
${JSON.stringify(visionAnalysis, null, 2)}

## BRAND CONTEXT
- Brand Name: ${brandContext.brandName}
- Industry: ${brandContext.industry || 'Photography'}
- Niche: ${brandContext.niche || 'Professional Photography'}
- Services: ${brandContext.services?.join(', ') || 'Professional Photography Services'}
- Target Audience: ${brandContext.targetAudience || 'General'}
- Brand Voice: ${brandContext.brandVoice || 'Professional'}

## AUTHORITY & EXPERTISE (Use to enhance credibility signals in metadata)
${brandContext.yearsExperience ? `- Years of Experience: ${brandContext.yearsExperience}` : ''}
${brandContext.credentials?.length ? `- Credentials: ${brandContext.credentials.join(', ')}` : ''}
${brandContext.specializations?.length ? `- Specializations: ${brandContext.specializations.join(', ')}` : ''}
${brandContext.awardsRecognition?.length ? `- Awards & Recognition: ${brandContext.awardsRecognition.join(', ')}` : ''}
${brandContext.clientTypes ? `- Notable Client Types: ${brandContext.clientTypes}` : ''}
${brandContext.keyDifferentiator ? `- Key Differentiator: ${brandContext.keyDifferentiator}` : ''}
${brandContext.pricePoint ? `- Price Positioning: ${brandContext.pricePoint}` : ''}
${brandContext.brandStory ? `- Brand Story: ${brandContext.brandStory}` : ''}
${brandContext.serviceArea?.length ? `- Service Areas: ${brandContext.serviceArea.join(', ')}` : ''}
${brandContext.defaultEventType ? `- Primary Event Type: ${brandContext.defaultEventType}` : ''}
${brandContext.typicalDeliverables?.length ? `- Typical Deliverables: ${brandContext.typicalDeliverables.join(', ')}` : ''}

AUTHORITY SIGNAL INSTRUCTIONS:
- Weave credentials and specializations naturally into headlines/descriptions where relevant
- Use professional language matching the price positioning (luxury = elevated vocabulary)
- Reference expertise subtly (e.g., "captured by award-winning photographer" if awards exist)
- Match brand voice with authority level (20+ years experience = confident, established tone)

## RIGHTS INFORMATION
- Creator: ${rights.creatorName}
- Studio: ${rights.studioName || rights.creatorName}
- Copyright Template: ${rights.copyrightTemplate}
- Credit Template: ${rights.creditTemplate}
- Usage Terms: ${rights.usageTermsTemplate || 'All Rights Reserved. Contact for licensing.'}
- Website: ${rights.website || 'Not specified'}
- Email: ${rights.email || 'Not specified'}

## OUTPUT PREFERENCES
- Language: ${preferences.primaryLanguage}
- Keyword Style: ${preferences.keywordStyle} (${preferences.maxKeywords} max)
- Location Behavior: ${preferences.locationBehavior}

## LOCATION INSTRUCTIONS
${locationInstructions}

${eventContext ? `## 📎 EVENT ANCHOR (Required for coherent gallery/case study generation)
This image is part of event: ${eventContext.eventName || eventContext.eventId}
- Event ID: ${eventContext.eventId}
${eventContext.eventName ? `- Event Name: ${eventContext.eventName}` : ''}
${eventContext.eventDate ? `- Event Date: ${eventContext.eventDate}` : ''}
${eventContext.storySequence ? `- Sequence Position: ${eventContext.storySequence}` : ''}
${eventContext.galleryId ? `- Gallery ID: ${eventContext.galleryId}` : ''}
${eventContext.galleryName ? `- Gallery Name: ${eventContext.galleryName}` : ''}

IMPORTANT: Include the eventAnchor object in your output with these values.
` : ''}

${userComment ? `## 🔴 USER CONTEXT (HIGHEST PRIORITY - MUST USE)
"${userComment}"

MANDATORY EXTRACTION FROM USER CONTEXT:
- Names mentioned → Include in headline AND description
- Location/venue mentioned → Use as sublocation AND city (OVERRIDE profile location)
- Event type → Include in headline and keywords
- Story details → Weave into description naturally
- Emotional context → Use for intent.emotionalTone

This user context MUST be reflected in the final metadata. Do NOT ignore it.
Preserve the full context verbatim in the "userContext" field.
` : ''}

## REQUIRED OUTPUT FORMAT (Enterprise-grade)
Return a JSON object with ALL these fields:

{
  "headline": "Compelling, SEO-friendly headline (max 256 chars)",
  "description": "Detailed, natural description for captions (max 2000 chars). COMPLETE sentences only.",
  "keywords": ["keyword1", "keyword2", ...up to ${preferences.maxKeywords}],
  "title": "Short formal title",
  
  "altTextShort": "COMPLETE sentence, 120-160 chars max. NEVER truncate. Rewrite if too long.",
  "altTextLong": "Extended accessibility description",
  "language": "${preferences.primaryLanguage}",
  
  "eventAnchor": {
    "eventId": "${eventContext?.eventId || 'will-be-filled'}",
    "eventName": "${eventContext?.eventName || ''}",
    "eventDate": "${eventContext?.eventDate || ''}",
    "storySequence": ${eventContext?.storySequence || 'null'},
    "galleryId": "${eventContext?.galleryId || ''}",
    "galleryName": "${eventContext?.galleryName || ''}"
  },
  
  "intent": {
    "purpose": "portfolio|commercial|editorial|personal|archival|social",
    "momentType": "e.g. preparation, ceremony, celebration, candid, posed, action, portrait",
    "emotionalTone": "e.g. joyful, intimate, professional, dramatic, serene, energetic",
    "storyPosition": "opening|middle|climax|closing|standalone (optional)",
    "narrativeRole": "What this moment represents, e.g. 'Mother helping bride with final preparations before ceremony'"
  },
  "userContext": ${userComment ? `"${userComment.replace(/"/g, '\\"')}"` : 'null'},
  
  "creator": "${rights.creatorName}",
  "copyright": "${rights.copyrightTemplate}",
  "credit": "${rights.creditTemplate}",
  "source": "${rights.studioName || rights.creatorName}",
  
  "usageTerms": "${rights.usageTermsTemplate || 'All Rights Reserved. Contact for licensing.'}",
  "webStatement": "${webStatement}",
  "copyrightStatus": "copyrighted",
  "licensorName": "${rights.creatorName}",
  "licensorEmail": "${rights.email || ''}",
  "licensorUrl": "${rights.website || ''}",
  
  "sublocation": "${sublocation}",
  "city": "city per location rules",
  "state": "state per location rules",
  "country": "ALWAYS include country name if city is set",
  "countryCode": "ISO 3166-1 alpha-2 (e.g., AT, GB, US)",
  
  "releases": {
    "model": {
      "status": "unknown",
      "allowedUse": ["portfolio", "website"]
    },
    "property": {
      "status": "not-applicable"
    }
  },
  
  "taxonomy": {
    "categories": ["category-slug-1", "category-slug-2"]
  },
  
  "scene": {
    "peopleCount": 0,
    "sceneType": "portrait/landscape/product/etc",
    "setting": "studio-white/outdoor-urban/etc"
  },
  
  "entities": {
    "brand": {
      "name": "${brandContext.brandName}",
      "url": "${rights.website || ''}"
    },
    "creator": {
      "name": "${rights.creatorName}"
    }
  },
  
  "instructions": "special instructions if any",
  "captionWriter": "ContextEmbed AI v2",
  
  "confidence": {
    "overall": 0.0-1.0,
    "headline": 0.0-1.0,
    "description": 0.0-1.0,
    "keywords": 0.0-1.0,
    "location": 0.0-1.0
  },
  "reasoning": {
    "headline": "Why this headline",
    "description": "Description approach",
    "keywords": "Keyword strategy",
    "location": "Location decision",
    "general": "Overall approach including people count, scene analysis, and taxonomy choices"
  }
}

IMPORTANT:
- Count people in scene.peopleCount ACCURATELY (look at vision analysis subjects)
- If country is set, ALWAYS include countryCode (ISO 3166-1 alpha-2)
- altTextShort must be a COMPLETE sentence ≤160 chars
- taxonomy.categories should use slug format (lowercase-with-dashes)
- If USER CONTEXT provides a location → USE IT (override profile location)
- If USER CONTEXT provides names → INCLUDE THEM in headline/description

Respond ONLY with valid JSON.`;
}

function getLocationInstructions(
  behavior: 'strict' | 'infer' | 'none',
  location?: { city?: string; state?: string; country?: string; countryCode?: string; isStrict: boolean }
): string {
  // Note: User context locations ALWAYS override these instructions
  const override = `\n\n⚠️ OVERRIDE: If user context mentions a SPECIFIC location (venue, church, city, etc.), USE THAT instead of profile location. Extract venue name → sublocation, city/town → city, country → country.`;
  
  switch (behavior) {
    case 'strict':
      if (location && (location.city || location.country)) {
        return `Default location from user's profile (use if no specific location in user context):
City: ${location.city || 'Not set'}
State: ${location.state || 'Not set'}  
Country: ${location.country || 'Not set'}
Country Code: ${location.countryCode || 'Not set'}${override}`;
      }
      return `No location is set in user profile.${override}`;
      
    case 'infer':
      const baseLocation = location && (location.city || location.country)
        ? `Default location from profile: ${[location.city, location.state, location.country].filter(Boolean).join(', ')}\n`
        : '';
      return `${baseLocation}You MAY add location information if there are HIGH confidence location cues in the vision analysis (identifiable landmarks, clear signage) OR from user context.${override}`;
      
    case 'none':
      return `Do NOT include location fields unless user context explicitly provides a location.${override}`;
  }
}
