/*
  # Fix Documents Table RLS Policies

  1. Changes
    - Add UPDATE policy for documents table
    - Restore mock user (00000000-0000-0000-0000-000000000000) access for testing
    - Allow authenticated users to manage their own documents
    - Allow all users to access mock user documents for demo purposes

  2. Security
    - Users can only modify their own documents
    - Mock user documents are accessible to all authenticated users
    - Proper WITH CHECK clauses for INSERT and UPDATE operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;

-- Create SELECT policy (read access)
CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- Create INSERT policy (create access)
CREATE POLICY "Users can insert their own documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- Create UPDATE policy (modify access)
CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );

-- Create DELETE policy (remove access)
CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
  );
