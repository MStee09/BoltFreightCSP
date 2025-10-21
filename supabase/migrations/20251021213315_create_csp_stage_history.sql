/*
  # CSP Event Stage History Tracking

  ## Overview
  Tracks all stage changes for CSP events to enable user performance analytics
  and reporting on how deals progress through the pipeline.

  ## New Tables

  ### `csp_stage_history`
  - `id` (uuid, primary key) - Unique identifier
  - `csp_event_id` (uuid, foreign key) - References csp_events
  - `customer_id` (uuid, foreign key) - References customers
  - `previous_stage` (text) - Stage before change (null for new events)
  - `new_stage` (text) - Stage after change
  - `changed_by` (uuid, foreign key) - User who made the change
  - `changed_at` (timestamptz) - When the change occurred
  - `days_in_previous_stage` (integer) - Time spent in previous stage
  - `notes` (text) - Optional notes about the change
  - `metadata` (jsonb) - Additional context

  ## Security
  - Enable RLS on csp_stage_history table
  - All authenticated users can view history
  - Only event owners can create history entries
  - History is immutable (no updates or deletes)

  ## Indexes
  - `csp_event_id` for event lookup
  - `changed_by` for user analytics
  - `changed_at` for time-based queries
  - `new_stage` for stage-based filtering
*/

-- Create csp_stage_history table
CREATE TABLE IF NOT EXISTS csp_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  csp_event_id uuid NOT NULL REFERENCES csp_events(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  previous_stage text,
  new_stage text NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  days_in_previous_stage integer DEFAULT 0,
  notes text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_event ON csp_stage_history(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_customer ON csp_stage_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_user ON csp_stage_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_date ON csp_stage_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_csp_stage_history_stage ON csp_stage_history(new_stage);

-- Enable RLS
ALTER TABLE csp_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for csp_stage_history

-- All users can view stage history
CREATE POLICY "Users can view stage history"
  ON csp_stage_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Only event owners can create history entries
CREATE POLICY "Users can create stage history"
  ON csp_stage_history
  FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- No updates or deletes (history is immutable)

-- Function to automatically track stage changes
CREATE OR REPLACE FUNCTION track_csp_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  previous_stage_value text;
  days_in_stage integer;
  last_change_date timestamptz;
BEGIN
  -- Only track if stage actually changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    previous_stage_value := OLD.stage;
    
    -- Calculate days in previous stage
    SELECT changed_at INTO last_change_date
    FROM csp_stage_history
    WHERE csp_event_id = NEW.id
    ORDER BY changed_at DESC
    LIMIT 1;
    
    IF last_change_date IS NOT NULL THEN
      days_in_stage := EXTRACT(DAY FROM (now() - last_change_date));
    ELSE
      days_in_stage := EXTRACT(DAY FROM (now() - OLD.created_date));
    END IF;
    
    -- Insert stage history record
    INSERT INTO csp_stage_history (
      csp_event_id,
      customer_id,
      previous_stage,
      new_stage,
      changed_by,
      changed_at,
      days_in_previous_stage
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      previous_stage_value,
      NEW.stage,
      auth.uid(),
      now(),
      COALESCE(days_in_stage, 0)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to track stage changes on csp_events
DROP TRIGGER IF EXISTS on_csp_stage_change ON csp_events;
CREATE TRIGGER on_csp_stage_change
  AFTER UPDATE ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION track_csp_stage_change();

-- Function to track initial stage when event is created
CREATE OR REPLACE FUNCTION track_initial_csp_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO csp_stage_history (
    csp_event_id,
    customer_id,
    previous_stage,
    new_stage,
    changed_by,
    changed_at,
    days_in_previous_stage
  ) VALUES (
    NEW.id,
    NEW.customer_id,
    NULL,
    NEW.stage,
    auth.uid(),
    now(),
    0
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to track initial stage
DROP TRIGGER IF EXISTS on_csp_event_created ON csp_events;
CREATE TRIGGER on_csp_event_created
  AFTER INSERT ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION track_initial_csp_stage();
