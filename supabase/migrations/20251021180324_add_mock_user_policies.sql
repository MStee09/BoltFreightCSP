/*
  # Add Mock User Policies

  1. Changes
    - Add policies for mock user ID to bypass RLS checks
    - Allow full CRUD operations for mock data testing
    - Mock user ID: 00000000-0000-0000-0000-000000000000
  
  2. Security
    - These policies only apply to the specific mock user ID
    - Real user data remains protected by existing policies
*/

CREATE POLICY "Mock user can view customers"
  ON customers FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert customers"
  ON customers FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update customers"
  ON customers FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete customers"
  ON customers FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view carriers"
  ON carriers FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert carriers"
  ON carriers FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update carriers"
  ON carriers FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete carriers"
  ON carriers FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view tariffs"
  ON tariffs FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert tariffs"
  ON tariffs FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update tariffs"
  ON tariffs FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete tariffs"
  ON tariffs FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view csp_events"
  ON csp_events FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert csp_events"
  ON csp_events FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update csp_events"
  ON csp_events FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete csp_events"
  ON csp_events FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view tasks"
  ON tasks FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update tasks"
  ON tasks FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete tasks"
  ON tasks FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view alerts"
  ON alerts FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert alerts"
  ON alerts FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can update alerts"
  ON alerts FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete alerts"
  ON alerts FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view interactions"
  ON interactions FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert interactions"
  ON interactions FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete interactions"
  ON interactions FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can view shipments"
  ON shipments FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can insert shipments"
  ON shipments FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Mock user can delete shipments"
  ON shipments FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);
