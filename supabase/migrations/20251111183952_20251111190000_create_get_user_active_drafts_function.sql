/*
  # Create get_user_active_drafts function

  1. New Functions
    - `get_user_active_drafts()` - Returns active email drafts for the current user
    
  2. Purpose
    - Fetch email drafts that are in 'draft' status and not deleted
    - Used by the email composer to restore unsent drafts
    - Filters by current authenticated user
    
  3. Security
    - Function uses SECURITY DEFINER to access drafts
    - Checks auth.uid() to ensure users only see their own drafts
*/

-- Create function to get user's active drafts
CREATE OR REPLACE FUNCTION get_user_active_drafts()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  entity_type text,
  entity_id uuid,
  to_addresses text[],
  cc_addresses text[],
  subject text,
  body text,
  tracking_code text,
  draft_data jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Return active drafts for the current user
  RETURN QUERY
  SELECT
    ed.id,
    ed.user_id,
    ed.entity_type,
    ed.entity_id,
    ed.to_addresses,
    ed.cc_addresses,
    ed.subject,
    ed.body,
    ed.tracking_code,
    ed.draft_data,
    ed.created_at,
    ed.updated_at
  FROM email_drafts ed
  WHERE ed.user_id = auth.uid()
    AND ed.status = 'draft'
  ORDER BY ed.updated_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_active_drafts() TO authenticated;
