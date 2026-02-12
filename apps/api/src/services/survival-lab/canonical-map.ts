/**
 * Survival Lab — Canonical Metadata Field Map
 *
 * Maps the flat ExifTool tag namespace into a canonical schema.
 * Each canonical field groups all raw‐tag aliases that may carry
 * the same semantic value across EXIF IFD, IPTC IIM and XMP.
 *
 * DESIGN RULES:
 *   1.  Deterministic – no runtime branching on env or feature flags.
 *   2.  Append-only – new fields are additive; never remove a mapping.
 *   3.  Container-aware – each alias is labelled with its container.
 */

// ─── Types ─────────────────────────────────────────────────────

export type MetadataContainer = 'EXIF' | 'IPTC' | 'XMP';

export interface TagAlias {
  /** The raw key ExifTool emits (e.g. "Artist", "By-line") */
  rawKey: string;
  /** Which IFD / block the value lives in */
  container: MetadataContainer;
}

export interface CanonicalFieldDef {
  /** Stable name used across the Survival Lab */
  canonical: string;
  /** Human label for dashboards */
  label: string;
  /** Weight for survival scoring  (0–1, higher = more important) */
  weight: number;
  /** Ordered list of aliases; first match wins on extraction */
  aliases: TagAlias[];
}

// ─── Canonical Field Registry ──────────────────────────────────

export const CANONICAL_FIELDS: readonly CanonicalFieldDef[] = [
  {
    canonical: 'CREATOR',
    label: 'Creator / Artist',
    weight: 0.20,
    aliases: [
      { rawKey: 'Creator',           container: 'XMP'  },
      { rawKey: 'Artist',            container: 'EXIF' },
      { rawKey: 'By-line',           container: 'IPTC' },
      { rawKey: 'IPTC:By-line',      container: 'IPTC' },
    ],
  },
  {
    canonical: 'COPYRIGHT',
    label: 'Copyright / Rights',
    weight: 0.25,
    aliases: [
      { rawKey: 'Rights',            container: 'XMP'  },
      { rawKey: 'Copyright',         container: 'EXIF' },
      { rawKey: 'CopyrightNotice',   container: 'IPTC' },
      { rawKey: 'IPTC:CopyrightNotice', container: 'IPTC' },
    ],
  },
  {
    canonical: 'CREDIT',
    label: 'Credit Line',
    weight: 0.10,
    aliases: [
      { rawKey: 'Credit',            container: 'XMP'  },
      { rawKey: 'IPTC:Credit',       container: 'IPTC' },
    ],
  },
  {
    canonical: 'DESCRIPTION',
    label: 'Description / Caption',
    weight: 0.15,
    aliases: [
      { rawKey: 'Description',       container: 'XMP'  },
      { rawKey: 'ImageDescription',  container: 'EXIF' },
      { rawKey: 'Caption-Abstract',  container: 'IPTC' },
      { rawKey: 'IPTC:Caption-Abstract', container: 'IPTC' },
    ],
  },
  {
    canonical: 'KEYWORDS',
    label: 'Keywords / Subject',
    weight: 0.10,
    aliases: [
      { rawKey: 'Subject',           container: 'XMP'  },
      { rawKey: 'Keywords',          container: 'IPTC' },
      { rawKey: 'IPTC:Keywords',     container: 'IPTC' },
    ],
  },
  {
    canonical: 'SOURCE',
    label: 'Source',
    weight: 0.05,
    aliases: [
      { rawKey: 'Source',            container: 'XMP'  },
      { rawKey: 'IPTC:Source',       container: 'IPTC' },
    ],
  },
  {
    canonical: 'CREATOR_TOOL',
    label: 'Creator Tool',
    weight: 0.05,
    aliases: [
      { rawKey: 'CreatorTool',       container: 'XMP'  },
      { rawKey: 'Software',         container: 'EXIF' },
    ],
  },
  {
    canonical: 'TITLE',
    label: 'Title',
    weight: 0.05,
    aliases: [
      { rawKey: 'Title',            container: 'XMP'  },
      { rawKey: 'ObjectName',       container: 'IPTC' },
      { rawKey: 'IPTC:ObjectName',  container: 'IPTC' },
    ],
  },
  {
    canonical: 'USAGE_TERMS',
    label: 'Usage Terms',
    weight: 0.05,
    aliases: [
      { rawKey: 'UsageTerms',       container: 'XMP'  },
      { rawKey: 'XMP-xmpRights:UsageTerms', container: 'XMP' },
    ],
  },
] as const;

// ─── Lookup Helpers ────────────────────────────────────────────

/** Map from raw ExifTool key → canonical name (case-insensitive) */
const rawKeyIndex = new Map<string, string>();
for (const field of CANONICAL_FIELDS) {
  for (const alias of field.aliases) {
    rawKeyIndex.set(alias.rawKey.toLowerCase(), field.canonical);
  }
}

/**
 * Resolve a raw ExifTool tag key to its canonical field name.
 * Returns `undefined` for unmapped / non-authorship keys.
 */
export function resolveCanonical(rawKey: string): string | undefined {
  return rawKeyIndex.get(rawKey.toLowerCase());
}

/**
 * Return the full CanonicalFieldDef for a canonical name.
 */
export function getFieldDef(canonical: string): CanonicalFieldDef | undefined {
  return CANONICAL_FIELDS.find(f => f.canonical === canonical);
}

/**
 * Extract the canonical value from a rawJson blob.
 * Walks aliases in priority order; returns the first non-empty hit.
 */
export function extractCanonicalValue(
  rawJson: Record<string, unknown>,
  canonical: string,
): { value: string | null; source: TagAlias | null } {
  const def = getFieldDef(canonical);
  if (!def) return { value: null, source: null };

  for (const alias of def.aliases) {
    const raw = rawJson[alias.rawKey];
    if (raw === undefined || raw === null) continue;

    const str = Array.isArray(raw) ? raw.join(', ') : String(raw);
    if (str.trim()) {
      return { value: str.trim(), source: alias };
    }
  }

  return { value: null, source: null };
}

/**
 * Extract ALL values for a canonical field, grouped by container.
 * Useful for diffing: shows which containers still carry a value.
 */
export function extractAllContainerValues(
  rawJson: Record<string, unknown>,
  canonical: string,
): { container: MetadataContainer; rawKey: string; value: string }[] {
  const def = getFieldDef(canonical);
  if (!def) return [];

  const results: { container: MetadataContainer; rawKey: string; value: string }[] = [];

  for (const alias of def.aliases) {
    const raw = rawJson[alias.rawKey];
    if (raw === undefined || raw === null) continue;

    const str = Array.isArray(raw) ? raw.join(', ') : String(raw);
    if (str.trim()) {
      results.push({
        container: alias.container,
        rawKey: alias.rawKey,
        value: str.trim(),
      });
    }
  }

  return results;
}

/**
 * Get the total weight sum (should equal 1.0).
 * Useful for verifying the weight distribution is correct.
 */
export function totalWeight(): number {
  return CANONICAL_FIELDS.reduce((sum, f) => sum + f.weight, 0);
}
