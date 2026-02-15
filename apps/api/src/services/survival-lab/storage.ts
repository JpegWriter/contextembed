/**
 * Survival Lab - Storage Service
 * 
 * Handles raw binary file storage in Supabase Storage.
 * 
 * CRITICAL REQUIREMENTS:
 * - Never transform or re-encode uploaded images
 * - Store as raw binary (multipart form-data)
 * - No Sharp/Jimp/Canvas on master files
 * - Generate thumbnails ONLY from a copy, stored separately
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { createTempFilePath, deleteTempFile } from './metadata-extractor';

// Initialize Supabase client
let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn('[SurvivalLab] Supabase not configured - storage disabled. SUPABASE_URL:', !!process.env.SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    return null;
  }
  
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

// Bucket name for Survival Lab
const BUCKET = 'ce-survival-lab';

/**
 * Initialize the Survival Lab storage bucket
 */
export async function initSurvivalLabStorage(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  
  try {
    // Check if bucket exists
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET);
    
    if (!exists) {
      // Create bucket — use 50MB limit (Supabase free plan rejects 100MB)
      const { error } = await client.storage.createBucket(BUCKET, {
        public: false, // Keep private for security
        fileSizeLimit: 50 * 1024 * 1024, // 50MB max (free-plan safe)
      });
      
      if (error && !error.message.includes('already exists')) {
        console.error('[SurvivalLab] Failed to create bucket:', error.message);
        return false;
      }
      
      console.log('[SurvivalLab] Created storage bucket:', BUCKET);
    }
    
    return true;
  } catch (err) {
    console.error('[SurvivalLab] Storage init error:', err);
    return false;
  }
}

/**
 * Upload a raw binary file to storage WITHOUT any transformation.
 * 
 * @param localFilePath Path to the local file (e.g., from multer temp upload)
 * @param storagePath Target path in bucket (e.g., "baselines/{userId}/{id}/{filename}")
 * @returns Storage path if successful, null if failed
 */
export async function uploadRawFile(
  localFilePath: string,
  storagePath: string,
): Promise<string | null> {
  const client = getSupabase();
  if (!client) {
    console.warn('[SurvivalLab] Storage not available, cannot upload');
    return null;
  }
  
  try {
    // Read file as raw binary buffer (NOT base64)
    const buffer = await fs.promises.readFile(localFilePath);
    
    // Determine content type from extension
    const ext = path.extname(localFilePath).toLowerCase();
    const contentType = getContentType(ext);
    
    // Upload to Supabase Storage
    const { data, error } = await client.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
        duplex: 'half',
      });
    
    if (error) {
      console.error('[SurvivalLab] Upload error:', error.message);
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
    
    console.log(`[SurvivalLab] Uploaded: ${storagePath} (${buffer.length} bytes)`);
    return storagePath;
  } catch (err: any) {
    console.error('[SurvivalLab] Upload failed:', err);
    throw new Error(`Storage upload failed: ${err?.message || String(err)}`);
  }
}

/**
 * Download a file from storage to a local temp file.
 * Returns the local file path for processing.
 * 
 * IMPORTANT: Caller must delete the temp file after use.
 */
export async function downloadToTempFile(
  storagePath: string,
  originalFilename: string,
): Promise<string | null> {
  const client = getSupabase();
  if (!client) {
    console.warn('[SurvivalLab] Storage not available, cannot download');
    return null;
  }
  
  try {
    const { data, error } = await client.storage
      .from(BUCKET)
      .download(storagePath);
    
    if (error || !data) {
      console.error('[SurvivalLab] Download error:', error?.message);
      return null;
    }
    
    // Write to temp file
    const tempPath = createTempFilePath(originalFilename);
    const buffer = Buffer.from(await data.arrayBuffer());
    await fs.promises.writeFile(tempPath, buffer);
    
    return tempPath;
  } catch (err) {
    console.error('[SurvivalLab] Download failed:', err);
    return null;
  }
}

/**
 * Download a file and stream to a local path.
 * Uses streaming to avoid holding large files in memory.
 */
export async function downloadToPath(
  storagePath: string,
  localPath: string,
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  
  try {
    const { data, error } = await client.storage
      .from(BUCKET)
      .download(storagePath);
    
    if (error || !data) {
      console.error('[SurvivalLab] Download error:', error?.message);
      return false;
    }
    
    // Stream to file
    const reader = data.stream().getReader();
    const writeStream = fs.createWriteStream(localPath);
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        writeStream.write(value);
      }
      writeStream.end();
      
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      return true;
    } finally {
      reader.releaseLock();
    }
  } catch (err) {
    console.error('[SurvivalLab] Download to path failed:', err);
    return false;
  }
}

/**
 * Get a public URL for a file (if bucket is public) or signed URL
 */
export async function getFileUrl(storagePath: string, expiresInSeconds = 3600): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  
  try {
    const { data, error } = await client.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);
    
    if (error) {
      console.error('[SurvivalLab] Signed URL error:', error.message);
      return null;
    }
    
    return data.signedUrl;
  } catch (err) {
    console.error('[SurvivalLab] Get URL failed:', err);
    return null;
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(storagePath: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  
  try {
    const { error } = await client.storage
      .from(BUCKET)
      .remove([storagePath]);
    
    if (error) {
      console.error('[SurvivalLab] Delete error:', error.message);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[SurvivalLab] Delete failed:', err);
    return false;
  }
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  return getSupabase() !== null;
}

/**
 * Get content type from file extension
 */
function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
  };
  
  return types[ext] || 'application/octet-stream';
}

/**
 * Generate storage paths for Survival Lab files
 */
export const storagePaths = {
  baseline: (userId: string, baselineId: string, filename: string) =>
    `baselines/${userId}/${baselineId}/${filename}`,
  
  scenario: (userId: string, testRunId: string, scenario: string, baselineId: string, filename: string) =>
    `runs/${userId}/${testRunId}/${scenario}/${baselineId}/${filename}`,
};
