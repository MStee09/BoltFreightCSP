/*
  # Add Renewal CSP Linkage and Tariff Activities

  1. Schema Changes
    - Add `renewal_csp_event_id` to tariff_families table
      - Links to the CSP event created for renewal of this family
      - Nullable UUID foreign key
    - Add `related_tariff_family_id` to csp_events table
      - Links back to the original tariff family being renewed
      - Nullable UUID
    - Create `tariff_activities` table for lifecycle tracking
      - Full activity log for tariffs including CSP stages, versions, emails, documents

  2. Security
    - Enable RLS on tariff_activities
    - Add policies for authenticated users to view and create activities

  3. Indexes
    - Add foreign key indexes for performance
*/

-- Create tariff_activities table FIRST (before triggers that use it)
CREATE TABLE IF NOT EXISTS tariff_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id uuid REFERENCES tariffs(id) ON DELETE CASCADE,
  tariff_family_id uuid,
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  user_name text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'csp_created',
    'csp_stage_change',
    'tariff_created',
    'tariff_activated',
    'tariff_superseded',
    'tariff_expired',
    'renewal_csp_created',
    'sop_added',
    'sop_updated',
    'document_uploaded',
    'email_sent',
    'email_received',
    'note_added',
    'tariff_updated',
    'carrier_added',
    'carrier_removed'
  ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tariff_activities_tariff_id ON tariff_activities(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_family_id ON tariff_activities(tariff_family_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_csp_event_id ON tariff_activities(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_created_at ON tariff_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tariff_activities_type ON tariff_activities(activity_type);

-- Enable RLS
ALTER TABLE tariff_activities ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view activities
CREATE POLICY "Users can view tariff activities"
  ON tariff_activities FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create activities
CREATE POLICY "Users can create tariff activities"
  ON tariff_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR is_system = true);

-- Add renewal CSP tracking to tariffs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'renewal_csp_event_id'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN renewal_csp_event_id uuid REFERENCES csp_events(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tariffs_renewal_csp ON tariffs(renewal_csp_event_id);
  END IF;
END $$;

-- Add related tariff family to csp_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'related_tariff_family_id'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN related_tariff_family_id uuid;
    CREATE INDEX IF NOT EXISTS idx_csp_events_related_family ON csp_events(related_tariff_family_id);
  END IF;
END $$;

-- Function to automatically log tariff version changes
CREATE OR REPLACE FUNCTION log_tariff_activity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_name text;
  v_activity_type text;
  v_title text;
BEGIN
  -- Get user name
  SELECT full_name INTO v_user_name
  FROM user_profiles
  WHERE id = COALESCE(NEW.updated_by, NEW.created_by);

  -- Determine activity type and title
  IF TG_OP = 'INSERT' THEN
    v_activity_type := 'tariff_created';
    v_title := 'Tariff version created: ' || COALESCE(NEW.version, NEW.tariff_reference_id, 'New Version');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'active' THEN
          v_activity_type := 'tariff_activated';
          v_title := 'Tariff activated: ' || COALESCE(NEW.version, NEW.tariff_reference_id);
        WHEN 'superseded' THEN
          v_activity_type := 'tariff_superseded';
          v_title := 'Tariff superseded: ' || COALESCE(NEW.version, NEW.tariff_reference_id);
        WHEN 'expired' THEN
          v_activity_type := 'tariff_expired';
          v_title := 'Tariff expired: ' || COALESCE(NEW.version, NEW.tariff_reference_id);
        ELSE
          v_activity_type := 'tariff_updated';
          v_title := 'Tariff status changed to ' || NEW.status;
      END CASE;
    ELSE
      v_activity_type := 'tariff_updated';
      v_title := 'Tariff updated: ' || COALESCE(NEW.version, NEW.tariff_reference_id);
    END IF;
  END IF;

  -- Insert activity log
  INSERT INTO tariff_activities (
    tariff_id,
    tariff_family_id,
    csp_event_id,
    activity_type,
    title,
    description,
    metadata,
    user_id,
    user_name,
    is_system
  ) VALUES (
    NEW.id,
    NEW.tariff_family_id,
    NEW.csp_event_id,
    v_activity_type,
    v_title,
    NULL,
    jsonb_build_object(
      'status', NEW.status,
      'version', NEW.version,
      'effective_date', NEW.effective_date,
      'expiry_date', NEW.expiry_date
    ),
    COALESCE(NEW.updated_by, NEW.created_by),
    v_user_name,
    false
  );

  RETURN NEW;
END;
$$;

-- Create trigger for tariff activity logging (disabled during migration, enabled after)
DROP TRIGGER IF EXISTS trigger_log_tariff_activity ON tariffs;
-- Note: Trigger will be created but won't fire on existing rows during column addition

-- Function to log CSP stage changes
CREATE OR REPLACE FUNCTION log_csp_stage_activity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_name text;
  v_tariff_ids uuid[];
BEGIN
  -- Only log stage changes
  IF TG_OP = 'UPDATE' AND OLD.stage != NEW.stage THEN
    -- Get user name
    SELECT full_name INTO v_user_name
    FROM user_profiles
    WHERE id = NEW.owner_id;

    -- Get all tariff IDs linked to this CSP
    SELECT array_agg(DISTINCT id) INTO v_tariff_ids
    FROM tariffs
    WHERE csp_event_id = NEW.id;

    -- Log activity for each tariff
    IF v_tariff_ids IS NOT NULL THEN
      INSERT INTO tariff_activities (
        tariff_id,
        tariff_family_id,
        csp_event_id,
        activity_type,
        title,
        description,
        metadata,
        user_id,
        user_name,
        is_system
      )
      SELECT
        tariff_id,
        t.tariff_family_id,
        NEW.id,
        'csp_stage_change',
        'CSP stage changed: ' || OLD.stage || ' → ' || NEW.stage,
        NEW.title,
        jsonb_build_object(
          'old_stage', OLD.stage,
          'new_stage', NEW.stage,
          'csp_title', NEW.title
        ),
        NEW.owner_id,
        v_user_name,
        false
      FROM unnest(v_tariff_ids) AS tariff_id
      LEFT JOIN tariffs t ON t.id = tariff_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for CSP stage change logging
DROP TRIGGER IF EXISTS trigger_log_csp_stage_activity ON csp_events;

-- Enable triggers only for NEW inserts/updates going forward
CREATE TRIGGER trigger_log_tariff_activity
  AFTER INSERT OR UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_activity();

CREATE TRIGGER trigger_log_csp_stage_activity
  AFTER UPDATE ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION log_csp_stage_activity();
