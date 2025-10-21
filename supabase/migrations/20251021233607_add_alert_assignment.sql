/*
  # Add Alert Assignment and Recommended Action

  1. Changes
    - Add `assigned_to` column to alerts table to track who owns the alert
    - Add `recommended_action` column if it doesn't exist already
  
  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE alerts ADD COLUMN assigned_to uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'recommended_action'
  ) THEN
    ALTER TABLE alerts ADD COLUMN recommended_action text;
  END IF;
END $$;
