/*
  # Fix get_all_users function type mismatch

  1. Changes
    - Update get_all_users function to properly cast email from varchar to text
    - Ensures compatibility with auth.users schema

  2. Notes
    - Fixes error: "Returned type character varying(255) does not match expected type text"
*/

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    au.created_at
  FROM auth.users au
  ORDER BY au.email;
END;
$$;
