/**
 * Field length constants and utilities
 * Based on IPTC IIM and XMP specifications
 */

/**
 * Maximum field lengths per IPTC/XMP standards
 */
export const FIELD_LENGTHS = {
  // IPTC Core
  headline: 256,
  description: 2000,
  keywords: 64, // per keyword
  title: 256,
  creator: 256,
  copyright: 256,
  credit: 256,
  source: 256,
  city: 128,
  state: 128,
  country: 128,
  countryCode: 3,
  instructions: 256,
  captionWriter: 128,
  category: 3,
  supplementalCategory: 64, // per category
  
  // Additional
  usageTerms: 2000,
  webStatement: 256,
} as const;

/**
 * Recommended lengths for optimal display
 */
export const RECOMMENDED_LENGTHS = {
  headline: 100, // Optimal for most platforms
  description: 500, // Good balance
  keywords: 25, // Max recommended count
  title: 70, // SEO optimal
} as const;

/**
 * Truncate a string to a maximum length, optionally at word boundary
 */
export function truncateString(
  str: string, 
  maxLength: number, 
  atWordBoundary: boolean = true
): string {
  if (str.length <= maxLength) {
    return str;
  }
  
  if (!atWordBoundary) {
    return str.substring(0, maxLength);
  }
  
  // Find last space before max length
  const truncated = str.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace);
  }
  
  return truncated;
}

/**
 * Truncate with ellipsis
 */
export function truncateWithEllipsis(
  str: string, 
  maxLength: number
): string {
  if (str.length <= maxLength) {
    return str;
  }
  
  return truncateString(str, maxLength - 3, true) + '...';
}

/**
 * Check if a value exceeds its field length
 */
export function exceedsFieldLength(
  fieldName: keyof typeof FIELD_LENGTHS, 
  value: string | string[]
): boolean {
  const maxLength = FIELD_LENGTHS[fieldName];
  
  if (Array.isArray(value)) {
    return value.some(v => v.length > maxLength);
  }
  
  return value.length > maxLength;
}

/**
 * Get remaining characters for a field
 */
export function getRemainingChars(
  fieldName: keyof typeof FIELD_LENGTHS, 
  currentValue: string
): number {
  const maxLength = FIELD_LENGTHS[fieldName];
  return Math.max(0, maxLength - currentValue.length);
}

/**
 * Format field length indicator for UI
 */
export function formatLengthIndicator(
  current: number, 
  max: number
): { text: string; status: 'ok' | 'warning' | 'error' } {
  const remaining = max - current;
  const percentage = current / max;
  
  let status: 'ok' | 'warning' | 'error' = 'ok';
  if (percentage > 1) {
    status = 'error';
  } else if (percentage > 0.9) {
    status = 'warning';
  }
  
  return {
    text: `${current}/${max}`,
    status,
  };
}
