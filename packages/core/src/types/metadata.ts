/**
 * Metadata field mappings and types
 * Maps internal field names to IPTC/EXIF/XMP tags
 */

export interface FieldMapping {
  internalName: string;
  displayName: string;
  description: string;
  maxLength?: number;
  exifTags: string[];
  iptcTag?: string;
  xmpTag?: string;
  required?: boolean;
  multiValue?: boolean;
}

/**
 * Complete field map for IPTC/EXIF/XMP metadata
 */
export const FIELD_MAP: Record<string, FieldMapping> = {
  headline: {
    internalName: 'headline',
    displayName: 'Headline',
    description: 'A brief publishable synopsis of the image content',
    maxLength: 256,
    exifTags: ['-IPTC:Headline', '-XMP-photoshop:Headline'],
    iptcTag: 'Headline',
    xmpTag: 'photoshop:Headline',
    required: true,
  },
  
  description: {
    internalName: 'description',
    displayName: 'Description/Caption',
    description: 'Detailed description of the image content',
    maxLength: 2000,
    exifTags: ['-IPTC:Caption-Abstract', '-XMP-dc:Description', '-EXIF:ImageDescription'],
    iptcTag: 'Caption-Abstract',
    xmpTag: 'dc:description',
    required: true,
  },
  
  keywords: {
    internalName: 'keywords',
    displayName: 'Keywords',
    description: 'Searchable keywords describing the image',
    maxLength: 64, // per keyword
    exifTags: ['-IPTC:Keywords', '-XMP-dc:Subject'],
    iptcTag: 'Keywords',
    xmpTag: 'dc:subject',
    required: true,
    multiValue: true,
  },
  
  title: {
    internalName: 'title',
    displayName: 'Title',
    description: 'Short title for the image',
    maxLength: 256,
    exifTags: ['-IPTC:ObjectName', '-XMP-dc:Title'],
    iptcTag: 'ObjectName',
    xmpTag: 'dc:title',
  },
  
  creator: {
    internalName: 'creator',
    displayName: 'Creator/Photographer',
    description: 'Name of the person who created the image',
    maxLength: 256,
    exifTags: ['-IPTC:By-line', '-XMP-dc:Creator', '-EXIF:Artist'],
    iptcTag: 'By-line',
    xmpTag: 'dc:creator',
    required: true,
  },
  
  copyright: {
    internalName: 'copyright',
    displayName: 'Copyright Notice',
    description: 'Copyright statement',
    maxLength: 256,
    exifTags: ['-IPTC:CopyrightNotice', '-XMP-dc:Rights', '-EXIF:Copyright'],
    iptcTag: 'CopyrightNotice',
    xmpTag: 'dc:rights',
    required: true,
  },
  
  credit: {
    internalName: 'credit',
    displayName: 'Credit Line',
    description: 'Credit line for publication',
    maxLength: 256,
    exifTags: ['-IPTC:Credit', '-XMP-photoshop:Credit'],
    iptcTag: 'Credit',
    xmpTag: 'photoshop:Credit',
  },
  
  source: {
    internalName: 'source',
    displayName: 'Source',
    description: 'Original source of the image',
    maxLength: 256,
    exifTags: ['-IPTC:Source', '-XMP-photoshop:Source'],
    iptcTag: 'Source',
    xmpTag: 'photoshop:Source',
  },
  
  usageTerms: {
    internalName: 'usageTerms',
    displayName: 'Rights Usage Terms',
    description: 'Instructions for usage and licensing',
    maxLength: 2000,
    exifTags: ['-XMP-xmpRights:UsageTerms'],
    xmpTag: 'xmpRights:UsageTerms',
  },
  
  city: {
    internalName: 'city',
    displayName: 'City',
    description: 'City where image was created',
    maxLength: 128,
    exifTags: ['-IPTC:City', '-XMP-photoshop:City'],
    iptcTag: 'City',
    xmpTag: 'photoshop:City',
  },
  
  state: {
    internalName: 'state',
    displayName: 'State/Province',
    description: 'State or province where image was created',
    maxLength: 128,
    exifTags: ['-IPTC:Province-State', '-XMP-photoshop:State'],
    iptcTag: 'Province-State',
    xmpTag: 'photoshop:State',
  },
  
  country: {
    internalName: 'country',
    displayName: 'Country',
    description: 'Country where image was created',
    maxLength: 128,
    exifTags: ['-IPTC:Country-PrimaryLocationName', '-XMP-photoshop:Country'],
    iptcTag: 'Country-PrimaryLocationName',
    xmpTag: 'photoshop:Country',
  },
  
  countryCode: {
    internalName: 'countryCode',
    displayName: 'Country Code',
    description: 'ISO country code',
    maxLength: 3,
    exifTags: ['-IPTC:Country-PrimaryLocationCode', '-XMP-iptcCore:CountryCode'],
    iptcTag: 'Country-PrimaryLocationCode',
    xmpTag: 'Iptc4xmpCore:CountryCode',
  },
  
  instructions: {
    internalName: 'instructions',
    displayName: 'Special Instructions',
    description: 'Special handling or usage instructions',
    maxLength: 256,
    exifTags: ['-IPTC:SpecialInstructions', '-XMP-photoshop:Instructions'],
    iptcTag: 'SpecialInstructions',
    xmpTag: 'photoshop:Instructions',
  },
  
  captionWriter: {
    internalName: 'captionWriter',
    displayName: 'Caption Writer',
    description: 'Person who wrote the caption',
    maxLength: 128,
    exifTags: ['-IPTC:Writer-Editor', '-XMP-photoshop:CaptionWriter'],
    iptcTag: 'Writer-Editor',
    xmpTag: 'photoshop:CaptionWriter',
  },
  
  category: {
    internalName: 'category',
    displayName: 'Category',
    description: 'Primary category',
    maxLength: 3,
    exifTags: ['-IPTC:Category'],
    iptcTag: 'Category',
  },
  
  supplementalCategories: {
    internalName: 'supplementalCategories',
    displayName: 'Supplemental Categories',
    description: 'Additional categories',
    maxLength: 64,
    exifTags: ['-IPTC:SupplementalCategories'],
    iptcTag: 'SupplementalCategories',
    multiValue: true,
  },
};

/**
 * Get ExifTool argument array for a field
 */
export function getExifToolArgs(fieldName: string, value: string | string[]): string[] {
  const mapping = FIELD_MAP[fieldName];
  if (!mapping) {
    throw new Error(`Unknown field: ${fieldName}`);
  }
  
  const args: string[] = [];
  
  if (Array.isArray(value)) {
    // Multi-value field
    for (const tag of mapping.exifTags) {
      for (const v of value) {
        args.push(`${tag}=${v}`);
      }
    }
  } else {
    // Single value field
    for (const tag of mapping.exifTags) {
      args.push(`${tag}=${value}`);
    }
  }
  
  return args;
}

/**
 * Validate field value against constraints
 */
export function validateFieldValue(
  fieldName: string, 
  value: string | string[]
): { valid: boolean; error?: string; truncated?: string | string[] } {
  const mapping = FIELD_MAP[fieldName];
  if (!mapping) {
    return { valid: false, error: `Unknown field: ${fieldName}` };
  }
  
  if (Array.isArray(value)) {
    if (!mapping.multiValue) {
      return { valid: false, error: `Field ${fieldName} does not accept multiple values` };
    }
    
    const truncated: string[] = [];
    for (const v of value) {
      if (mapping.maxLength && v.length > mapping.maxLength) {
        truncated.push(v.substring(0, mapping.maxLength));
      } else {
        truncated.push(v);
      }
    }
    
    const wasTruncated = truncated.some((t, i) => t !== value[i]);
    return { 
      valid: true, 
      truncated: wasTruncated ? truncated : undefined 
    };
  } else {
    if (mapping.maxLength && value.length > mapping.maxLength) {
      return { 
        valid: true, 
        truncated: value.substring(0, mapping.maxLength) 
      };
    }
    return { valid: true };
  }
}

/**
 * Get all required fields
 */
export function getRequiredFields(): string[] {
  return Object.entries(FIELD_MAP)
    .filter(([_, mapping]) => mapping.required)
    .map(([name]) => name);
}

/**
 * Get field display info for UI
 */
export function getFieldDisplayInfo(fieldName: string): { 
  displayName: string; 
  description: string; 
  maxLength?: number 
} | null {
  const mapping = FIELD_MAP[fieldName];
  if (!mapping) return null;
  
  return {
    displayName: mapping.displayName,
    description: mapping.description,
    maxLength: mapping.maxLength,
  };
}
