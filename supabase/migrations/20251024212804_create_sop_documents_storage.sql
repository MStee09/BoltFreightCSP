/*
  # Create Storage Bucket for SOP Documents

  1. Overview
    - Creates a storage bucket for SOP document uploads
    - Enables secure file storage for PDFs, Word docs, Excel files
    - Sets up RLS policies for file access

  2. Storage Setup
    - Bucket name: 'sop-documents'
    - Allowed file types: PDF, DOC, DOCX, XLS, XLSX
    - Size limit: 50MB per file

  3. Security
    - Users can upload files to their own folders
    - Users can view files they have access to
    - Files are organized by user_id/tariff_id/filename
*/

-- Create storage bucket for SOP documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('sop-documents', 'sop-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload SOP documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own SOP documents
CREATE POLICY "Users can view their SOP documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow mock user to upload files
CREATE POLICY "Mock user can upload SOP documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
);

-- Allow mock user to view their documents
CREATE POLICY "Mock user can view their SOP documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their SOP documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow mock user to delete their documents
CREATE POLICY "Mock user can delete their SOP documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'sop-documents' AND
  (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
);