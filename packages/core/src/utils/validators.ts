/**
 * Input validators for API endpoints
 */

import { z } from 'zod';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailSchema = z.string().email();
  return emailSchema.safeParse(email).success;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  const urlSchema = z.string().url();
  return urlSchema.safeParse(url).success;
}

/**
 * Validate that a string is within length limits
 */
export function isValidLength(
  str: string, 
  min: number, 
  max: number
): { valid: boolean; error?: string } {
  if (str.length < min) {
    return { valid: false, error: `Minimum length is ${min} characters` };
  }
  if (str.length > max) {
    return { valid: false, error: `Maximum length is ${max} characters` };
  }
  return { valid: true };
}

/**
 * Validate file extension
 */
export function isValidImageExtension(filename: string): boolean {
  const validExtensions = ['.jpg', '.jpeg', '.png'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(ext);
}

/**
 * Validate MIME type
 */
export function isValidImageMimeType(mimeType: string): boolean {
  const validTypes = ['image/jpeg', 'image/png'];
  return validTypes.includes(mimeType);
}

/**
 * Sanitize a filename (remove unsafe characters)
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

/**
 * Validate project name
 */
export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Project name is required' };
  }
  if (name.length > 256) {
    return { valid: false, error: 'Project name must be 256 characters or less' };
  }
  return { valid: true };
}

/**
 * Validate copyright template
 */
export function validateCopyrightTemplate(template: string): { 
  valid: boolean; 
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];
  
  if (!template || template.trim().length === 0) {
    return { valid: false, error: 'Copyright template is required' };
  }
  
  if (template.length > 256) {
    return { valid: false, error: 'Copyright template must be 256 characters or less' };
  }
  
  // Check for year placeholder
  if (!template.includes('{year}') && !template.includes('{YEAR}')) {
    const currentYear = new Date().getFullYear().toString();
    if (!template.includes(currentYear)) {
      warnings.push('Consider including {year} placeholder for automatic year updates');
    }
  }
  
  // Check for copyright symbol
  if (!template.includes('©') && !template.toLowerCase().includes('copyright')) {
    warnings.push('Consider including © symbol or "Copyright" text');
  }
  
  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Validate keywords array
 */
export function validateKeywords(keywords: string[]): {
  valid: boolean;
  error?: string;
  cleaned: string[];
} {
  if (!Array.isArray(keywords)) {
    return { valid: false, error: 'Keywords must be an array', cleaned: [] };
  }
  
  const cleaned = keywords
    .map(k => k.trim())
    .filter(k => k.length > 0 && k.length <= 64)
    .slice(0, 50);
  
  if (cleaned.length < 3) {
    return { valid: false, error: 'At least 3 valid keywords are required', cleaned };
  }
  
  return { valid: true, cleaned };
}
