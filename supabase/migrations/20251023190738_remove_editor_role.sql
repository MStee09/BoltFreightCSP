/*
  # Remove Editor Role
  
  1. Changes
    - Remove all role_permissions entries for 'editor' role
    - Update any existing users with 'editor' role to 'basic'
  
  2. Notes
    - Editor role is being consolidated into Basic user role
    - Basic users now have create/edit capabilities
*/

-- Update any users with editor role to basic
UPDATE user_profiles 
SET role = 'basic' 
WHERE role = 'editor';

-- Remove all editor role permissions
DELETE FROM role_permissions 
WHERE role = 'editor';
