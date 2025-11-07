/*
  # Fix generate_invitation_token Function

  1. Issue
    - Function fails with "gen_random_bytes does not exist" error
    - The search_path was set to 'public, pg_temp' which doesn't include pgcrypto functions
  
  2. Solution
    - Use gen_random_uuid() instead which is built-in and doesn't require pgcrypto
    - Or update search_path to include extensions schema
    - Using gen_random_uuid() is simpler and more reliable
*/

-- Drop and recreate the function with gen_random_uuid() instead
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Use gen_random_uuid() which is always available, then encode as base64-like string
    new_token := encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64');
    new_token := replace(new_token, '/', '_');
    new_token := replace(new_token, '+', '-');
    new_token := replace(new_token, '=', '');
    
    SELECT EXISTS(SELECT 1 FROM user_invitations WHERE token = new_token) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$$;
