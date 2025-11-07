/*
  # Optimize RLS Policies - Documents Table

  1. Performance Optimization
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Uses correct column name: user_id (not created_by)
  
  2. Table Affected
    - documents: 4 policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view their own documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own documents"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own documents"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own documents"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));
