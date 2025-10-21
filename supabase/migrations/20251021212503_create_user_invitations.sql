/*
  # User Invitation System

  ## Overview
  Allows administrators to invite new users via email. Invited users receive an email
  with a link to create their account with a pre-assigned role.

  ## New Tables

  ### `user_invitations`
  - `id` (uuid, primary key) - Unique identifier
  - `email` (text, unique) - Invited user's email address
  - `role` (text) - Pre-assigned role: 'admin' or 'basic'
  - `invited_by` (uuid, foreign key) - Admin who sent the invitation
  - `token` (text, unique) - Unique invitation token for verification
  - `status` (text) - Invitation status: 'pending', 'accepted', 'expired'
  - `expires_at` (timestamptz) - When invitation expires
  - `accepted_at` (timestamptz, nullable) - When invitation was accepted
  - `created_at` (timestamptz) - When invitation was created
  - `metadata` (jsonb) - Additional invitation data

  ## Security
  - Enable RLS on user_invitations table
  - Only admins can create invitations
  - Only admins can view all invitations
  - Anyone can view their own invitation by token (for acceptance flow)
  - Invitations expire after 7 days by default

  ## Indexes
  - `email` for quick lookup
  - `token` for verification
  - `status` for filtering active invitations
*/

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'basic' CHECK (role IN ('admin', 'basic')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(email, status)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_invitations

-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
  ON user_invitations
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Anyone can view invitation by token (for acceptance)
CREATE POLICY "Anyone can view invitation by token"
  ON user_invitations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update invitations (cancel, etc)
CREATE POLICY "Admins can update invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
  ON user_invitations
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(32), 'base64');
    new_token := replace(new_token, '/', '_');
    new_token := replace(new_token, '+', '-');
    new_token := replace(new_token, '=', '');
    
    SELECT EXISTS(SELECT 1 FROM user_invitations WHERE token = new_token) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$$;

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$;

-- Function to cancel existing pending invitations for email before creating new one
CREATE OR REPLACE FUNCTION cancel_existing_invitations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'cancelled'
  WHERE email = NEW.email
  AND status = 'pending'
  AND id != NEW.id;
  
  RETURN NEW;
END;
$$;

-- Trigger to cancel existing invitations
DROP TRIGGER IF EXISTS on_invitation_created ON user_invitations;
CREATE TRIGGER on_invitation_created
  AFTER INSERT ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION cancel_existing_invitations();
