/*
  # Fix is_admin function to avoid auth.users access

  1. Changes
    - Rewrite is_admin() to avoid accessing auth schema tables
    - Use only public.user_profiles which has proper RLS policies
    - Simplify the function to avoid permission issues
  
  2. Security
    - Function remains SECURITY DEFINER for proper permission checking
    - Only checks user_profiles table which is accessible
*/

-- Drop and recreate the is_admin function with simpler implementation
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
