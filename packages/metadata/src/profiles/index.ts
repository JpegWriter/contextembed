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
import * as crypto from 'crypto';
import { ExifTool } from 'exiftool-vendored';

import {
  EmbedProfile,
  ProfileName,
  UserContext,
  AssetContext,
  EmbedOptions,
  ProfileEmbedResult,
  ForensicContext,
  ForensicEmbedResult,
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

  // CE_LAB_FORENSIC is internal-only — block unless LAB_MODE=true
  if (name === 'CE_LAB_FORENSIC' && process.env.LAB_MODE !== 'true') {
    throw new Error(
      'CE_LAB_FORENSIC is internal only. Set LAB_MODE=true to enable.',
    );
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

    # Shared (production + forensic)
    Version           => { },
    ExportProfile     => { },
    Timestamp         => { },

    # Forensic-only (CE_LAB_FORENSIC)
    RunID             => { },
    BaselineID        => { },
    OriginalHash      => { },
    FileSizeOriginal  => { Writable => 'integer' },
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
// FORENSIC BASELINE ENTRY POINT
// =============================================================================

/**
 * Compute SHA-256 of a file on disk.
 */
async function sha256File(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Embed a forensic baseline image for Survival Lab testing.
 *
 * This is the dedicated entry point for CE_LAB_FORENSIC.  It:
 *   1. Computes the SHA-256 of the original file.
 *   2. Renames the output to include the baselineID long-filename marker.
 *   3. Delegates to embedWithProfile() with ForensicContext injected.
 *   4. Re-reads the full metadata snapshot and computes a post-write hash.
 *
 * Requires LAB_MODE=true in the environment.
 *
 * @example
 * ```bash
 * LAB_MODE=true npx ts-node -e "
 *   import { embedForensicBaseline } from '@contextembed/metadata';
 *   embedForensicBaseline(
 *     './test-images/sample.jpg',
 *     '01',
 *     { displayName: 'Test User' },
 *   ).then(r => console.log(JSON.stringify(r, null, 2)));
 * "
 * ```
 */
export async function embedForensicBaseline(
  filePath: string,
  baselineID: string,
  user: UserContext,
  outputDir?: string,
): Promise<ForensicEmbedResult> {
  // 1. Compute original hash + size
  const stat = await fs.stat(filePath);
  const originalHash = await sha256File(filePath);
  const fileSizeOriginal = stat.size;

  // 2. Build output path with long-filename marker
  const ext = path.extname(filePath);
  const dir = outputDir || path.dirname(filePath);
  const outputPath = path.join(
    dir,
    `CE_LAB_${baselineID}_LONG_FILENAME_TEST${ext}`,
  );

  // 3. Inject ForensicContext into asset via hidden _forensic field
  const forensicCtx: ForensicContext = {
    baselineID,
    originalHash,
    fileSizeOriginal,
  };

  const asset: AssetContext & { _forensic: ForensicContext } = {
    _forensic: forensicCtx,
  };

  // 4. Delegate to the standard embed pipeline
  const result = await embedWithProfile(
    filePath,
    'CE_LAB_FORENSIC',
    user,
    asset as unknown as AssetContext,
    { overwrite: true },
    outputPath,
  );

  // 5. Post-write: compute embedded hash + full metadata snapshot
  let embeddedHash = '';
  let metadataSnapshot: Record<string, unknown> = {};

  if (result.success) {
    embeddedHash = await sha256File(outputPath);

    try {
      const et = await getExifTool();
      const tags = await et.read(outputPath);
      metadataSnapshot = Object.fromEntries(
        Object.entries(tags as Record<string, unknown>).filter(
          ([_, v]) => v !== undefined && v !== null,
        ),
      );
    } catch {
      result.warnings.push('Failed to read metadata snapshot after embed');
    }
  }

  return {
    ...result,
    baselineID,
    originalHash,
    embeddedHash,
    metadataSnapshot,
  };
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
