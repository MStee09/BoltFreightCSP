/*
  # Fix User Invitations Role Constraint

  1. Changes
    - Drop the existing check constraint on user_invitations.role
    - Add new constraint that includes all system roles: admin, elite, tariff_master, basic, viewer
    
  2. Notes
    - This aligns the invitation roles with the actual roles used in user_profiles
    - Ensures users can be invited with any valid system role
*/

ALTER TABLE user_invitations 
  DROP CONSTRAINT IF EXISTS user_invitations_role_check;

ALTER TABLE user_invitations
  ADD CONSTRAINT user_invitations_role_check 
  CHECK (role IN ('admin', 'elite', 'tariff_master', 'basic', 'viewer'));