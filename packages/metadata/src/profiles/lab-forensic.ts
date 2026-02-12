/**
 * CE_LAB_FORENSIC — Forensic Instrumentation Profile
 *
 * Internal-only profile for Survival Lab metadata-stripping tests.
 * Embeds container-specific fingerprint markers across EXIF, IPTC, and XMP
 * so that post-platform reads can detect exactly which layers were stripped.
 *
 * ⚠️  NOT for public export.  Gated behind LAB_MODE=true env var.
 *
 * Marker strategy:
 *   - Cross-layer authorship with baselineID tag for traceability
 *   - EXIF-only, IPTC-only, XMP-only unique markers
 *   - 12 structured test keywords
 *   - 300+ char long caption with UTF-8 stress chars (© € ü é ß)
 *   - CE namespace: RunID, BaselineID, OriginalHash, FileSizeOriginal
 */

import * as crypto from 'crypto';

import {
  EmbedProfile,
  UserContext,
  AssetContext,
  EmbedOptions,
  ForensicContext,
} from './types';

const APP_VERSION = '2.0.0';

// =============================================================================
// STRESS-TEST CONSTANTS
// =============================================================================

/**
 * 12 structured test keywords — each uniquely numbered for diff detection.
 */
const TEST_KEYWORDS: string[] = [
  'CE_TEST_01',
  'CE_TEST_02',
  'CE_TEST_03',
  'CE_TEST_04',
  'CE_TEST_05',
  'CE_TEST_06',
  'CE_TEST_07',
  'CE_TEST_08',
  'CE_TEST_09',
  'CE_TEST_10',
  'CE_TEST_11',
  'CE_TEST_12',
];

/**
 * Long caption (300+ chars) with embedded UTF-8 stress characters.
 * Used to test caption truncation / encoding corruption across platforms.
 */
function buildLongCaption(baselineID: string): string {
  return (
    `CE_LAB Forensic Caption — Baseline ${baselineID}. ` +
    `This caption is intentionally long to stress-test platform handling ` +
    `of multi-byte UTF-8 characters and field-length limits. ` +
    `Special chars: © copyright, € euro, ü umlaut, é accent, ß eszett. ` +
    `Lorem ipsum dolor sit amet, consectetur adipiscing elit. ` +
    `Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ` +
    `Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. ` +
    `End marker: CE_LAB_CAPTION_END_${baselineID}.`
  );
}

// =============================================================================
// PROFILE IMPLEMENTATION
// =============================================================================

/**
 * Build the full forensic tag map.
 *
 * Requires a ForensicContext to be attached to AssetContext via the
 * `_forensic` field (set by embedForensicBaseline in index.ts).
 */
export const labForensic: EmbedProfile = {
  name: 'CE_LAB_FORENSIC',
  description:
    'Forensic-grade embed for Survival Lab — layer-specific markers and integrity fields.',

  buildTags(
    user: UserContext,
    asset: AssetContext,
    _options: EmbedOptions,
  ): Record<string, string | string[] | number | boolean> {
    // ForensicContext is injected via (asset as any)._forensic by embedForensicBaseline()
    const forensic: ForensicContext | undefined = (asset as any)?._forensic;

    const baselineID = forensic?.baselineID ?? 'UNKNOWN';
    const originalHash = forensic?.originalHash ?? '';
    const fileSizeOriginal = forensic?.fileSizeOriginal ?? 0;

    const name = user.displayName.trim();
    const year = new Date().getFullYear();
    const runID = crypto.randomUUID();

    // ===========================================================
    // 1) CORE AUTHORSHIP — cross-layer redundancy with baseline tag
    // ===========================================================

    const artistTag = `${name} | CE_LAB_${baselineID}`;
    const copyrightTag = `\u00A9 ${year} ${name} | CE_LAB_${baselineID}`;
    const creditTag = `CE_LAB_CREDIT_${baselineID}`;
    const sourceTag = `CE_LAB_SOURCE_${baselineID}`;

    const tags: Record<string, string | string[] | number | boolean> = {};

    // EXIF
    tags['Artist'] = artistTag;
    tags['Copyright'] = copyrightTag;

    // IPTC
    tags['By-line'] = artistTag;
    tags['CopyrightNotice'] = copyrightTag;
    tags['Credit'] = creditTag;
    tags['Source'] = sourceTag;

    // XMP
    tags['XMP-dc:Creator'] = artistTag;
    tags['XMP-dc:Rights'] = copyrightTag;
    tags['XMP-photoshop:Credit'] = creditTag;
    tags['XMP-xmpRights:Marked'] = 'True';

    // ===========================================================
    // 2) LAYER FINGERPRINT MARKERS — unique per container
    // ===========================================================

    // EXIF only
    tags['ImageDescription'] = `EXIF_ONLY_MARKER_${baselineID}`;

    // IPTC only
    tags['Caption-Abstract'] = `IPTC_ONLY_MARKER_${baselineID}`;

    // XMP only
    tags['XMP-dc:Description'] = `XMP_ONLY_MARKER_${baselineID}`;

    // ===========================================================
    // 3) CE CUSTOM NAMESPACE
    // ===========================================================

    tags['XMP-CE:RunID'] = runID;
    tags['XMP-CE:BaselineID'] = baselineID;
    tags['XMP-CE:ExportProfile'] = 'CE_LAB_FORENSIC';
    tags['XMP-CE:Timestamp'] = new Date().toISOString();
    tags['XMP-CE:OriginalHash'] = originalHash;
    tags['XMP-CE:FileSizeOriginal'] = fileSizeOriginal;
    tags['XMP-CE:Version'] = APP_VERSION;

    // ===========================================================
    // 4) INTEGRITY CONTROL FIELDS
    // ===========================================================

    // Long caption (300+ chars, UTF-8 stress)
    const longCaption = buildLongCaption(baselineID);
    tags['UserComment'] = longCaption;

    // Short field
    tags['XMP-photoshop:Headline'] = 'OK';

    // 12 structured test keywords
    tags['Keywords'] = [...TEST_KEYWORDS];
    tags['XMP-dc:Subject'] = [...TEST_KEYWORDS];

    return tags;
  },
};
