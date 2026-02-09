/**
 * Copilot Field Analysis Route
 * Provides AI-powered suggestions for onboarding form fields
 */

import { Router, Request, Response, type IRouter } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { authMiddleware } from '../middleware/auth';
import OpenAI from 'openai';

const router: IRouter = Router();

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface AnalyzeFieldRequest {
  fieldId: string;
  fieldDefinition: {
    id: string;
    label: string;
    description: string;
    type: string;
    copilotHints: {
      whatToWrite: string;
      examples: string[];
      commonMistakes: string[];
    };
  };
  currentValue: string;
  formContext: Record<string, any>;
  businessContext: Record<string, any> | null;
}

// Rate limiting: Track requests per user
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(userId);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * POST /copilot/analyze
 * Analyze a field value and return AI suggestions
 */
router.post('/analyze', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  // Rate limiting
  if (!checkRateLimit(userId)) {
    res.status(429).json({ 
      status: 'error', 
      confidence: 0, 
      issues: ['Rate limit exceeded. Please wait a moment.'] 
    });
    return;
  }

  const body = req.body as AnalyzeFieldRequest;
  const { fieldId, fieldDefinition, currentValue, formContext, businessContext } = body;

  // Validate input
  if (!fieldId || !fieldDefinition || currentValue === undefined) {
    res.status(400).json({ 
      status: 'error', 
      confidence: 0, 
      issues: ['Missing required fields'] 
    });
    return;
  }

  // Skip analysis for very short values
  if (!currentValue || currentValue.length < 3) {
    res.json({ 
      status: 'incomplete', 
      confidence: 0.1 
    });
    return;
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(fieldDefinition, currentValue, formContext, businessContext);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective for this use case
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 400,
    });

    const responseText = completion.choices[0].message.content || '{}';
    const analysis = JSON.parse(responseText);

    // Ensure valid response structure
    res.json({
      status: analysis.status || 'incomplete',
      confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0.5,
      suggestion: analysis.suggestion,
      rationale: analysis.rationale,
      issues: Array.isArray(analysis.issues) ? analysis.issues : [],
      followUp: analysis.followUp,
    });
  } catch (error) {
    console.error('Copilot analysis error:', error);
    res.status(500).json({ 
      status: 'error', 
      confidence: 0, 
      issues: ['Analysis temporarily unavailable'] 
    });
  }
}));

function buildSystemPrompt(): string {
  return `You are an expert form assistant for a photography/creative business metadata tool. Your job is to analyze user input for onboarding fields and provide helpful guidance.

The user is setting up their business profile to enhance image metadata with brand context, copyright info, and SEO-optimized descriptions.

RESPONSE FORMAT (JSON only):
{
  "status": "complete" | "incomplete",
  "confidence": 0.0-1.0,
  "suggestion": "An improved version of their input (optional - only if you can genuinely improve it)",
  "rationale": "Brief explanation of why your suggestion is better (optional)",
  "issues": ["Specific, actionable improvements"],
  "followUp": {
    "question": "A clarifying question if more info would help",
    "options": ["Option 1", "Option 2", "Option 3"]
  }
}

RULES:
1. Status is "complete" if the input adequately answers the field's purpose
2. Confidence 0.8+ = good input, 0.5-0.8 = acceptable, <0.5 = needs work
3. Only provide "suggestion" if you can genuinely improve on their input - don't just rephrase
4. Issues should be specific and actionable, not generic
5. Consider the CONTEXT from other fields - suggestions should be consistent with their brand
6. For creative businesses, lean toward professional but warm language
7. Keep suggestions concise - these go into metadata fields with character limits
8. If the input is already good, say so with high confidence and no suggestion`;
}

function buildUserPrompt(
  fieldDefinition: AnalyzeFieldRequest['fieldDefinition'],
  currentValue: string,
  formContext: Record<string, any>,
  businessContext: Record<string, any> | null
): string {
  // Build context summary from other filled fields
  const contextSummary = Object.entries(formContext)
    .filter(([key, value]) => key !== fieldDefinition.id && value)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');

  return `FIELD: ${fieldDefinition.label}
PURPOSE: ${fieldDefinition.description}
GUIDANCE: ${fieldDefinition.copilotHints.whatToWrite}
GOOD EXAMPLES: ${fieldDefinition.copilotHints.examples.join(' | ')}
MISTAKES TO AVOID: ${fieldDefinition.copilotHints.commonMistakes.join(' | ')}

CURRENT VALUE: "${currentValue}"

${contextSummary ? `OTHER FORM DATA:\n${contextSummary}` : 'No other fields filled yet.'}

${businessContext ? `BUSINESS CONTEXT:\n${JSON.stringify(businessContext, null, 2)}` : ''}

Analyze the current value and provide guidance. Be encouraging but honest.`;
}

export default router;
