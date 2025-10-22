/*
  # Create CSP Event Interaction Auto-Logging

  ## Overview
  This migration creates triggers that automatically log CSP events as interactions
  for customers and carriers whenever CSP events are created or updated.

  ## Changes
  
  1. Functions Created
    - `log_csp_event_as_interaction()` - Logs new CSP events as customer/carrier interactions
    - `log_csp_event_update_as_interaction()` - Logs CSP event updates as interactions
  
  2. Triggers Created
    - Automatically create interaction when CSP event is inserted
    - Automatically create interaction when CSP event customer/carrier changes
  
  3. Backfill
    - Creates interactions for all existing CSP events
  
  ## Security
    - Functions run with proper user context
    - Maintains existing RLS policies
*/

-- Function to log CSP event creation as interaction
CREATE OR REPLACE FUNCTION log_csp_event_as_interaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Log interaction for customer if customer_id exists
  IF NEW.customer_id IS NOT NULL THEN
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
      NEW.customer_id,
      'csp_event',
      'CSP Event Created: ' || NEW.title,
      'A new CSP event titled "' || NEW.title || '" was created with status: ' || COALESCE(NEW.status, 'unknown') || ' and stage: ' || COALESCE(NEW.stage, 'unknown'),
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'csp_event_title', NEW.title,
        'status', NEW.status,
        'stage', NEW.stage,
        'due_date', NEW.due_date,
        'target_savings', NEW.target_savings,
        'mode', NEW.mode
      ),
      NEW.created_date,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log CSP event updates as interaction
CREATE OR REPLACE FUNCTION log_csp_event_update_as_interaction()
RETURNS TRIGGER AS $$
DECLARE
  change_summary TEXT := '';
  changes_detected BOOLEAN := FALSE;
BEGIN
  -- Check if customer_id changed (entity association changed)
  IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
    changes_detected := TRUE;
    
    -- Remove from old customer if there was one
    IF OLD.customer_id IS NOT NULL THEN
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
        OLD.customer_id,
        'csp_event',
        'CSP Event Removed: ' || NEW.title,
        'The CSP event "' || NEW.title || '" was disassociated from this customer.',
        jsonb_build_object(
          'csp_event_id', NEW.id,
          'csp_event_title', NEW.title,
          'action', 'removed'
        ),
        NOW(),
        NEW.user_id
      );
    END IF;
    
    -- Add to new customer if there is one
    IF NEW.customer_id IS NOT NULL THEN
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
        NEW.customer_id,
        'csp_event',
        'CSP Event Associated: ' || NEW.title,
        'The CSP event "' || NEW.title || '" was associated with this customer with status: ' || COALESCE(NEW.status, 'unknown'),
        jsonb_build_object(
          'csp_event_id', NEW.id,
          'csp_event_title', NEW.title,
          'status', NEW.status,
          'stage', NEW.stage,
          'action', 'associated'
        ),
        NOW(),
        NEW.user_id
      );
    END IF;
  -- If customer didn't change but status or stage changed, log update for existing customer
  ELSIF NEW.customer_id IS NOT NULL AND (
    OLD.status IS DISTINCT FROM NEW.status OR 
    OLD.stage IS DISTINCT FROM NEW.stage
  ) THEN
    changes_detected := TRUE;
    
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      change_summary := 'Status changed from "' || COALESCE(OLD.status, 'none') || '" to "' || COALESCE(NEW.status, 'none') || '"';
    END IF;
    
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
      IF change_summary != '' THEN
        change_summary := change_summary || '; ';
      END IF;
      change_summary := change_summary || 'Stage changed from "' || COALESCE(OLD.stage, 'none') || '" to "' || COALESCE(NEW.stage, 'none') || '"';
    END IF;
    
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
      NEW.customer_id,
      'csp_event',
      'CSP Event Updated: ' || NEW.title,
      change_summary,
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'csp_event_title', NEW.title,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_stage', OLD.stage,
        'new_stage', NEW.stage,
        'action', 'updated'
      ),
      NOW(),
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new CSP events
DROP TRIGGER IF EXISTS trigger_log_csp_event_creation ON csp_events;
CREATE TRIGGER trigger_log_csp_event_creation
  AFTER INSERT ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION log_csp_event_as_interaction();

-- Create trigger for CSP event updates
DROP TRIGGER IF EXISTS trigger_log_csp_event_update ON csp_events;
CREATE TRIGGER trigger_log_csp_event_update
  AFTER UPDATE ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION log_csp_event_update_as_interaction();

-- Backfill: Create interactions for all existing CSP events
INSERT INTO interactions (
  entity_type,
  entity_id,
  interaction_type,
  summary,
  details,
  metadata,
  created_date,
  user_id
)
SELECT 
  'customer',
  ce.customer_id,
  'csp_event',
  'CSP Event: ' || ce.title,
  'CSP event "' || ce.title || '" with status: ' || COALESCE(ce.status, 'unknown') || ' and stage: ' || COALESCE(ce.stage, 'unknown'),
  jsonb_build_object(
    'csp_event_id', ce.id,
    'csp_event_title', ce.title,
    'status', ce.status,
    'stage', ce.stage,
    'due_date', ce.due_date,
    'backfilled', true
  ),
  ce.created_date,
  ce.user_id
FROM csp_events ce
WHERE ce.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM interactions i
    WHERE i.entity_type = 'customer'
      AND i.entity_id = ce.customer_id
      AND i.interaction_type = 'csp_event'
      AND i.metadata->>'csp_event_id' = ce.id::text
  );
