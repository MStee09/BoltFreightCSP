/*
  # Fix is_admin Function Search Path

  1. Security Improvements
    - Set search_path to empty string to prevent search path manipulation attacks
    - Explicitly qualify all function calls with schema names

  2. Changes
    - Drop and recreate is_admin function with secure search_path
*/

-- Drop existing function
DROP FUNCTION IF EXISTS is_admin();

-- Recreate with secure search_path
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt()->>'app_role') = 'admin',
    false
  );
$$;
