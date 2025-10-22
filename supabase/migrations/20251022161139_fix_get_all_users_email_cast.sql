/*
  # Fix get_all_users function email type

  1. Changes
    - Drop and recreate get_all_users function with proper email casting
    - Ensures email column is returned as text, not varchar(255)

  2. Notes
    - Fixes error: "Returned type character varying(255) does not match expected type text"
*/

DROP FUNCTION IF EXISTS get_all_users();

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE sql
AS $$
  SELECT
    au.id,
    au.email::text,
    au.created_at
  FROM auth.users au
  ORDER BY au.email;
$$;

GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
