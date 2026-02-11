/**
 * Domain Normalization Utility
 * 
 * Extracts eTLD+1 (registrable domain) from URLs or raw domain inputs.
 * Used for free-tier usage tracking per domain.
 */

import { parse } from 'tldts';

export interface DomainInfo {
  registrableDomain: string | null;
  subdomain: string | null;
  publicSuffix: string | null;
  isValid: boolean;
}

/**
 * Normalize and extract the registrable domain (eTLD+1) from a URL or domain string.
 * 
 * Examples:
 * - "https://blog.client.com/page" => "client.com"
 * - "www.example.co.uk" => "example.co.uk"
 * - "sub.domain.client.com" => "client.com"
 * - "localhost:3000" => null (not a valid domain)
 * 
 * @param input URL or domain string
 * @returns Registrable domain (eTLD+1) or null if invalid
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  let domain = input.trim().toLowerCase();
  
  // Handle empty strings
  if (!domain) {
    return null;
  }
  
  // If it looks like a URL, extract the hostname
  if (domain.includes('://')) {
    try {
      const url = new URL(domain);
      domain = url.hostname;
    } catch {
      // Not a valid URL, try parsing as domain
    }
  }
  
  // Remove protocol prefix if still present (e.g., "http://example.com" without valid URL parsing)
  domain = domain.replace(/^(https?:\/\/)?/, '');
  
  // Remove path, query, port
  domain = domain.split('/')[0]!;
  domain = domain.split('?')[0]!;
  domain = domain.split('#')[0]!;
  domain = domain.split(':')[0]!;
  
  // Remove leading www.
  domain = domain.replace(/^www\./, '');
  
  // Skip localhost and IP addresses
  if (domain === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(domain)) {
    return null;
  }
  
  // Use tldts to parse the domain
  const parsed = parse(domain);
  
  // Return the registrable domain (eTLD+1)
  if (parsed.domain && parsed.isIcann) {
    return parsed.domain;
  }
  
  // For private TLDs (like .local, .test), return null
  if (parsed.domain && !parsed.isIcann) {
    return null;
  }
  
  return null;
}

/**
 * Get detailed domain information including subdomain and public suffix.
 */
export function getDomainInfo(input: string | null | undefined): DomainInfo {
  if (!input) {
    return {
      registrableDomain: null,
      subdomain: null,
      publicSuffix: null,
      isValid: false,
    };
  }
  
  let domain = input.trim().toLowerCase();
  
  // Extract hostname if URL
  if (domain.includes('://')) {
    try {
      const url = new URL(domain);
      domain = url.hostname;
    } catch {
      // Continue with raw input
    }
  }
  
  // Clean up domain
  domain = domain.replace(/^(https?:\/\/)?/, '');
  domain = domain.split('/')[0]!.split('?')[0]!.split('#')[0]!.split(':')[0]!;
  domain = domain.replace(/^www\./, '');
  
  const parsed = parse(domain);
  
  return {
    registrableDomain: parsed.domain || null,
    subdomain: parsed.subdomain || null,
    publicSuffix: parsed.publicSuffix || null,
    isValid: Boolean(parsed.domain && parsed.isIcann),
  };
}

/**
 * Validate that a string is a valid domain (not URL).
 */
export function isValidDomain(input: string): boolean {
  const info = getDomainInfo(input);
  return info.isValid;
}
