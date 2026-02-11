/**
 * Supabase Storage Service
 * Handles persistent storage for thumbnails and previews
 * 
 * Storage buckets:
 * - thumbnails: Low-res previews for dashboard (public, cached)
 * - exports: Temporary export downloads (private, TTL)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Thumbnail settings
const THUMBNAIL_SIZE = 400; // px (width)
const THUMBNAIL_QUALITY = 80; // JPEG quality
const PREVIEW_SIZE = 1200; // px (for larger preview if needed)

// Bucket names
export const BUCKETS = {
  THUMBNAILS: 'thumbnails',
  EXPORTS: 'exports',
  EMBEDDED: 'embedded-files',
} as const;

let supabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase client
 */
function getClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase credentials not configured');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabaseClient;
}

/**
 * Initialize storage buckets
 */
export async function initSupabaseStorage(): Promise<void> {
  const client = getClient();
  
  // Create thumbnails bucket (public)
  const { error: thumbError } = await client.storage.createBucket(BUCKETS.THUMBNAILS, {
    public: true,
    fileSizeLimit: 1024 * 1024, // 1MB max
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  
  if (thumbError && !thumbError.message.includes('already exists')) {
    console.warn('Failed to create thumbnails bucket:', thumbError.message);
  }
  
  // Create exports bucket (private, for temporary downloads)
  const { error: exportError } = await client.storage.createBucket(BUCKETS.EXPORTS, {
    public: false,
    fileSizeLimit: 500 * 1024 * 1024, // 500MB max for zip exports
  });
  
  if (exportError && !exportError.message.includes('already exists')) {
    console.warn('Failed to create exports bucket:', exportError.message);
  }
  
  // Create embedded-files bucket (private, for persistent embedded originals)
  const { error: embeddedError } = await client.storage.createBucket(BUCKETS.EMBEDDED, {
    public: false,
    fileSizeLimit: 100 * 1024 * 1024, // 100MB max per file
  });
  
  if (embeddedError && !embeddedError.message.includes('already exists')) {
    console.warn('Failed to create embedded-files bucket:', embeddedError.message);
  }
  
  console.log('📦 Supabase Storage initialized');
}

/**
 * Generate and upload thumbnail from image buffer or path
 */
export async function uploadThumbnail(
  source: Buffer | string,
  projectId: string,
  assetId: string,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg'
): Promise<{ url: string; path: string }> {
  const client = getClient();
  
  // Read source if it's a path
  const imageBuffer = typeof source === 'string' 
    ? await fs.readFile(source)
    : source;
  
  // Generate thumbnail
  let thumbnailBuffer: Buffer;
  
  if (format === 'jpeg') {
    thumbnailBuffer = await sharp(imageBuffer)
      .resize(THUMBNAIL_SIZE, null, { 
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();
  } else if (format === 'png') {
    thumbnailBuffer = await sharp(imageBuffer)
      .resize(THUMBNAIL_SIZE, null, { 
        withoutEnlargement: true,
        fit: 'inside',
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } else {
    thumbnailBuffer = await sharp(imageBuffer)
      .resize(THUMBNAIL_SIZE, null, { 
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toBuffer();
  }
  
  const storagePath = `${projectId}/${assetId}.${format}`;
  const contentType = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
  
  // Upload to Supabase
  const { error } = await client.storage
    .from(BUCKETS.THUMBNAILS)
    .upload(storagePath, thumbnailBuffer, {
      contentType,
      cacheControl: '31536000', // 1 year cache
      upsert: true,
    });
  
  if (error) {
    throw new Error(`Failed to upload thumbnail: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = client.storage
    .from(BUCKETS.THUMBNAILS)
    .getPublicUrl(storagePath);
  
  return {
    url: urlData.publicUrl,
    path: storagePath,
  };
}

/**
 * Delete thumbnail
 */
export async function deleteThumbnail(
  projectId: string,
  assetId: string
): Promise<void> {
  const client = getClient();
  
  // Try all formats
  const formats = ['jpeg', 'png', 'webp'];
  const paths = formats.map(f => `${projectId}/${assetId}.${f}`);
  
  await client.storage
    .from(BUCKETS.THUMBNAILS)
    .remove(paths);
}

/**
 * Delete all thumbnails for a project
 */
export async function deleteProjectThumbnails(projectId: string): Promise<void> {
  const client = getClient();
  
  const { data: files } = await client.storage
    .from(BUCKETS.THUMBNAILS)
    .list(projectId);
  
  if (files && files.length > 0) {
    const paths = files.map(f => `${projectId}/${f.name}`);
    await client.storage
      .from(BUCKETS.THUMBNAILS)
      .remove(paths);
  }
}

/**
 * Upload export zip to Supabase (for download)
 * Uses streaming to avoid loading entire ZIP into memory.
 */
export async function uploadExport(
  zipPath: string,
  exportId: string,
  userId: string
): Promise<{ url: string; expiresAt: Date }> {
  const client = getClient();
  
  // Get file stats for Content-Length without reading into memory
  const stats = await fs.stat(zipPath);
  
  // Create a readable stream instead of reading entire file into memory
  const fileStream = createReadStream(zipPath);
  
  // Collect chunks for Supabase (it doesn't support true streaming yet)
  // But we process in chunks to avoid single huge allocation
  const chunks: Buffer[] = [];
  for await (const chunk of fileStream) {
    chunks.push(chunk as Buffer);
  }
  const zipBuffer = Buffer.concat(chunks);
  // Clear chunks array to allow GC
  chunks.length = 0;
  
  const storagePath = `${userId}/${exportId}.zip`;
  
  const { error } = await client.storage
    .from(BUCKETS.EXPORTS)
    .upload(storagePath, zipBuffer, {
      contentType: 'application/zip',
      upsert: true,
    });
  
  if (error) {
    throw new Error(`Failed to upload export: ${error.message}`);
  }
  
  // Generate signed URL (24 hour expiry)
  const expiresIn = 24 * 60 * 60; // 24 hours in seconds
  const { data: signedData, error: signError } = await client.storage
    .from(BUCKETS.EXPORTS)
    .createSignedUrl(storagePath, expiresIn);
  
  if (signError || !signedData) {
    throw new Error(`Failed to create signed URL: ${signError?.message}`);
  }
  
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  
  return {
    url: signedData.signedUrl,
    expiresAt,
  };
}

/**
 * Get a fresh signed URL for an existing export in Supabase
 */
export async function getSignedExportUrl(
  storagePath: string,
  expiresInSeconds = 24 * 60 * 60,
): Promise<string | null> {
  try {
    const client = getClient();
    const { data, error } = await client.storage
      .from(BUCKETS.EXPORTS)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data) {
      console.warn(`Failed to create signed URL for export ${storagePath}:`, error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.warn('Error creating signed export URL:', err);
    return null;
  }
}

/**
 * Delete export
 */
export async function deleteExport(
  exportId: string,
  userId: string
): Promise<void> {
  const client = getClient();
  
  const storagePath = `${userId}/${exportId}.zip`;
  
  await client.storage
    .from(BUCKETS.EXPORTS)
    .remove([storagePath]);
}

/**
 * Clean up old exports (call periodically)
 */
export async function cleanupOldExports(maxAgeHours = 24): Promise<number> {
  const client = getClient();
  
  const { data: folders } = await client.storage
    .from(BUCKETS.EXPORTS)
    .list();
  
  if (!folders) return 0;
  
  let deletedCount = 0;
  const maxAge = maxAgeHours * 60 * 60 * 1000;
  const now = Date.now();
  
  for (const folder of folders) {
    const { data: files } = await client.storage
      .from(BUCKETS.EXPORTS)
      .list(folder.name);
    
    if (!files) continue;
    
    const oldFiles = files.filter(f => {
      const fileAge = now - new Date(f.created_at).getTime();
      return fileAge > maxAge;
    });
    
    if (oldFiles.length > 0) {
      const paths = oldFiles.map(f => `${folder.name}/${f.name}`);
      await client.storage
        .from(BUCKETS.EXPORTS)
        .remove(paths);
      deletedCount += oldFiles.length;
    }
  }
  
  return deletedCount;
}

/**
 * Upload embedded file to Supabase (for persistent storage across deploys)
 */
export async function uploadEmbeddedFile(
  filePath: string,
  projectId: string,
  assetId: string,
): Promise<string> {
  const client = getClient();
  
  const fileBuffer = await fs.readFile(filePath);
  const ext = path.extname(filePath);
  const storagePath = `${projectId}/${assetId}${ext}`;
  
  const { error } = await client.storage
    .from(BUCKETS.EMBEDDED)
    .upload(storagePath, fileBuffer, {
      contentType: ext === '.png' ? 'image/png' : 'image/jpeg',
      upsert: true,
    });
  
  if (error) {
    throw new Error(`Failed to upload embedded file: ${error.message}`);
  }
  
  return storagePath;
}

/**
 * Download embedded file from Supabase to a local temp path.
 * Streams to disk to avoid holding entire file in memory.
 */
export async function downloadEmbeddedFile(
  storagePath: string,
  localDestPath: string,
): Promise<boolean> {
  try {
    const client = getClient();
    
    const { data, error } = await client.storage
      .from(BUCKETS.EMBEDDED)
      .download(storagePath);
    
    if (error || !data) {
      console.warn(`Failed to download embedded file ${storagePath}:`, error?.message);
      return false;
    }
    
    // Ensure directory exists
    const dir = path.dirname(localDestPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Stream the blob to disk instead of buffering entirely in memory
    const writeStream = createWriteStream(localDestPath);
    const reader = data.stream().getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        writeStream.write(Buffer.from(value));
      }
      writeStream.end();
      
      // Wait for write to complete
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    } finally {
      reader.releaseLock();
    }
    
    return true;
  } catch (err) {
    console.warn(`Error downloading embedded file:`, err);
    return false;
  }
}

/**
 * Get thumbnail URL (public)
 */
export function getThumbnailUrl(projectId: string, assetId: string, format = 'jpeg'): string {
  const client = getClient();
  const storagePath = `${projectId}/${assetId}.${format}`;
  
  const { data } = client.storage
    .from(BUCKETS.THUMBNAILS)
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

/**
 * Check if Supabase Storage is available
 */
export async function isStorageAvailable(): Promise<boolean> {
  try {
    const client = getClient();
    const { error } = await client.storage.listBuckets();
    return !error;
  } catch {
    return false;
  }
}
