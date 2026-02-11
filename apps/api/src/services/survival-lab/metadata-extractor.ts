/**
 * Survival Lab - Metadata Extractor
 * 
 * Extracts metadata from files WITHOUT modifying them.
 * Uses exiftool-vendored to read EXIF, XMP, IPTC tags.
 * 
 * CRITICAL: Never transforms or re-encodes images.
 */

import { ExifTool, Tags } from 'exiftool-vendored';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// Shared ExifTool instance
let sharedExifTool: ExifTool | null = null;

function getExifTool(): ExifTool {
  if (!sharedExifTool || sharedExifTool.ended) {
    sharedExifTool = new ExifTool({ taskTimeoutMillis: 60000 });
  }
  return sharedExifTool;
}

export async function closeExifTool(): Promise<void> {
  if (sharedExifTool && !sharedExifTool.ended) {
    await sharedExifTool.end();
    sharedExifTool = null;
  }
}

export interface ExtractedMetadata {
  exifPresent: boolean;
  xmpPresent: boolean;
  iptcPresent: boolean;
  
  creatorValue: string | null;
  rightsValue: string | null;
  creditValue: string | null;
  descriptionValue: string | null;
  
  encodingOk: boolean;
  notes: string | null;
  rawJson: Record<string, unknown>;
  
  // Dimensions
  width: number;
  height: number;
}

/**
 * Extract metadata from a file path.
 * The file must exist on disk (stream from storage to temp file first).
 */
export async function extractMetadataFromFile(filePath: string): Promise<ExtractedMetadata> {
  const et = getExifTool();
  
  // Read all tags
  const tags: Tags = await et.read(filePath);
  const rawJson = tags as unknown as Record<string, unknown>;
  
  // Detect presence of metadata types
  const exifPresent = detectExifPresence(tags);
  const xmpPresent = detectXmpPresence(tags);
  const iptcPresent = detectIptcPresence(tags);
  
  // Extract canonical values with priority
  const descriptionValue = extractDescription(tags);
  const creatorValue = extractCreator(tags);
  const rightsValue = extractRights(tags);
  const creditValue = extractCredit(tags);
  
  // Check encoding integrity (mojibake detection)
  const encodingCheck = checkEncoding(rightsValue, creatorValue, creditValue, descriptionValue);
  
  // Get dimensions
  const width = typeof tags.ImageWidth === 'number' ? tags.ImageWidth : 0;
  const height = typeof tags.ImageHeight === 'number' ? tags.ImageHeight : 0;
  
  return {
    exifPresent,
    xmpPresent,
    iptcPresent,
    creatorValue,
    rightsValue,
    creditValue,
    descriptionValue,
    encodingOk: encodingCheck.ok,
    notes: encodingCheck.notes,
    rawJson,
    width,
    height,
  };
}

/**
 * Detect if EXIF IFD tags exist
 */
function detectExifPresence(tags: Tags): boolean {
  // Check for common EXIF-only tags or EXIF IFD markers
  const exifIndicators = [
    'ExifImageWidth', 'ExifImageHeight', 'ExifToolVersion',
    'Make', 'Model', 'DateTimeOriginal', 'ExposureTime',
    'FNumber', 'ISO', 'FocalLength', 'LensModel',
    'Artist', 'Copyright', 'ImageDescription',
  ];
  
  for (const key of exifIndicators) {
    if ((tags as any)[key] !== undefined) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect if XMP tags exist
 */
function detectXmpPresence(tags: Tags): boolean {
  // Check for XMP namespace prefixes or specific XMP tags
  const xmpIndicators = [
    'XMPToolkit', 'CreatorTool',
    // Dublin Core (dc:)
    'Creator', 'Rights', 'Description', 'Title', 'Subject',
    // Photoshop
    'Credit', 'City', 'Country', 'Headline',
    // IPTC Core
    'CopyrightOwner', 'Licensor',
  ];
  
  for (const key of xmpIndicators) {
    if ((tags as any)[key] !== undefined) {
      return true;
    }
  }
  
  // Also check for any key starting with XMP
  for (const key of Object.keys(tags)) {
    if (key.startsWith('XMP') || key.includes('XMP-')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect if IPTC tags exist
 */
function detectIptcPresence(tags: Tags): boolean {
  const iptcIndicators = [
    'IPTC:Caption-Abstract', 'Caption-Abstract',
    'IPTC:ObjectName', 'ObjectName',
    'IPTC:Writer-Editor', 'Writer-Editor',
    'IPTC:Credit', 'IPTC:Source',
    'IPTC:CopyrightNotice', 'CopyrightNotice',
    'IPTC:By-line', 'By-line',
  ];
  
  for (const key of iptcIndicators) {
    if ((tags as any)[key] !== undefined) {
      return true;
    }
  }
  
  // Check for any key with IPTC prefix
  for (const key of Object.keys(tags)) {
    if (key.startsWith('IPTC')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract description with priority:
 * XMP dc:description > photoshop:Caption-Abstract > EXIF ImageDescription > IPTC Caption-Abstract
 */
function extractDescription(tags: Tags): string | null {
  const candidates = [
    (tags as any)['Description'],
    (tags as any)['Caption-Abstract'],
    (tags as any)['ImageDescription'],
    (tags as any)['IPTC:Caption-Abstract'],
  ];
  
  for (const val of candidates) {
    if (val) {
      // Handle array values
      const str = Array.isArray(val) ? val[0] : val;
      if (typeof str === 'string' && str.trim()) {
        return str.trim();
      }
    }
  }
  
  return null;
}

/**
 * Extract creator with priority:
 * XMP dc:creator > EXIF Artist > IPTC By-line
 */
function extractCreator(tags: Tags): string | null {
  const candidates = [
    (tags as any)['Creator'],
    (tags as any)['Artist'],
    (tags as any)['By-line'],
    (tags as any)['IPTC:By-line'],
  ];
  
  for (const val of candidates) {
    if (val) {
      const str = Array.isArray(val) ? val.join(', ') : val;
      if (typeof str === 'string' && str.trim()) {
        return str.trim();
      }
    }
  }
  
  return null;
}

/**
 * Extract rights with priority:
 * XMP dc:rights > EXIF Copyright > IPTC CopyrightNotice
 */
function extractRights(tags: Tags): string | null {
  const candidates = [
    (tags as any)['Rights'],
    (tags as any)['Copyright'],
    (tags as any)['CopyrightNotice'],
    (tags as any)['IPTC:CopyrightNotice'],
  ];
  
  for (const val of candidates) {
    if (val) {
      const str = Array.isArray(val) ? val[0] : val;
      if (typeof str === 'string' && str.trim()) {
        return str.trim();
      }
    }
  }
  
  return null;
}

/**
 * Extract credit with priority:
 * photoshop:Credit > IPTC Credit
 */
function extractCredit(tags: Tags): string | null {
  const candidates = [
    (tags as any)['Credit'],
    (tags as any)['IPTC:Credit'],
  ];
  
  for (const val of candidates) {
    if (val) {
      const str = Array.isArray(val) ? val[0] : val;
      if (typeof str === 'string' && str.trim()) {
        return str.trim();
      }
    }
  }
  
  return null;
}

/**
 * Check for encoding issues (mojibake)
 * Returns { ok: boolean, notes: string | null }
 */
function checkEncoding(...values: (string | null)[]): { ok: boolean; notes: string | null } {
  const mojibakePatterns = [
    'â', '┬®', '┬', 'â€™', 'â€œ', 'â€', 'Ã', 'Â', '\ufffd',
  ];
  
  for (const val of values) {
    if (!val) continue;
    
    for (const pattern of mojibakePatterns) {
      if (val.includes(pattern)) {
        return {
          ok: false,
          notes: `Encoding corruption detected: "${pattern}" found in metadata. © symbol may be corrupted.`,
        };
      }
    }
  }
  
  return { ok: true, notes: null };
}

/**
 * Compute SHA256 hash of a file (streaming)
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<bigint> {
  const stats = await fs.promises.stat(filePath);
  return BigInt(stats.size);
}

/**
 * Create a temp file path for storing downloaded files
 */
export function createTempFilePath(filename: string): string {
  const tempDir = os.tmpdir();
  const uniqueId = crypto.randomBytes(8).toString('hex');
  return path.join(tempDir, `survival_${uniqueId}_${filename}`);
}

/**
 * Safely delete a temp file
 */
export async function deleteTempFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to delete temp file ${filePath}:`, err.message);
    }
  }
}
