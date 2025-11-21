/*
  # Fix Documents RLS Policies for All Uploads

  1. Changes
    - Drop existing restrictive INSERT policy for documents
    - Create new permissive policy allowing all authenticated users to upload documents
    - This fixes document upload errors across Customers, Carriers, and CSP Events
  
  2. Security
    - Still requires authentication
    - Users can only view/modify documents they uploaded or mock user documents
    - Upload restriction removed to allow seamless document uploads from any context
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users and mock can insert documents" ON documents;

-- Create new permissive INSERT policy for all authenticated users
CREATE POLICY "Authenticated users can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Keep existing SELECT policy (users can view their own or mock user documents)
-- Keep existing UPDATE policy (users can update their own or mock user documents)
-- Keep existing DELETE policy (users can delete their own or mock user documents)