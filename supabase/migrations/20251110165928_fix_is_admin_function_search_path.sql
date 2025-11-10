/*
  # Fix is_admin function search path

  1. Changes
    - Update is_admin() function to include 'auth' in search_path
    - This fixes the "permission denied for table users" error when checking admin status
  
  2. Security
    - Function remains SECURITY DEFINER for proper permission checking
    - Adds 'auth' schema to search_path so auth.uid() works correctly
*/

-- Drop and recreate the is_admin function with correct search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$;
