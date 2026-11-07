import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { isSupabaseConfigured } from './supabase/config';
import { createServerSupabaseClient } from './supabase/server';

import os from 'os';

const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'portal_data') : path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const UNPACKED_DIR = path.join(UPLOADS_DIR, 'unpacked');

function ensureUploadDirs() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(UNPACKED_DIR)) {
      fs.mkdirSync(UNPACKED_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Storage directory initialization skipped on serverless:', err);
  }
}

export interface StoredFileInfo {
  fileName: string;
  storedFileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  storageProvider: 'supabase' | 'local';
  publicUrl?: string;
  interactiveEntryUrl?: string;
}

export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalFileName: string,
  resourceId: string,
  mimeType: string
): Promise<StoredFileInfo> {
  ensureUploadDirs();
  const ext = path.extname(originalFileName).toLowerCase();
  const safeBase = path
    .basename(originalFileName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);
  const storedFileName = `${resourceId}_${safeBase}${ext}`;
  const filePath = path.join(UPLOADS_DIR, storedFileName);

  // Always keep local copy for offline previews and zip unpacking
  fs.writeFileSync(filePath, fileBuffer);
  const fileSize = fileBuffer.length;

  let interactiveEntryUrl: string | undefined;

  // If zip package, attempt extraction for HTML5 interactive package
  if (ext === '.zip') {
    try {
      const zip = new AdmZip(filePath);
      const targetDir = path.join(UNPACKED_DIR, resourceId);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      zip.extractAllTo(targetDir, true);

      const zipEntries = zip.getEntries();
      const htmlEntry =
        zipEntries.find((e) => e.entryName.toLowerCase().endsWith('index.html')) ||
        zipEntries.find((e) => e.entryName.toLowerCase().endsWith('.html'));

      if (htmlEntry) {
        interactiveEntryUrl = `/api/resources/${resourceId}/interactive/${htmlEntry.entryName}`;
      }
    } catch (err) {
      console.error('Error extracting zip package:', err);
    }
  }

  // If Supabase Storage is configured, also push to 'class-resources' bucket
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      const storagePath = `uploads/${storedFileName}`;

      const { data, error } = await supabase.storage
        .from('class-resources')
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error) {
        const { data: publicData } = supabase.storage
          .from('class-resources')
          .getPublicUrl(storagePath);

        return {
          fileName: originalFileName,
          storedFileName,
          filePath,
          fileSize,
          mimeType,
          storageProvider: 'supabase',
          publicUrl: publicData.publicUrl,
          interactiveEntryUrl,
        };
      } else {
        console.warn('Supabase storage upload notice:', error.message);
      }
    } catch (err) {
      console.warn('Supabase storage fallback to local:', err);
    }
  }

  return {
    fileName: originalFileName,
    storedFileName,
    filePath,
    fileSize,
    mimeType,
    storageProvider: 'local',
    interactiveEntryUrl,
  };
}

export async function deleteStoredFile(storedFileName: string, resourceId?: string): Promise<boolean> {
  try {
    // Delete local file
    const filePath = path.join(UPLOADS_DIR, storedFileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (resourceId) {
      const unpackedPath = path.join(UNPACKED_DIR, resourceId);
      if (fs.existsSync(unpackedPath)) {
        fs.rmSync(unpackedPath, { recursive: true, force: true });
      }
    }

    // Delete from Supabase Storage if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = createServerSupabaseClient();
        await supabase.storage.from('class-resources').remove([`uploads/${storedFileName}`]);
      } catch (e) {
        // ignore
      }
    }

    return true;
  } catch (err) {
    console.error('Failed to delete file:', err);
    return false;
  }
}

export function getUploadFilePath(storedFileName: string): string | null {
  const candidateDirs = [
    UPLOADS_DIR,
    path.join(process.cwd(), 'data', 'uploads'),
    path.join(os.tmpdir(), 'portal_data', 'uploads'),
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'public', 'uploads'),
  ];
  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    const filePath = path.join(dir, storedFileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

export function getUnpackedFilePath(resourceId: string, subPath: string): string | null {
  const candidateUnpackedDirs = [
    UNPACKED_DIR,
    path.join(process.cwd(), 'data', 'uploads', 'unpacked'),
    path.join(os.tmpdir(), 'portal_data', 'uploads', 'unpacked'),
  ];
  for (const baseDir of candidateUnpackedDirs) {
    if (!fs.existsSync(baseDir)) continue;
    const targetBase = path.join(baseDir, resourceId);
    const filePath = path.join(targetBase, subPath);
    const normalized = path.normalize(filePath);
    if (normalized.startsWith(targetBase) && fs.existsSync(normalized)) {
      return normalized;
    }
  }
  return null;
}
