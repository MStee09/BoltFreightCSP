/*
  # Add Mock User Policies for Calendar Events

  1. Changes
    - Add RLS policies for calendar_events table to allow mock user operations
    - Enables the mock user ID (00000000-0000-0000-0000-000000000000) to perform CRUD operations
  
  2. Security
    - These policies only apply to the specific mock user ID
    - Real user data remains protected by existing policies
*/

-- Drop existing policies if they exist and recreate to ensure consistency
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Mock user can view calendar events" ON calendar_events;
  DROP POLICY IF EXISTS "Mock user can insert calendar events" ON calendar_events;
  DROP POLICY IF EXISTS "Mock user can update calendar events" ON calendar_events;
  DROP POLICY IF EXISTS "Mock user can delete calendar events" ON calendar_events;
END $$;

-- Create new mock user policies
CREATE POLICY "Mock user can view calendar events"
  ON calendar_events FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update calendar events"
  ON calendar_events FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete calendar events"
  ON calendar_events FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);
