-- ==============================================================================
-- 🚀 MIGRATION: Create 'uploaded_files' Table & 'portal-files' Storage Bucket
-- ==============================================================================

-- 1. Ensure UUID Extension is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the uploaded_files table
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for ordering files by upload date (newest first)
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_at 
ON public.uploaded_files (created_at DESC);

-- 3. Enable Row Level Security (RLS) on uploaded_files
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for uploaded_files
-- Allow read access to all users (anon, authenticated, public)
DROP POLICY IF EXISTS "Allow public read access to uploaded_files" ON public.uploaded_files;
CREATE POLICY "Allow public read access to uploaded_files"
ON public.uploaded_files
FOR SELECT
TO public, anon, authenticated
USING (true);

-- Allow insert access to all users
DROP POLICY IF EXISTS "Allow public insert access to uploaded_files" ON public.uploaded_files;
CREATE POLICY "Allow public insert access to uploaded_files"
ON public.uploaded_files
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- Allow delete access to all users
DROP POLICY IF EXISTS "Allow public delete access to uploaded_files" ON public.uploaded_files;
CREATE POLICY "Allow public delete access to uploaded_files"
ON public.uploaded_files
FOR DELETE
TO public, anon, authenticated
USING (true);

-- 5. Create 'portal-files' bucket in Supabase Storage if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portal-files', 'portal-files', true, NULL, NULL)
ON CONFLICT (id) DO UPDATE 
SET public = true;

-- 6. Storage Policies for 'portal-files' Bucket
-- Allow public select/download
DROP POLICY IF EXISTS "Allow public view from portal-files" ON storage.objects;
CREATE POLICY "Allow public view from portal-files"
ON storage.objects
FOR SELECT
TO public, anon, authenticated
USING (bucket_id = 'portal-files');

-- Allow public upload
DROP POLICY IF EXISTS "Allow public upload to portal-files" ON storage.objects;
CREATE POLICY "Allow public upload to portal-files"
ON storage.objects
FOR INSERT
TO public, anon, authenticated
WITH CHECK (bucket_id = 'portal-files');

-- Allow public delete
DROP POLICY IF EXISTS "Allow public delete from portal-files" ON storage.objects;
CREATE POLICY "Allow public delete from portal-files"
ON storage.objects
FOR DELETE
TO public, anon, authenticated
USING (bucket_id = 'portal-files');
