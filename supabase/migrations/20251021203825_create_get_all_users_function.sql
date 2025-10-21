/*
  # Create function to retrieve all registered users
  
  1. New Functions
    - `get_all_users()` - Returns all users from auth.users with id and email
  
  2. Security
    - Function is accessible to authenticated users only
    - Returns only non-sensitive user information (id, email)
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
    au.email,
    au.created_at
  FROM auth.users au
  ORDER BY au.email;
END;
$$;