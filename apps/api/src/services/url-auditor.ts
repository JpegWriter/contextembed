/**
 * URL Auditor Service
 * Scrapes website to extract business context
 */

import * as cheerio from 'cheerio';
import { UrlAuditResult } from '@contextembed/core';

const USER_AGENT = 'ContextEmbed/2.0 (URL Auditor)';
const TIMEOUT = 10000;

/**
 * Audit a URL to extract business context
 */
export async function auditUrl(url: string): Promise<UrlAuditResult> {
  const fetchedAt = new Date();
  
  try {
    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Fetch the homepage
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    
    if (!response.ok) {
      return {
        url,
        fetchedAt,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract data
    const result: UrlAuditResult = {
      url,
      fetchedAt,
      success: true,
      
      // Basic meta
      title: $('title').first().text().trim() || undefined,
      metaDescription: $('meta[name="description"]').attr('content')?.trim() || undefined,
      
      // Try to extract business name
      businessName: extractBusinessName($),
      
      // Tagline
      tagline: extractTagline($),
      
      // Services (from nav, headings, etc.)
      services: extractServices($),
      
      // Location
      location: extractLocation($),
      
      // Social links
      socialLinks: extractSocialLinks($),
      
      // Contact info
      contactInfo: extractContactInfo($),
      
      // Tone hints
      toneHints: extractToneHints($),
      
      // Industry/keywords
      keywords: extractKeywords($),
      
      // Awards & credentials
      awards: extractAwards($),
      credentials: extractCredentials($),
    };
    
    // Try to determine industry
    result.industry = guessIndustry(result);
    
    // Generate intelligent field suggestions
    result.fieldSuggestions = generateFieldSuggestions(result, $);
    
    return result;
    
  } catch (error) {
    return {
      url,
      fetchedAt,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch URL',
    };
  }
}

function extractBusinessName($: cheerio.CheerioAPI): string | undefined {
  // Try common patterns
  const candidates = [
    $('meta[property="og:site_name"]').attr('content'),
    $('meta[name="application-name"]').attr('content'),
    $('.logo img').attr('alt'),
    $('a.logo').text(),
    $('header .brand').text(),
    $('[itemtype*="Organization"] [itemprop="name"]').text(),
  ].filter(Boolean).map(s => s?.trim());
  
  // Also try title without tagline
  const title = $('title').first().text().trim();
  if (title) {
    const parts = title.split(/[|\-–—]/);
    if (parts[0]) {
      candidates.unshift(parts[0].trim());
    }
  }
  
  return candidates[0] || undefined;
}

function extractTagline($: cheerio.CheerioAPI): string | undefined {
  const candidates = [
    $('meta[name="description"]').attr('content'),
    $('meta[property="og:description"]').attr('content'),
    $('header h1').first().text(),
    $('.hero h2').first().text(),
    $('[class*="tagline"]').first().text(),
    $('[class*="slogan"]').first().text(),
  ].filter(Boolean).map(s => s?.trim().substring(0, 200));
  
  return candidates[0] || undefined;
}

function extractServices($: cheerio.CheerioAPI): string[] {
  const services: string[] = [];
  
  // Look in navigation
  $('nav a, .nav a, .menu a').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 50 && !isNavigationBoilerplate(text)) {
      services.push(text);
    }
  });
  
  // Look for service sections
  $('[class*="service"] h3, [class*="service"] h4').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 100) {
      services.push(text);
    }
  });
  
  return [...new Set(services)].slice(0, 20);
}

function extractLocation($: cheerio.CheerioAPI): { city?: string; state?: string; country?: string; address?: string } | undefined {
  const location: { city?: string; state?: string; country?: string; address?: string } = {};
  
  // Look for address schema
  const address = $('[itemtype*="PostalAddress"]');
  if (address.length) {
    location.city = address.find('[itemprop="addressLocality"]').text().trim() || undefined;
    location.state = address.find('[itemprop="addressRegion"]').text().trim() || undefined;
    location.country = address.find('[itemprop="addressCountry"]').text().trim() || undefined;
    location.address = address.find('[itemprop="streetAddress"]').text().trim() || undefined;
  }
  
  // Look in footer
  const footerText = $('footer').text();
  
  // Try to extract city/state/country patterns
  const locationPatterns = [
    /(?:located in|based in|serving)\s+([^,.\n]+)/i,
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})\s*(\d{5})?/,
  ];
  
  for (const pattern of locationPatterns) {
    const match = footerText.match(pattern);
    if (match) {
      if (!location.city && match[1]) location.city = match[1].trim();
      if (!location.state && match[2]) location.state = match[2].trim();
      break;
    }
  }
  
  return Object.keys(location).length > 0 ? location : undefined;
}

function extractSocialLinks($: cheerio.CheerioAPI): Record<string, string> {
  const social: Record<string, string> = {};
  
  const platforms: Record<string, RegExp> = {
    facebook: /facebook\.com/i,
    instagram: /instagram\.com/i,
    twitter: /twitter\.com|x\.com/i,
    linkedin: /linkedin\.com/i,
    youtube: /youtube\.com/i,
    tiktok: /tiktok\.com/i,
    pinterest: /pinterest\.com/i,
  };
  
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    for (const [platform, pattern] of Object.entries(platforms)) {
      if (pattern.test(href) && !social[platform]) {
        social[platform] = href;
      }
    }
  });
  
  return social;
}

function extractContactInfo($: cheerio.CheerioAPI): { email?: string; phone?: string; address?: string } | undefined {
  const contact: { email?: string; phone?: string; address?: string } = {};
  
  // Email
  const emailMatch = $('a[href^="mailto:"]').first().attr('href');
  if (emailMatch) {
    contact.email = emailMatch.replace('mailto:', '').split('?')[0];
  }
  
  // Phone
  const phoneMatch = $('a[href^="tel:"]').first().attr('href');
  if (phoneMatch) {
    contact.phone = phoneMatch.replace('tel:', '');
  }
  
  return Object.keys(contact).length > 0 ? contact : undefined;
}

function extractAwards($: cheerio.CheerioAPI): string[] {
  const awards: string[] = [];
  const pageText = $('body').text().toLowerCase();
  
  // Look for award-related sections
  $('[class*="award"], [class*="recognition"], [class*="press"], [class*="featured"], [id*="award"], [id*="press"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 200) {
      awards.push(text);
    }
  });
  
  // Look for common award patterns in text
  const awardPatterns = [
    /(?:winner|awarded|recipient|featured in|as seen in|published in)\s+([^.!?\n]{10,100})/gi,
    /(?:first place|second place|third place|gold|silver|bronze)\s+(?:at|in|from)?\s*([^.!?\n]{5,80})/gi,
    /(wppi|ppa|ispwp|fearless|rangefinder|junebug|the knot|wedding wire|best of)[^.!?\n]{0,50}/gi,
  ];
  
  for (const pattern of awardPatterns) {
    const matches = pageText.match(pattern);
    if (matches) {
      awards.push(...matches.slice(0, 3));
    }
  }
  
  // Look for credential/certification patterns
  $('img[alt*="award"], img[alt*="certified"], img[alt*="member"]').each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt && alt.length < 100) {
      awards.push(alt);
    }
  });
  
  return [...new Set(awards)].slice(0, 10);
}

function extractCredentials($: cheerio.CheerioAPI): string[] {
  const credentials: string[] = [];
  const pageText = $('body').text();
  
  // Look for common photography credentials
  const credentialPatterns = [
    /\b(PPA|WPPI|ISPWP|MPA|AIPP|PPOC)\b/g,
    /\b(certified|accredited|licensed|master photographer|fellow)\b/gi,
    /\b(BFA|MFA|BA|MA)\s+(?:in\s+)?photography/gi,
  ];
  
  for (const pattern of credentialPatterns) {
    const matches = pageText.match(pattern);
    if (matches) {
      credentials.push(...matches);
    }
  }
  
  return [...new Set(credentials)].slice(0, 5);
}

function extractToneHints($: cheerio.CheerioAPI): string[] {
  const hints: string[] = [];
  
  // Look for adjectives in hero/header areas
  const heroText = $('header, .hero, [class*="hero"]').text().toLowerCase();
  
  const toneWords = [
    'professional', 'creative', 'modern', 'traditional', 'luxury', 
    'affordable', 'friendly', 'expert', 'trusted', 'innovative',
    'boutique', 'premium', 'artisan', 'handcrafted', 'organic',
  ];
  
  for (const word of toneWords) {
    if (heroText.includes(word)) {
      hints.push(word);
    }
  }
  
  return hints.slice(0, 10);
}

function extractKeywords($: cheerio.CheerioAPI): string[] {
  const keywords: string[] = [];
  
  // From meta keywords
  const metaKeywords = $('meta[name="keywords"]').attr('content');
  if (metaKeywords) {
    keywords.push(...metaKeywords.split(',').map(k => k.trim()).filter(k => k.length < 50));
  }
  
  // From headings
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 100) {
      const words = text.split(/\s+/).filter(w => w.length > 3 && w.length < 30);
      keywords.push(...words.slice(0, 3));
    }
  });
  
  return [...new Set(keywords)].slice(0, 50);
}

function guessIndustry(result: UrlAuditResult): string | undefined {
  // Normalize text: lowercase, replace hyphens and special chars with spaces
  const allText = [
    result.title,
    result.metaDescription,
    result.tagline,
    ...(result.services || []),
    ...(result.keywords || []),
  ].filter(Boolean).join(' ').toLowerCase().replace(/[-_.,;:]/g, ' ');
  
  // More specific industries first (order matters)
  const industries: Record<string, string[]> = {
    'Family & Baby Photography': ['family', 'baby', 'newborn', 'neugeboren', 'familien', 'kinder', 'children', 'maternity', 'schwangerschaft'],
    'Wedding Photography': ['wedding', 'hochzeit', 'bride', 'braut', 'elopement'],
    'Portrait Photography': ['portrait', 'porträt', 'headshot', 'personal brand'],
    'Commercial Photography': ['commercial', 'corporate', 'business', 'product', 'advertising'],
    'Event Photography': ['event', 'conference', 'party', 'celebration'],
    'Food Photography': ['food', 'restaurant', 'culinary', 'chef'],
    'Real Estate Photography': ['real estate', 'property', 'interior', 'architecture'],
    'Photography': ['photography', 'photographer', 'foto', 'fotograf', 'photo studio'],
    'Videography': ['video', 'film', 'cinematography', 'videographer'],
    'Graphic Design': ['design', 'graphic', 'branding', 'logo'],
    'Real Estate': ['real estate', 'realtor', 'property', 'homes', 'listings'],
    'Restaurant': ['restaurant', 'dining', 'cuisine', 'menu'],
    'E-commerce': ['shop', 'store', 'buy', 'products', 'cart'],
    'Healthcare': ['health', 'medical', 'clinic', 'doctor', 'wellness'],
    'Legal': ['law', 'legal', 'attorney', 'lawyer'],
    'Fitness': ['fitness', 'gym', 'workout', 'training', 'personal trainer'],
    'Beauty': ['beauty', 'salon', 'spa', 'cosmetic', 'makeup'],
    'Technology': ['software', 'tech', 'digital', 'app', 'saas'],
    'Marketing': ['marketing', 'agency', 'advertising', 'brand', 'creative'],
  };
  
  for (const [industry, keywords] of Object.entries(industries)) {
    if (keywords.some(k => allText.includes(k))) {
      return industry;
    }
  }
  
  return undefined;
}

// Extract specific photography niches from text
function extractNiches(result: UrlAuditResult): string[] {
  // Normalize text: lowercase, replace hyphens and special chars with spaces
  const allText = [
    result.title,
    result.metaDescription,
    result.tagline,
    ...(result.services || []),
    ...(result.keywords || []),
  ].filter(Boolean).join(' ').toLowerCase().replace(/[-_.,;:]/g, ' ');
  
  const niches: string[] = [];
  
  const nichePatterns: Record<string, string[]> = {
    'Family photography': ['family', 'familien', 'familie'],
    'Baby & newborn photography': ['baby', 'newborn', 'neugeboren', 'neugeborenen'],
    'Maternity photography': ['maternity', 'schwangerschaft', 'pregnant', 'bump'],
    'Children photography': ['children', 'kids', 'kinder'],
    'Wedding photography': ['wedding', 'hochzeit'],
    'Engagement sessions': ['engagement', 'verlobung'],
    'Business portraits': ['business', 'corporate', 'headshot', 'beruflich'],
    'Event coverage': ['event', 'veranstaltung'],
    'Portrait sessions': ['portrait', 'porträt'],
  };
  
  for (const [niche, patterns] of Object.entries(nichePatterns)) {
    if (patterns.some(p => allText.includes(p))) {
      niches.push(niche);
    }
  }
  
  return niches;
}

// Generate intelligent suggestions for all fields based on crawl data
function generateFieldSuggestions(result: UrlAuditResult, $?: cheerio.CheerioAPI): Record<string, string | string[]> {
  const suggestions: Record<string, string | string[]> = {};
  const niches = extractNiches(result);
  
  // Industry
  if (result.industry) {
    suggestions.industry = result.industry;
  }
  
  // Niche - most specific detected niche
  if (niches.length > 0) {
    suggestions.niche = niches[0];
    suggestions.nicheOptions = niches;
  }
  
  // Specializations - derived from niches with more detail
  if (niches.length > 0) {
    const specializations = niches.map(n => {
      // Add descriptive prefixes based on niche type
      if (n.toLowerCase().includes('newborn') || n.toLowerCase().includes('baby')) {
        return 'Candid newborn photography, lifestyle baby sessions';
      }
      if (n.toLowerCase().includes('family')) {
        return 'Natural family portraits, milestone sessions, generational photos';
      }
      if (n.toLowerCase().includes('maternity')) {
        return 'Artistic maternity photography, bump-to-baby packages';
      }
      if (n.toLowerCase().includes('wedding')) {
        return 'Documentary wedding coverage, intimate ceremonies';
      }
      return n;
    });
    suggestions.specializations = specializations[0];
    suggestions.specializationOptions = specializations;
  }
  
  // Services - derived from niches
  if (niches.length > 0) {
    suggestions.services = niches.join(', ');
    suggestions.serviceOptions = niches;
  }
  
  // Key Differentiator - based on detected specialties
  const nicheStr = niches.join(' ').toLowerCase();
  if (nicheStr.includes('family') || nicheStr.includes('baby') || nicheStr.includes('newborn')) {
    suggestions.keyDifferentiator = 'Relaxed, in-home sessions that capture authentic family moments';
    suggestions.keyDifferentiatorOptions = [
      'Relaxed, in-home sessions that capture authentic family moments',
      'Specializing in calm, patient newborn sessions for anxious new parents',
      'Creating timeless family heirlooms, not just photos',
    ];
  } else if (nicheStr.includes('wedding')) {
    suggestions.keyDifferentiator = 'Documentary-style coverage that tells your complete love story';
    suggestions.keyDifferentiatorOptions = [
      'Documentary-style coverage that tells your complete love story',
      'Unobtrusive approach that captures genuine emotions',
      'Full-day coverage with same-day sneak peeks',
    ];
  }
  
  // Target audience based on niches
  const audiences: string[] = [];
  if (nicheStr.includes('family') || nicheStr.includes('baby') || nicheStr.includes('children')) {
    audiences.push(
      'Growing families wanting to preserve precious milestones',
      'New parents seeking calm, patient newborn sessions',
      'Parents who value authentic moments over posed perfection'
    );
  }
  if (nicheStr.includes('wedding') || nicheStr.includes('engagement')) {
    audiences.push(
      'Couples who want their genuine story told',
      'Engaged couples planning intimate celebrations'
    );
  }
  if (nicheStr.includes('business') || nicheStr.includes('portrait')) {
    audiences.push(
      'Professionals needing authentic personal branding',
      'Entrepreneurs building their visual identity'
    );
  }
  if (audiences.length > 0) {
    suggestions.targetAudience = audiences[0];
    suggestions.targetAudienceOptions = audiences;
  }
  
  // Awards & Recognition from crawl
  if (result.awards && result.awards.length > 0) {
    suggestions.awards = result.awards.slice(0, 3).join(', ');
    suggestions.awardsOptions = result.awards;
  }
  
  // Credentials from crawl
  if (result.credentials && result.credentials.length > 0) {
    suggestions.credentials = result.credentials.join(', ');
    suggestions.credentialsOptions = result.credentials;
  }
  
  // Brand voice from tone hints
  if (result.toneHints && result.toneHints.length > 0) {
    suggestions.brandVoice = result.toneHints.join(', ');
    suggestions.brandVoiceOptions = result.toneHints;
  } else if (niches.some(n => n.toLowerCase().includes('family') || n.toLowerCase().includes('baby'))) {
    suggestions.brandVoice = 'Warm, nurturing, professional';
    suggestions.brandVoiceOptions = ['Warm and nurturing', 'Professional yet friendly', 'Gentle and reassuring'];
  }
  
  // Default event type based on specialty
  if (nicheStr.includes('family') || nicheStr.includes('baby')) {
    suggestions.defaultEventType = 'Family Session';
    suggestions.defaultEventTypeOptions = ['Family Session', 'Newborn Session', 'Milestone Session', 'Maternity Session'];
  } else if (nicheStr.includes('wedding')) {
    suggestions.defaultEventType = 'Wedding';
    suggestions.defaultEventTypeOptions = ['Wedding', 'Engagement', 'Elopement'];
  }
  
  return suggestions;
}

function isNavigationBoilerplate(text: string): boolean {
  const boilerplate = [
    'home', 'about', 'contact', 'blog', 'login', 'sign up', 
    'cart', 'faq', 'privacy', 'terms', 'search',
  ];
  return boilerplate.includes(text.toLowerCase());
}
