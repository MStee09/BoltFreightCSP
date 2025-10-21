/*
  # Create Documents Table

  1. New Tables
    - `documents`
      - `id` (uuid, primary key) - Unique identifier for the document
      - `entity_type` (text, not null) - Type of entity the document belongs to (customer, csp_event, carrier, etc.)
      - `entity_id` (uuid, not null) - ID of the entity the document belongs to
      - `customer_id` (uuid, nullable) - Direct reference to customer for easy filtering
      - `csp_event_id` (uuid, nullable) - Direct reference to CSP event if applicable
      - `file_name` (text, not null) - Original file name
      - `file_path` (text, not null) - Path to file in Supabase Storage
      - `file_size` (integer, default 0) - File size in bytes
      - `file_type` (text, default '') - MIME type of the file
      - `document_type` (text, default 'general') - Category/type of document
      - `description` (text, default '') - Optional description
      - `uploaded_by` (text, default '') - Name of person who uploaded
      - `created_date` (timestamptz, default now()) - Upload timestamp
      - `user_id` (uuid, not null) - User who owns this document
  
  2. Security
    - Enable RLS on `documents` table
    - Add policy for authenticated users to read their own documents
    - Add policy for authenticated users to insert their own documents
    - Add policy for authenticated users to delete their own documents
  
  3. Indexes
    - Create index on entity_type and entity_id for fast lookups
    - Create index on customer_id for filtering customer documents
    - Create index on csp_event_id for filtering CSP event documents

  4. Storage Bucket
    - Create a storage bucket for document uploads
    - Enable RLS on the storage bucket
    - Add policies for authenticated users to upload, read, and delete their own files
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer DEFAULT 0,
  file_type text DEFAULT '',
  document_type text DEFAULT 'general',
  description text DEFAULT '',
  uploaded_by text DEFAULT '',
  created_date timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_csp_event ON documents(csp_event_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
