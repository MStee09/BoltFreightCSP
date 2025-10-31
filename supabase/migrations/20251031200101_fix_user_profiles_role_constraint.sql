/*
  # Fix User Profiles Role Constraint

  1. Changes
    - Drop the existing check constraint on user_profiles.role
    - Add new constraint that includes all system roles: admin, elite, tariff_master, basic, viewer
    
  2. Notes
    - This aligns the user_profiles roles with the roles used throughout the system
    - Allows users to be assigned any valid role when their profile is created
*/

ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('admin', 'elite', 'tariff_master', 'basic', 'viewer'));