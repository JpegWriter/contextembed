/**
 * CE_PRODUCTION_STANDARD — Export Profile
 *
 * Professional authorship metadata across EXIF, IPTC, and XMP with clean
 * cross-container redundancy.  No forensic markers, no test strings.
 *
 * Namespace registration:
 *   http://contextembed.com/ns/1.0/  →  prefix "CE"
 *
 * Fields written:
 *   EXIF  — Artist, Copyright, ImageDescription
 *   IPTC  — Byline, CopyrightNotice, Credit, Source, Caption-Abstract, Keywords
 *   XMP   — dc:creator, dc:rights, photoshop:Credit, xmpRights:Marked, dc:description
 *   CE    — CE:Version, CE:ExportProfile, CE:Timestamp
 */

import {
  EmbedProfile,
  UserContext,
  AssetContext,
  EmbedOptions,
} from './types';

// Current app version — single source of truth
const APP_VERSION = '2.0.0';

/**
 * Sanitise a string to safe UTF-8 for metadata containers.
 * Strips control characters (except newline/tab) and trims.
 */
function sanitize(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .trim();
}

/**
 * Build a copyright string: © {year} {displayName}
 */
function buildCopyright(displayName: string): string {
  const year = new Date().getFullYear();
  return `\u00A9 ${year} ${sanitize(displayName)}`;
}

// =============================================================================
// PROFILE IMPLEMENTATION
// =============================================================================

export const productionStandard: EmbedProfile = {
  name: 'CE_PRODUCTION_STANDARD',
  description:
    'Professional authorship metadata across EXIF/IPTC/XMP with clean redundancy.',

  buildTags(
    user: UserContext,
    asset: AssetContext,
    _options: EmbedOptions,
  ): Record<string, string | string[] | number | boolean> {
    const tags: Record<string, string | string[] | number | boolean> = {};

    const name = sanitize(user.displayName);
    const copyright = buildCopyright(name);
    const credit = sanitize(user.businessName) || name;
    const source =
      sanitize(user.website) || `Created by ${name}`;

    // =====================================================================
    // EXIF
    // =====================================================================
    tags['Artist'] = name;
    tags['Copyright'] = copyright;
    if (asset.shortAlt) {
      tags['ImageDescription'] = sanitize(asset.shortAlt);
    }

    // =====================================================================
    // IPTC (IIM)
    // =====================================================================
    tags['By-line'] = name;
    tags['CopyrightNotice'] = copyright;
    tags['Credit'] = credit;
    tags['Source'] = source;

    if (asset.longDescription) {
      tags['Caption-Abstract'] = sanitize(asset.longDescription);
    }

    if (asset.structuredKeywords && asset.structuredKeywords.length > 0) {
      // Sanitise each keyword individually
      tags['Keywords'] = asset.structuredKeywords.map(sanitize).filter(Boolean);
    }

    // =====================================================================
    // XMP Dublin Core
    // =====================================================================
    tags['XMP-dc:Creator'] = name;
    tags['XMP-dc:Rights'] = copyright;

    if (asset.longDescription) {
      tags['XMP-dc:Description'] = sanitize(asset.longDescription);
    }

    if (asset.structuredKeywords && asset.structuredKeywords.length > 0) {
      tags['XMP-dc:Subject'] = asset.structuredKeywords.map(sanitize).filter(Boolean);
    }

    // =====================================================================
    // XMP Photoshop
    // =====================================================================
    tags['XMP-photoshop:Credit'] = credit;

    // =====================================================================
    // XMP Rights Management
    // =====================================================================
    tags['XMP-xmpRights:Marked'] = 'True';

    // =====================================================================
    // Custom CE Namespace
    //   http://contextembed.com/ns/1.0/  prefix: CE
    // =====================================================================
    tags['XMP-CE:Version'] = APP_VERSION;
    tags['XMP-CE:ExportProfile'] = 'CE_PRODUCTION_STANDARD';
    tags['XMP-CE:Timestamp'] = new Date().toISOString();

    return tags;
  },
};
