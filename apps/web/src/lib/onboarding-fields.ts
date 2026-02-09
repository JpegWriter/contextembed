/**
 * Onboarding Field Definitions
 * Comprehensive field definitions with Copilot hints for AI assistance
 */

import type { FieldDefinition } from '@/components/copilot';

export const onboardingFields: Record<string, FieldDefinition> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS IDENTITY
  // ═══════════════════════════════════════════════════════════════════════════
  
  brandName: {
    id: 'brandName',
    label: 'Brand / Business Name',
    description: 'Your official business or studio name as it should appear in metadata',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Enter your business name exactly as you want it to appear on images and in search results. Use proper capitalization.',
      examples: [
        'Sarah Chen Photography',
        'Wildflower Studio',
        'The Creative Collective',
      ],
      commonMistakes: [
        'Using abbreviations customers won\'t recognize',
        'Including "LLC" or "Inc" unless it\'s part of your brand identity',
        'Inconsistent capitalization or spacing',
      ],
    },
  },

  tagline: {
    id: 'tagline',
    label: 'Tagline / Slogan',
    description: 'A short phrase that captures your brand essence',
    type: 'text',
    copilotHints: {
      whatToWrite: 'A memorable phrase (5-10 words) that communicates your unique value or brand promise. This appears in image captions.',
      examples: [
        'Timeless moments, artfully captured',
        'Bold visuals for fearless brands',
        'Your story, beautifully told',
      ],
      commonMistakes: [
        'Making it too long or wordy',
        'Using generic phrases like "Quality service"',
        'Including your business name in the tagline',
      ],
    },
  },

  industry: {
    id: 'industry',
    label: 'Industry',
    description: 'Your primary industry or creative sector',
    type: 'text',
    copilotHints: {
      whatToWrite: 'The broad category of your creative work. This helps the AI use appropriate terminology.',
      examples: [
        'Portrait Photography',
        'Wedding Photography',
        'Family Photography',
        'Commercial Photography',
        'Event Photography',
        'Product Photography',
        'Real Estate Photography',
        'Fashion Photography',
        'Newborn & Baby Photography',
        'Sports Photography',
        'Fine Art Photography',
        'Videography',
        'Graphic Design',
        'Brand Strategy & Design',
      ],
      commonMistakes: [
        'Being too vague (e.g., "Creative" instead of "Portrait Photography")',
        'Listing multiple unrelated industries',
        'Using jargon that clients don\'t search for',
      ],
    },
  },

  niche: {
    id: 'niche',
    label: 'Specialty / Niche',
    description: 'Your specific focus within your industry',
    type: 'text',
    copilotHints: {
      whatToWrite: 'What makes your work unique within your industry? Be specific about your specialty.',
      examples: [
        'Intimate destination elopements',
        'Luxury editorial branding for female founders',
        'Documentary-style family photography',
        'High-end restaurant and chef portraiture',
      ],
      commonMistakes: [
        'Trying to be everything to everyone',
        'Describing what you CAN do instead of what you SPECIALIZE in',
        'Using internal terminology clients don\'t understand',
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICES & OFFERINGS
  // ═══════════════════════════════════════════════════════════════════════════

  services: {
    id: 'services',
    label: 'Services Offered',
    description: 'Your main service offerings (comma-separated)',
    type: 'textarea',
    copilotHints: {
      whatToWrite: 'List your core services, separated by commas. These become keywords in your image metadata for SEO.',
      examples: [
        'Wedding photography, engagement sessions, elopement coverage, bridal portraits',
        'Brand photography, headshots, product photography, lifestyle content',
        'Food photography, restaurant interiors, menu styling, chef portraits',
      ],
      commonMistakes: [
        'Listing too many services (focus on top 5-8)',
        'Using vague terms like "other services"',
        'Mixing B2B and B2C services without clarity',
      ],
    },
  },

  targetAudience: {
    id: 'targetAudience',
    label: 'Target Audience',
    description: 'Who you create for - your ideal client',
    type: 'textarea',
    copilotHints: {
      whatToWrite: 'Describe your ideal client: who they are, what they value, and what problem you solve for them.',
      examples: [
        'Growing families wanting to capture milestones - from newborns to toddlers. They value authentic, joyful moments.',
        'New parents looking to document their baby\'s first year. They want professional quality with a relaxed, comfortable session.',
        'Expecting mothers celebrating their pregnancy journey. They appreciate gentle, flattering poses in natural light.',
        'Couples planning their wedding who want timeless, emotional imagery that tells their love story.',
      ],
      commonMistakes: [
        'Saying "everyone" or being too broad',
        'Only describing demographics, not values or needs',
        'Describing who you CAN serve rather than who you WANT to serve',
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHORITY & EXPERTISE (NEW)
  // ═══════════════════════════════════════════════════════════════════════════

  yearsExperience: {
    id: 'yearsExperience',
    label: 'Years of Experience',
    description: 'How long you\'ve been in business',
    type: 'number',
    copilotHints: {
      whatToWrite: 'Enter the number of years you\'ve been professionally active. This adds authority to your metadata.',
      examples: [
        '15',
        '8',
        '25',
      ],
      commonMistakes: [
        'Inflating the number - clients can verify',
        'Not counting relevant experience from before going solo',
        'Leaving blank if you\'re newer - even "3" years builds credibility',
      ],
    },
  },

  credentials: {
    id: 'credentials',
    label: 'Credentials & Certifications',
    description: 'Professional certifications, memberships, or degrees',
    type: 'textarea',
    copilotHints: {
      whatToWrite: 'List relevant certifications, professional memberships, or degrees. These add E-E-A-T signals for SEO.',
      examples: [
        'MFA in Photography, PPA Certified Professional Photographer, WPPI Member',
        'Certified Brand Strategist, Adobe Certified Expert, AIGA Member',
        'Le Cordon Bleu Graduate (food styling), ASMP Member',
      ],
      commonMistakes: [
        'Listing irrelevant credentials',
        'Using abbreviations without explanation',
        'Forgetting professional association memberships',
      ],
    },
  },

  specializations: {
    id: 'specializations',
    label: 'Specializations',
    description: 'Specific areas of deep expertise',
    type: 'textarea',
    copilotHints: {
      whatToWrite: 'List 3-5 specific areas where you have exceptional skill or experience. These become authority keywords.',
      examples: [
        'Low-light ceremony photography, multi-day wedding coverage, destination weddings in Europe',
        'Personal brand photography for coaches, LinkedIn headshots, team photography for remote companies',
        'Dark and moody food styling, natural light product photography, editorial restaurant interiors',
      ],
      commonMistakes: [
        'Listing too many specializations (dilutes authority)',
        'Being too general (everyone does "portraits")',
        'Not mentioning what makes your approach unique',
      ],
    },
  },

  awardsRecognition: {
    id: 'awardsRecognition',
    label: 'Awards & Recognition',
    description: 'Notable awards, features, or achievements',
    type: 'textarea',
    copilotHints: {
      whatToWrite: 'List significant awards, publications, or recognition. "Award-winning" is a powerful trust signal.',
      examples: [
        'WPPI First Place 2024, Featured in Martha Stewart Weddings, Junebug Weddings Best of 2023',
        'Forbes 30 Under 30, AdAge Creative 100, D&AD Pencil Winner',
        'James Beard Award Nominee, Featured in Bon Appétit, Food & Wine Best New Photographer',
      ],
      commonMistakes: [
        'Listing minor or irrelevant awards',
        'Not including the year (recent awards matter more)',
        'Forgetting "As Seen In" media features',
      ],
    },
  },

  clientTypes: {
    id: 'clientTypes',
    label: 'Notable Client Types',
    description: 'Types of clients you\'ve worked with (builds credibility)',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Describe the caliber of clients you work with. This signals your experience level.',
      examples: [
        'Fortune 500 companies and luxury brands',
        'Boutique hotels and Michelin-starred restaurants',
        'Celebrity clients and high-profile weddings',
        'Funded startups and venture-backed founders',
      ],
      commonMistakes: [
        'Name-dropping specific clients without permission',
        'Being too humble - if you\'ve worked with impressive clients, say so',
        'Using vague terms like "various businesses"',
      ],
    },
  },

  keyDifferentiator: {
    id: 'keyDifferentiator',
    label: 'Key Differentiator',
    description: 'The ONE thing that sets you apart most',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Your single strongest competitive advantage. This becomes a primary keyword and appears in headlines.',
      examples: [
        '24-hour turnaround for urgent brand shoots',
        'The only photographer in the region specializing in Sikh weddings',
        'Former chef turned food photographer - I understand plating',
        'Fluent in 4 languages for international destination work',
      ],
      commonMistakes: [
        'Generic claims like "great customer service"',
        'Listing multiple things (pick ONE)',
        'Something competitors can easily claim too',
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BRAND VOICE & POSITIONING
  // ═══════════════════════════════════════════════════════════════════════════

  brandVoice: {
    id: 'brandVoice',
    label: 'Brand Voice',
    description: 'The tone and personality of your brand',
    type: 'select',
    copilotHints: {
      whatToWrite: 'Choose the tone that best describes how you communicate. This affects how AI writes your captions.',
      examples: [
        'Professional & Refined',
        'Warm & Approachable',
        'Bold & Edgy',
        'Playful & Creative',
      ],
      commonMistakes: [
        'Choosing a voice that doesn\'t match your website copy',
        'Being inconsistent across platforms',
        'Picking what you aspire to vs. what you actually are',
      ],
    },
  },

  pricePoint: {
    id: 'pricePoint',
    label: 'Price Positioning',
    description: 'Where you sit in the market',
    type: 'select',
    copilotHints: {
      whatToWrite: 'Select your pricing tier. This affects the language used in descriptions (e.g., "luxury" vs "affordable").',
      examples: [
        'Budget-friendly',
        'Mid-range',
        'Premium',
        'Luxury',
      ],
      commonMistakes: [
        'Undervaluing your work',
        'Inconsistency between pricing and brand language',
        'Not reflecting your actual client base',
      ],
    },
  },

  brandStory: {
    id: 'brandStory',
    label: 'Brand Story',
    description: 'Your origin story and mission',
    type: 'textarea',
    copilotHints: {
      whatToWrite: 'A 2-3 sentence version of why you do what you do. This adds personality to metadata descriptions.',
      examples: [
        'After 10 years in corporate marketing, I left to capture the authentic stories that matter. I believe every couple deserves images that feel like them, not a Pinterest board.',
        'I started photographing food in my grandmother\'s kitchen, learning that the best meals tell stories. Now I help restaurants communicate that same warmth.',
        'As a former wedding planner, I saw too many photographers miss the moments that matter. I founded Wildflower to change that.',
      ],
      commonMistakes: [
        'Making it too long (this is for metadata, not your About page)',
        'Focusing on equipment instead of purpose',
        'Being generic - your story should be uniquely yours',
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATION & SERVICE AREA
  // ═══════════════════════════════════════════════════════════════════════════

  city: {
    id: 'city',
    label: 'City',
    description: 'Your primary city or base location',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Your main city of operation. This is crucial for local SEO.',
      examples: [
        'Austin',
        'Brooklyn',
        'San Francisco',
        'London',
      ],
      commonMistakes: [
        'Using neighborhood names that aren\'t searchable',
        'Listing multiple cities (pick your primary)',
        'Abbreviating (write "Los Angeles" not "LA")',
      ],
    },
  },

  state: {
    id: 'state',
    label: 'State / Region',
    description: 'Your state, province, or region',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Your state or region. Use the full name for better SEO.',
      examples: [
        'Texas',
        'California',
        'New South Wales',
        'Greater London',
      ],
      commonMistakes: [
        'Using abbreviations (write "Texas" not "TX")',
        'Skipping this for local SEO - it matters',
      ],
    },
  },

  country: {
    id: 'country',
    label: 'Country',
    description: 'Your country of operation',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Your country. Important for international visibility.',
      examples: [
        'United States',
        'United Kingdom',
        'Australia',
        'Canada',
      ],
      commonMistakes: [
        'Using country codes (write "United States" not "US")',
        'Assuming search engines know your location',
      ],
    },
  },

  serviceArea: {
    id: 'serviceArea',
    label: 'Service Area',
    description: 'Geographic areas you serve (for local SEO)',
    type: 'textarea',
    copilotHints: {
      whatToWrite: 'List additional cities, regions, or areas you serve. These become location keywords.',
      examples: [
        'Austin, San Antonio, Houston, Dallas, Hill Country, Texas Hill Country vineyards',
        'NYC, Brooklyn, Manhattan, Long Island, Hamptons, New Jersey, Connecticut',
        'London, Surrey, Kent, Sussex, South East England, European destinations',
      ],
      commonMistakes: [
        'Listing areas you don\'t actively serve',
        'Forgetting popular venue locations in your area',
        'Not including "destination" keywords if you travel',
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT & PROJECT CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════

  defaultEventType: {
    id: 'defaultEventType',
    label: 'Default Event Type',
    description: 'Your most common type of project',
    type: 'text',
    copilotHints: {
      whatToWrite: 'The type of project you shoot most often. This sets default context for metadata.',
      examples: [
        'Wedding',
        'Brand photoshoot',
        'Corporate headshots',
        'Restaurant editorial',
        'Product photography',
      ],
      commonMistakes: [
        'Being too specific or too generic',
        'Listing multiple types (pick your primary)',
      ],
    },
  },

  typicalDeliverables: {
    id: 'typicalDeliverables',
    label: 'Typical Deliverables',
    description: 'What you typically deliver to clients',
    type: 'textarea',
    copilotHints: {
      whatToWrite: 'List your standard deliverables. This helps the AI describe your work accurately.',
      examples: [
        'High-resolution digital images, online gallery, print rights, optional album design',
        'Web-optimized images, social media crops, raw files available, brand guidelines document',
        'Print-ready files, web versions, social crops, usage license for 1 year',
      ],
      commonMistakes: [
        'Using internal terms clients don\'t understand',
        'Forgetting to mention print rights or usage',
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RIGHTS & COPYRIGHT (IPTC-Compliant)
  // ═══════════════════════════════════════════════════════════════════════════

  creatorName: {
    id: 'creatorName',
    label: 'Creator / Photographer Name',
    description: 'IPTC Creator field - the person who created the image',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Your legal name or business name as it should appear in IPTC metadata. This is the authoritative source for "who took this photo."',
      examples: [
        'Sarah Chen',
        'Matt Pantling',
        'Wildflower Studio',
        'James Rodriguez Photography',
      ],
      commonMistakes: [
        'Using nicknames or social handles instead of legal name',
        'Inconsistency across images (pick one and stick with it)',
        'Leaving blank - this is critical for copyright claims',
        'Using "Photographer" or generic terms',
      ],
    },
  },

  studioName: {
    id: 'studioName',
    label: 'Studio / Company Name',
    description: 'Business entity name for copyright ownership',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Your registered business or studio name. This appears in the IPTC Copyright Owner field.',
      examples: [
        'Wildflower Studio LLC',
        'Sarah Chen Photography',
        'Rodriguez Creative Inc',
        'New Age Fotografie',
      ],
      commonMistakes: [
        'Using a different name than your brand without good reason',
        'Forgetting legal entity type (LLC, Inc) if you use it officially',
        'Inconsistency between creator and studio names',
      ],
    },
  },

  copyrightTemplate: {
    id: 'copyrightTemplate',
    label: 'Copyright Notice Template',
    description: 'IPTC Copyright Notice - use {year} as placeholder',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Your copyright notice. Use {year} as a placeholder for the current year. IPTC standard recommends: © Year Owner Statement.',
      examples: [
        '© {year} Sarah Chen Photography. All Rights Reserved.',
        '© {year} Wildflower Studio LLC',
        'Copyright {year} Rodriguez Creative. Unauthorized use prohibited.',
      ],
      commonMistakes: [
        'Forgetting the © symbol (it has legal significance)',
        'Hard-coding the year instead of using {year} placeholder',
        'Making it excessively long (keep under 100 characters)',
        'Using (c) instead of © (use the real symbol)',
        'Omitting "All Rights Reserved" if you want maximum protection',
      ],
    },
  },

  creditTemplate: {
    id: 'creditTemplate',
    label: 'Credit Line Template',
    description: 'IPTC Credit field - how you want to be credited',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Your preferred photo credit format. This is what publications, websites, and social shares should display.',
      examples: [
        'Photo by Sarah Chen',
        'Photo: Wildflower Studio',
        'Image by @sarahchenphotos',
        '© Matt Pantling',
      ],
      commonMistakes: [
        'Making it too long for publications to use',
        'Forgetting to include your social handle if you want tags',
        'Inconsistency with your brand name',
        'Using "Photographer:" prefix (just use "Photo by")',
      ],
    },
  },

  website: {
    id: 'website',
    label: 'Website URL',
    description: 'IPTC Source/Contact URL for licensing inquiries',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Your main website URL. This is embedded in IPTC metadata so anyone who finds your image can trace it back to you.',
      examples: [
        'https://sarahchenphotography.com',
        'https://wildflowerstudio.co',
        'https://www.newagefotografie.com',
      ],
      commonMistakes: [
        'Forgetting https:// (always include the protocol)',
        'Using a social media link instead of your website',
        'Broken or outdated links (test it!)',
        'Using a specific page instead of your homepage',
      ],
    },
  },

  contactEmail: {
    id: 'contactEmail',
    label: 'Contact Email',
    description: 'IPTC Contact Email for licensing and inquiries',
    type: 'text',
    copilotHints: {
      whatToWrite: 'Professional email for licensing inquiries. This is embedded in IPTC metadata so people can contact you about using your images.',
      examples: [
        'hello@sarahchenphotography.com',
        'studio@wildflower.co',
        'licensing@newagefotografie.com',
        'info@yourstudio.com',
      ],
      commonMistakes: [
        'Using a personal email address (looks unprofessional)',
        'Using an email you don\'t check regularly',
        'Forgetting to set up the email if using a new domain',
      ],
    },
  },

  usageTerms: {
    id: 'usageTerms',
    label: 'Default Usage Terms',
    description: 'IPTC Rights Usage Terms - default licensing statement',
    type: 'textarea',
    copilotHints: {
      whatToWrite: 'Standard usage terms embedded in every image. IPTC recommends keeping this concise but legally clear. This tells people what they can and cannot do.',
      examples: [
        'Personal use only. Commercial licensing available.',
        'Licensed for client use only. Editorial use requires permission.',
        'All rights reserved. Contact photographer for licensing.',
        'Editorial use permitted with credit. Commercial use requires license.',
        'No reproduction without written permission. See website for licensing.',
      ],
      commonMistakes: [
        'Being too vague about what is and isn\'t allowed',
        'Making it so long that no one reads it',
        'Forgetting to mention how to request permission',
        'Using complex legal jargon (keep it readable)',
        'Not mentioning the website for licensing info',
      ],
    },
  },
};

// Helper to get all field IDs by category
export const fieldCategories = {
  identity: ['brandName', 'tagline', 'industry', 'niche'],
  services: ['services', 'targetAudience'],
  authority: ['yearsExperience', 'credentials', 'specializations', 'awardsRecognition', 'clientTypes', 'keyDifferentiator'],
  voice: ['brandVoice', 'pricePoint', 'brandStory'],
  location: ['city', 'state', 'country', 'serviceArea'],
  events: ['defaultEventType', 'typicalDeliverables'],
  rights: ['creatorName', 'studioName', 'copyrightTemplate', 'creditTemplate', 'website', 'contactEmail', 'usageTerms'],
};
