/*
  # Create CSP Event Assignment Notification Trigger

  1. Function
    - Creates a notification when a CSP event is assigned to a user
    - Triggers on INSERT or UPDATE of csp_events table
    - Only creates notification if assigned_to has changed
    - Includes link to the CSP event detail page

  2. Trigger
    - Fires after INSERT or UPDATE on csp_events
    - Calls the notification creation function
*/

CREATE OR REPLACE FUNCTION notify_csp_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assigned_to has changed and is not null
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT NULL AND 
      (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to)) THEN
    
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      NEW.assigned_to,
      'csp_assignment',
      'New CSP Event Assigned',
      'You have been assigned to CSP event: ' || COALESCE(NEW.name, 'Untitled Event'),
      '/pipeline?event=' || NEW.id::text,
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'csp_event_name', NEW.name,
        'customer_id', NEW.customer_id,
        'stage', NEW.stage
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_csp_assignment ON csp_events;

CREATE TRIGGER trigger_notify_csp_assignment
  AFTER INSERT OR UPDATE ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_csp_assignment();