/**
 * CE_LAB_FORENSIC — Export Profile (Stub)
 *
 * Reserved for Survival Lab forensic embeds.
 * Will include stress-test markers, forensic watermarks, and full
 * provenance chains once the lab pipeline is finalised.
 *
 * TODO: implement forensic fields once Survival Lab test protocol is locked.
 */

import {
  EmbedProfile,
  UserContext,
  AssetContext,
  EmbedOptions,
} from './types';

const APP_VERSION = '2.0.0';

function sanitize(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

export const labForensic: EmbedProfile = {
  name: 'CE_LAB_FORENSIC',
  description:
    'Forensic-grade embed for Survival Lab testing — includes provenance markers.',

  buildTags(
    user: UserContext,
    asset: AssetContext,
    _options: EmbedOptions,
  ): Record<string, string | string[] | number | boolean> {
    const tags: Record<string, string | string[] | number | boolean> = {};

    const name = sanitize(user.displayName);
    const year = new Date().getFullYear();
    const copyright = `\u00A9 ${year} ${name}`;

    // Minimal authorship (same cross-container pattern as production)
    tags['Artist'] = name;
    tags['Copyright'] = copyright;
    tags['By-line'] = name;
    tags['CopyrightNotice'] = copyright;
    tags['XMP-dc:Creator'] = name;
    tags['XMP-dc:Rights'] = copyright;
    tags['XMP-xmpRights:Marked'] = 'True';

    // CE namespace — forensic profile marker
    tags['XMP-CE:Version'] = APP_VERSION;
    tags['XMP-CE:ExportProfile'] = 'CE_LAB_FORENSIC';
    tags['XMP-CE:Timestamp'] = new Date().toISOString();

    // TODO: Add forensic-specific fields here:
    //   CE:ForensicWatermark, CE:ProvenanceChain, CE:StressTestId, etc.

    return tags;
  },
};
