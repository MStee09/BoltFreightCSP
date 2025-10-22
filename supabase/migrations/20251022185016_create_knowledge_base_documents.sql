/*
  # Create Knowledge Base Documents Table

  1. New Tables
    - `knowledge_base_documents`
      - `id` (uuid, primary key)
      - `title` (text) - Document title/name
      - `content` (text) - Full document content
      - `file_type` (text) - File extension (pdf, docx, txt, etc.)
      - `file_size` (integer) - Size in bytes
      - `uploaded_by` (uuid) - User who uploaded it
      - `is_active` (boolean) - Whether to use this doc in AI responses
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `metadata` (jsonb) - Additional file metadata

  2. Security
    - Enable RLS on `knowledge_base_documents` table
    - Only authenticated users can read knowledge base documents
    - Only authenticated users can create/update/delete documents
*/

CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge base documents"
  ON knowledge_base_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create knowledge base documents"
  ON knowledge_base_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Authenticated users can update knowledge base documents"
  ON knowledge_base_documents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete knowledge base documents"
  ON knowledge_base_documents
  FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_knowledge_base_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_base_documents_updated_at
  BEFORE UPDATE ON knowledge_base_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_documents_updated_at();