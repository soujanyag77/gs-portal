import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { UploadedFile } from './types';
import { isSupabaseConfigured } from './supabase/config';
import { createServerSupabaseAdminClient } from './supabase/server';
import {
  getUploadedFiles,
  getUploadedFileById,
  insertUploadedFile,
  deleteUploadedFile,
} from './db';

const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'portal_data') : path.join(process.cwd(), 'data');
const PORTAL_FILES_DIR = path.join(DATA_DIR, 'uploads', 'portal-files');

function ensurePortalFilesDir() {
  try {
    if (!fs.existsSync(PORTAL_FILES_DIR)) {
      fs.mkdirSync(PORTAL_FILES_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Notice: Local storage directory initialization skipped on read-only system:', err);
  }
}

/**
 * Sanitize filename to avoid path traversal, spaces, or strange chars in storage
 */
export function sanitizeStorageFileName(originalName: string): string {
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
  const base = originalName.includes('.') ? originalName.slice(0, originalName.lastIndexOf('.')) : originalName;
  const cleanBase = base.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/_+/g, '_');
  return `${cleanBase}${ext}`;
}

/**
 * Fetch list of all uploaded files, sorted newest first
 */
export async function listUploadedFiles(): Promise<UploadedFile[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          file_name: item.file_name,
          file_path: item.file_path,
          file_size: Number(item.file_size),
          mime_type: item.mime_type,
          created_at: item.created_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase listUploadedFiles failed, falling back to local SQLite:', err);
    }
  }

  // Fallback to local SQLite database
  return getUploadedFiles();
}

/**
 * Fetch single uploaded file by ID
 */
export async function getUploadedFile(id: string): Promise<UploadedFile | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          file_name: data.file_name,
          file_path: data.file_path,
          file_size: Number(data.file_size),
          mime_type: data.mime_type,
          created_at: data.created_at,
        };
      }
    } catch (err) {
      console.warn('Supabase getUploadedFile failed, falling back to local SQLite:', err);
    }
  }

  // Fallback to local SQLite database
  return getUploadedFileById(id);
}

/**
 * Save file to storage (Supabase 'portal-files' bucket or local disk) and record metadata
 */
export async function saveUploadedFile({
  fileName,
  mimeType,
  fileSize,
  buffer,
}: {
  fileName: string;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
}): Promise<UploadedFile> {
  const id = crypto.randomUUID();
  const safeName = sanitizeStorageFileName(fileName);
  const filePath = `${Date.now()}_${safeName}`;
  const createdAt = new Date().toISOString();

  let savedToSupabase = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();

      // 1. Ensure bucket exists
      try {
        await supabase.storage.createBucket('portal-files', { public: true });
      } catch (bucketErr) {
        // bucket might already exist
      }

      // 2. Upload file to 'portal-files' bucket
      const { error: storageError } = await supabase.storage
        .from('portal-files')
        .upload(filePath, buffer, {
          contentType: mimeType || 'application/octet-stream',
          upsert: true,
        });

      if (storageError) {
        console.warn('Supabase storage upload error:', storageError);
      } else {
        // 3. Insert record into uploaded_files table
        const { error: dbError } = await supabase.from('uploaded_files').insert({
          id,
          file_name: fileName,
          file_path: filePath,
          file_size: fileSize,
          mime_type: mimeType || 'application/octet-stream',
          created_at: createdAt,
        });

        if (dbError) {
          console.warn('Supabase DB insert error:', dbError);
        } else {
          savedToSupabase = true;
        }
      }
    } catch (err) {
      console.warn('Supabase saveUploadedFile error, saving locally:', err);
    }
  }

  // Always save copy to local disk & SQLite database (ensures offline reliability)
  ensurePortalFilesDir();
  const localTarget = path.join(PORTAL_FILES_DIR, filePath);
  try {
    fs.writeFileSync(localTarget, buffer);
  } catch (fsErr) {
    console.warn('Local file write notice:', fsErr);
  }

  const fileRecord: UploadedFile = {
    id,
    file_name: fileName,
    file_path: filePath,
    file_size: fileSize,
    mime_type: mimeType || 'application/octet-stream',
    created_at: createdAt,
  };

  insertUploadedFile(fileRecord);

  return fileRecord;
}

/**
 * Retrieve binary buffer for viewing or downloading
 */
export async function getFileBuffer(file: UploadedFile): Promise<Buffer | null> {
  // 1. Try Supabase Storage download if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { data: blob, error } = await supabase.storage.from('portal-files').download(file.file_path);
      if (!error && blob) {
        return Buffer.from(await blob.arrayBuffer());
      }
    } catch (supaErr) {
      console.warn('Supabase file download check:', supaErr);
    }
  }

  // 2. Check local directories
  const candidateDirs = [
    PORTAL_FILES_DIR,
    path.join(DATA_DIR, 'uploads'),
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'data', 'uploads'),
    path.join(os.tmpdir(), 'portal_data', 'uploads'),
  ];

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    const directPath = path.join(dir, file.file_path);
    if (fs.existsSync(directPath)) {
      return fs.readFileSync(directPath);
    }

    // Try finding by filename
    try {
      const files = fs.readdirSync(dir);
      const match = files.find(
        (f) =>
          f === file.file_path ||
          f.endsWith(file.file_name) ||
          f.includes(file.id) ||
          (file.file_path && f.includes(file.file_path))
      );
      if (match) {
        return fs.readFileSync(path.join(dir, match));
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Delete file from Supabase Storage & Database (and local fallback)
 */
export async function removeUploadedFile(id: string): Promise<boolean> {
  const file = await getUploadedFile(id);
  if (!file) return false;

  let deleted = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      await supabase.storage.from('portal-files').remove([file.file_path]);
      const { error } = await supabase.from('uploaded_files').delete().eq('id', id);
      if (!error) deleted = true;
    } catch (supaErr) {
      console.warn('Supabase delete error:', supaErr);
    }
  }

  // Also clean up local file and SQLite record
  const localTarget = path.join(PORTAL_FILES_DIR, file.file_path);
  if (fs.existsSync(localTarget)) {
    try {
      fs.unlinkSync(localTarget);
    } catch (e) {}
  }

  const localDeleted = deleteUploadedFile(id);
  return deleted || localDeleted;
}
