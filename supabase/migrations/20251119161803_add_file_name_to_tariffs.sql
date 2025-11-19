/*
  # Add file_name column to tariffs table

  1. Changes
    - Add `file_name` column to store the display name of uploaded documents
    - Default to empty string for consistency with other text fields
  
  2. Purpose
    - Allow users to rename documents for better organization
    - Separate storage path (file_url) from display name (file_name)
*/

-- Add file_name column to tariffs table
ALTER TABLE tariffs 
ADD COLUMN IF NOT EXISTS file_name text DEFAULT '';
