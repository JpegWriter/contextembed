/**
 * Profile Registry & embedWithProfile() entry point
 *
 * Architecture:
 *   1. Register all profiles in PROFILE_REGISTRY.
 *   2. Call embedWithProfile(filePath, profileName, user, asset?, options?)
 *      → copies file, builds tags via the selected profile, writes via ExifTool,
 *        re-reads to verify, returns ProfileEmbedResult.
 *
 * Custom XMP namespace  http://contextembed.com/ns/1.0/
 * is registered automatically before first write via a temp ExifTool config.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ExifTool } from 'exiftool-vendored';

import {
  EmbedProfile,
  ProfileName,
  UserContext,
  AssetContext,
  EmbedOptions,
  ProfileEmbedResult,
} from './types';
import { productionStandard } from './production-standard';
import { labForensic } from './lab-forensic';

// =============================================================================
// PROFILE REGISTRY
// =============================================================================

const PROFILE_REGISTRY = new Map<ProfileName, EmbedProfile>([
  ['CE_PRODUCTION_STANDARD', productionStandard],
  ['CE_LAB_FORENSIC', labForensic],
]);

/**
 * Retrieve a profile by name.  Throws if the profile is not registered.
 */
export function getProfile(name: ProfileName): EmbedProfile {
  const profile = PROFILE_REGISTRY.get(name);
  if (!profile) {
    throw new Error(`Unknown export profile: ${name}`);
  }
  return profile;
}

/**
 * List every registered profile name.
 */
export function listProfiles(): ProfileName[] {
  return Array.from(PROFILE_REGISTRY.keys());
}

/**
 * Register a custom profile at runtime (for plugins / tests).
 */
export function registerProfile(profile: EmbedProfile): void {
  PROFILE_REGISTRY.set(profile.name, profile);
}

// =============================================================================
// CUSTOM NAMESPACE CONFIG
// =============================================================================

/**
 * ExifTool user config that registers the CE namespace.
 *
 *   Namespace URI : http://contextembed.com/ns/1.0/
 *   Prefix        : CE
 */
const CE_NAMESPACE_CONFIG = `
%Image::ExifTool::UserDefined = (
    'Image::ExifTool::XMP::Main' => {
        CE => {
            SubDirectory => {
                TagTable => 'Image::ExifTool::UserDefined::CE',
            },
        },
    },
);

%Image::ExifTool::UserDefined::CE = (
    GROUPS => { 0 => 'XMP', 1 => 'XMP-CE', 2 => 'Image' },
    NAMESPACE => { 'CE' => 'http://contextembed.com/ns/1.0/' },
    WRITABLE => 'string',
    Version        => { },
    ExportProfile  => { },
    Timestamp      => { },
);
`;

let configPath: string | null = null;

/**
 * Ensure the CE namespace config file exists on disk and return its path.
 */
async function ensureNamespaceConfig(): Promise<string> {
  if (configPath) return configPath;

  const tmpDir = os.tmpdir();
  configPath = path.join(tmpDir, '.CE_ExifTool_config');
  await fs.writeFile(configPath, CE_NAMESPACE_CONFIG, 'utf-8');
  return configPath;
}

// =============================================================================
// SHARED EXIFTOOL INSTANCE
// =============================================================================

let sharedEt: ExifTool | null = null;

async function getExifTool(): Promise<ExifTool> {
  if (sharedEt && !sharedEt.ended) return sharedEt;

  const cfgPath = await ensureNamespaceConfig();
  sharedEt = new ExifTool({ exiftoolArgs: ['-config', cfgPath] });
  return sharedEt;
}

/**
 * Shut down the profile-system's ExifTool instance (call on app shutdown).
 */
export async function closeProfileExifTool(): Promise<void> {
  if (sharedEt && !sharedEt.ended) {
    await sharedEt.end();
    sharedEt = null;
  }
}

// =============================================================================
// CORE ENTRY POINT
// =============================================================================

/**
 * Embed metadata into an image using a named export profile.
 *
 * @param filePath    Absolute path to the source image.
 * @param profileName Registered profile identifier.
 * @param user        Authenticated user context.
 * @param asset       Optional per-image content fields.
 * @param options     Optional write-behaviour flags.
 * @param outputPath  Optional output path; defaults to `<name>_embedded.<ext>`.
 * @returns           ProfileEmbedResult with verification data.
 *
 * @example
 * ```ts
 * import { embedWithProfile } from '@contextembed/metadata/profiles';
 *
 * const result = await embedWithProfile(
 *   '/images/hero.jpg',
 *   'CE_PRODUCTION_STANDARD',
 *   { displayName: 'Jane Doe', businessName: 'JD Studio', website: 'https://jdstudio.com' },
 *   {
 *     shortAlt: 'Bride portrait in golden hour light',
 *     longDescription: 'A radiant bride stands in a sunlit vineyard …',
 *     structuredKeywords: ['wedding', 'portrait', 'golden hour', 'vineyard'],
 *   },
 * );
 * console.log(result);
 * ```
 */
export async function embedWithProfile(
  filePath: string,
  profileName: ProfileName,
  user: UserContext,
  asset: AssetContext = {},
  options: EmbedOptions = {},
  outputPath?: string,
): Promise<ProfileEmbedResult> {
  const t0 = Date.now();
  const warnings: string[] = [];

  // 1. Resolve profile
  const profile = getProfile(profileName);

  // 2. Determine output path
  if (!outputPath) {
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    outputPath = path.join(dir, `${base}_embedded${ext}`);
  }

  try {
    // 3. Copy source → output (never mutate originals)
    await fs.copyFile(filePath, outputPath);

    // 4. Build tags from profile
    const tags = profile.buildTags(user, asset, options);
    const fieldsWritten = Object.keys(tags);

    // 5. Write via ExifTool (with namespace config loaded)
    const et = await getExifTool();
    await et.write(outputPath, tags as Record<string, any>, ['-overwrite_original']);

    // 6. Verify — re-read and check each written tag
    const verification = await verifyWrite(et, outputPath, tags);

    if (verification.missing.length > 0) {
      for (const m of verification.missing) {
        warnings.push(`Missing after write: ${m}`);
      }
    }

    return {
      success: true,
      profileName,
      outputPath,
      fieldsWritten,
      warnings,
      verification,
      durationMs: Date.now() - t0,
    };
  } catch (error) {
    return {
      success: false,
      profileName,
      outputPath: outputPath!,
      fieldsWritten: [],
      warnings,
      verification: { verified: false, present: [], missing: [] },
      durationMs: Date.now() - t0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// POST-WRITE VERIFICATION
// =============================================================================

async function verifyWrite(
  et: ExifTool,
  filePath: string,
  expectedTags: Record<string, string | string[] | number | boolean>,
): Promise<{ verified: boolean; present: string[]; missing: string[] }> {
  const present: string[] = [];
  const missing: string[] = [];

  try {
    const actual = (await et.read(filePath)) as Record<string, unknown>;

    for (const key of Object.keys(expectedTags)) {
      // Normalise ExifTool's key format (strip namespace colons for lookup)
      const plain = key.replace(/^.*:/, '');
      const found =
        actual[key] !== undefined &&
        actual[key] !== null &&
        actual[key] !== '' ||
        actual[plain] !== undefined &&
        actual[plain] !== null &&
        actual[plain] !== '';

      if (found) {
        present.push(key);
      } else {
        missing.push(key);
      }
    }
  } catch {
    // If read fails we treat everything as missing (but don't throw)
    missing.push(...Object.keys(expectedTags));
  }

  return {
    verified: missing.length === 0,
    present,
    missing,
  };
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export * from './types';
export { productionStandard } from './production-standard';
export { labForensic } from './lab-forensic';
