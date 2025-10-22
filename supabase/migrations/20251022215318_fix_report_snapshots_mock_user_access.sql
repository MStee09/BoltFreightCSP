/*
  # Fix Report Snapshots RLS for Mock Users

  1. Changes
    - Add permissive policy for mock user to create and read report snapshots
    - This allows the system to work during development/demo mode
  
  2. Security
    - Policy checks for mock user ID specifically
    - Allows both authenticated users and mock user access
*/

-- Drop existing policies if they exist and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Mock user can insert report_snapshots" ON report_snapshots;
  DROP POLICY IF EXISTS "Mock user can view report_snapshots" ON report_snapshots;
  DROP POLICY IF EXISTS "Mock user can update report_snapshots" ON report_snapshots;
  DROP POLICY IF EXISTS "Mock user can delete report_snapshots" ON report_snapshots;
END $$;

-- Add policy to allow mock user to insert snapshots
CREATE POLICY "Mock user can insert report_snapshots"
  ON report_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

-- Add policy to allow mock user to view snapshots
CREATE POLICY "Mock user can view report_snapshots"
  ON report_snapshots FOR SELECT
  TO authenticated
  USING (user_id = '00000000-0000-0000-0000-000000000000');

-- Add policy to allow mock user to update snapshots
CREATE POLICY "Mock user can update report_snapshots"
  ON report_snapshots FOR UPDATE
  TO authenticated
  USING (user_id = '00000000-0000-0000-0000-000000000000')
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

-- Add policy to allow mock user to delete snapshots
CREATE POLICY "Mock user can delete report_snapshots"
  ON report_snapshots FOR DELETE
  TO authenticated
  USING (user_id = '00000000-0000-0000-0000-000000000000');