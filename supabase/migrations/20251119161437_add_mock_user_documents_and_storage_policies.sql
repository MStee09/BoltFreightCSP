/*
  # Add Mock User Policies for Documents and Storage

  1. Changes
    - Add RLS policies for mock user to access documents table
    - Add storage policies for mock user to upload/download files
    - Mock user ID: 00000000-0000-0000-0000-000000000000
  
  2. Security
    - These policies only apply to the specific mock user ID
    - Real user data remains protected by existing policies
*/

-- Documents table policies for mock user
CREATE POLICY "Mock user can view documents"
  ON documents FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert documents"
  ON documents FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update documents"
  ON documents FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete documents"
  ON documents FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Storage policies for mock user
CREATE POLICY "Mock user can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
  );

CREATE POLICY "Mock user can view files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
  );

CREATE POLICY "Mock user can download files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
  );

CREATE POLICY "Mock user can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
  );
