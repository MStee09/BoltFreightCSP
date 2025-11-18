/*
  # Fix Calendar Event Activity Trigger Field Names

  1. Changes
    - Update log_calendar_event_activity function to use correct column name:
      - start_time → event_date
    - Format event_date properly as it's a date field, not timestamp
  
  2. Notes
    - This fixes the "record 'new' has no field 'start_time'" error
*/

CREATE OR REPLACE FUNCTION log_calendar_event_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id_val uuid;
  activity_type TEXT;
  activity_summary TEXT;
  activity_details TEXT;
BEGIN
  user_id_val := auth.uid();

  IF TG_OP = 'INSERT' THEN
    activity_type := 'calendar';
    activity_summary := 'Calendar Event Created: ' || NEW.title;
    activity_details := 'Event scheduled for ' || TO_CHAR(NEW.event_date, 'Mon DD, YYYY');
  ELSIF TG_OP = 'UPDATE' THEN
    activity_type := 'calendar';
    activity_summary := 'Calendar Event Updated: ' || NEW.title;
    activity_details := 'Event "' || NEW.title || '" was updated';
  ELSIF TG_OP = 'DELETE' THEN
    activity_type := 'calendar';
    activity_summary := 'Calendar Event Deleted: ' || OLD.title;
    activity_details := 'Event "' || OLD.title || '" was deleted';
  END IF;

  -- Log to customer timeline
  IF (TG_OP = 'DELETE' AND OLD.customer_id IS NOT NULL) OR (TG_OP IN ('INSERT', 'UPDATE') AND NEW.customer_id IS NOT NULL) THEN
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'customer',
      COALESCE(NEW.customer_id, OLD.customer_id),
      activity_type,
      activity_summary,
      activity_details,
      jsonb_build_object(
        'calendar_event_id', COALESCE(NEW.id, OLD.id),
        'event_type', COALESCE(NEW.event_type, OLD.event_type),
        'customer_id', COALESCE(NEW.customer_id, OLD.customer_id),
        'operation', TG_OP
      ),
      NOW(),
      user_id_val
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;
