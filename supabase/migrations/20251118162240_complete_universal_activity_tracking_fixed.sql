/*
  # Complete Universal Activity Tracking System
  
  ## Overview
  This migration ensures EVERY user action is tracked with proper attribution and entity linkage.
  All activities flow into the central `interactions` table for unified reporting.
  
  ## What Gets Tracked
  1. Customer changes → customer timeline
  2. Carrier changes → carrier timeline
  3. CSP Event changes → customer + carrier timelines
  4. Tariff deletions → customer + carrier timelines
  5. Document deletions → entity timeline
  6. Calendar events (create/update/delete) → customer timeline
  7. Manual notes → entity timeline (ensured user_id)
  
  ## Key Principles
  - Every activity has user_id attribution (who did it)
  - Every activity links to entity (customer_id, carrier_id, csp_event_id, or tariff_id)
  - All activities stored in interactions table
  - Metadata stored as jsonb for flexibility
  
  ## Security
  - All functions use SECURITY DEFINER with explicit search_path
  - User ID captured from auth.uid()
*/

-- ========================================
-- 1. CUSTOMER FIELD CHANGE TRACKING
-- ========================================

CREATE OR REPLACE FUNCTION log_customer_field_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  change_details TEXT[];
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  change_details := ARRAY[]::TEXT[];

  IF OLD.name IS DISTINCT FROM NEW.name THEN
    change_details := array_append(change_details, 'Name: "' || COALESCE(OLD.name, '') || '" → "' || COALESCE(NEW.name, '') || '"');
  END IF;

  IF OLD.segment IS DISTINCT FROM NEW.segment THEN
    change_details := array_append(change_details, 'Segment: "' || COALESCE(OLD.segment, '') || '" → "' || COALESCE(NEW.segment, '') || '"');
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    change_details := array_append(change_details, 'Status: "' || COALESCE(OLD.status, '') || '" → "' || COALESCE(NEW.status, '') || '"');
  END IF;

  IF OLD.contact_name IS DISTINCT FROM NEW.contact_name OR
     OLD.contact_email IS DISTINCT FROM NEW.contact_email OR
     OLD.contact_phone IS DISTINCT FROM NEW.contact_phone THEN
    change_details := array_append(change_details, 'Contact information updated');
  END IF;

  IF OLD.annual_spend IS DISTINCT FROM NEW.annual_spend THEN
    change_details := array_append(change_details, 'Annual spend: $' || COALESCE(OLD.annual_spend::TEXT, '0') || ' → $' || COALESCE(NEW.annual_spend::TEXT, '0'));
  END IF;

  IF OLD.monthly_shipments IS DISTINCT FROM NEW.monthly_shipments THEN
    change_details := array_append(change_details, 'Monthly shipments: ' || COALESCE(OLD.monthly_shipments::TEXT, '0') || ' → ' || COALESCE(NEW.monthly_shipments::TEXT, '0'));
  END IF;

  IF array_length(change_details, 1) > 0 THEN
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
      NEW.id,
      'update',
      'Customer Updated',
      array_to_string(change_details, ' • '),
      jsonb_build_object(
        'changes', change_details,
        'updated_by', user_id_val,
        'customer_id', NEW.id
      ),
      NOW(),
      user_id_val
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_customer_changes ON customers;
CREATE TRIGGER trigger_log_customer_changes
  AFTER UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_customer_field_changes();

-- ========================================
-- 2. CARRIER FIELD CHANGE TRACKING
-- ========================================

CREATE OR REPLACE FUNCTION log_carrier_field_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  change_details TEXT[];
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  change_details := ARRAY[]::TEXT[];

  IF OLD.name IS DISTINCT FROM NEW.name THEN
    change_details := array_append(change_details, 'Name: "' || COALESCE(OLD.name, '') || '" → "' || COALESCE(NEW.name, '') || '"');
  END IF;

  IF OLD.scac_code IS DISTINCT FROM NEW.scac_code THEN
    change_details := array_append(change_details, 'SCAC: "' || COALESCE(OLD.scac_code, '') || '" → "' || COALESCE(NEW.scac_code, '') || '"');
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    change_details := array_append(change_details, 'Status: "' || COALESCE(OLD.status, '') || '" → "' || COALESCE(NEW.status, '') || '"');
  END IF;

  IF OLD.service_type IS DISTINCT FROM NEW.service_type THEN
    change_details := array_append(change_details, 'Service Type: "' || COALESCE(OLD.service_type, '') || '" → "' || COALESCE(NEW.service_type, '') || '"');
  END IF;

  IF OLD.carrier_rep_name IS DISTINCT FROM NEW.carrier_rep_name OR
     OLD.carrier_rep_email IS DISTINCT FROM NEW.carrier_rep_email OR
     OLD.carrier_rep_phone IS DISTINCT FROM NEW.carrier_rep_phone THEN
    change_details := array_append(change_details, 'Carrier representative updated');
  END IF;

  IF OLD.on_time_percentage IS DISTINCT FROM NEW.on_time_percentage THEN
    change_details := array_append(change_details, 'On-time: ' || COALESCE(OLD.on_time_percentage::TEXT, '0') || '% → ' || COALESCE(NEW.on_time_percentage::TEXT, '0') || '%');
  END IF;

  IF array_length(change_details, 1) > 0 THEN
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
      'carrier',
      NEW.id,
      'update',
      'Carrier Updated',
      array_to_string(change_details, ' • '),
      jsonb_build_object(
        'changes', change_details,
        'updated_by', user_id_val,
        'carrier_id', NEW.id
      ),
      NOW(),
      user_id_val
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_carrier_changes ON carriers;
CREATE TRIGGER trigger_log_carrier_changes
  AFTER UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION log_carrier_field_changes();

-- ========================================
-- 3. CSP EVENT FIELD CHANGE TRACKING
-- ========================================

CREATE OR REPLACE FUNCTION log_csp_event_field_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  change_details TEXT[];
  user_id_val uuid;
  customer_name TEXT;
BEGIN
  user_id_val := auth.uid();
  change_details := ARRAY[]::TEXT[];

  IF NEW.customer_id IS NOT NULL THEN
    SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
  END IF;

  IF OLD.title IS DISTINCT FROM NEW.title THEN
    change_details := array_append(change_details, 'Title: "' || COALESCE(OLD.title, '') || '" → "' || COALESCE(NEW.title, '') || '"');
  END IF;

  IF OLD.mode IS DISTINCT FROM NEW.mode THEN
    change_details := array_append(change_details, 'Mode: "' || COALESCE(OLD.mode, '') || '" → "' || COALESCE(NEW.mode, '') || '"');
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    change_details := array_append(change_details, 'Assigned to: "' || COALESCE(OLD.assigned_to, 'none') || '" → "' || COALESCE(NEW.assigned_to, 'none') || '"');
  END IF;

  IF OLD.ownership_type IS DISTINCT FROM NEW.ownership_type THEN
    change_details := array_append(change_details, 'Ownership: "' || COALESCE(OLD.ownership_type, '') || '" → "' || COALESCE(NEW.ownership_type, '') || '"');
  END IF;

  IF array_length(change_details, 1) > 0 AND NEW.customer_id IS NOT NULL THEN
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
      array_to_string(change_details, ' • '),
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'customer_id', NEW.customer_id,
        'changes', change_details
      ),
      NOW(),
      user_id_val
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_csp_event_field_changes ON csp_events;
CREATE TRIGGER trigger_log_csp_event_field_changes
  AFTER UPDATE ON csp_events
  FOR EACH ROW
  WHEN (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.mode IS DISTINCT FROM NEW.mode OR
    OLD.assigned_to IS DISTINCT FROM NEW.assigned_to OR
    OLD.ownership_type IS DISTINCT FROM NEW.ownership_type
  )
  EXECUTE FUNCTION log_csp_event_field_changes();

-- ========================================
-- 4. TARIFF DELETION TRACKING
-- ========================================

CREATE OR REPLACE FUNCTION log_tariff_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_id_val uuid;
  customer_name TEXT;
  carrier_name TEXT;
BEGIN
  user_id_val := auth.uid();

  SELECT name INTO customer_name FROM customers WHERE id = OLD.customer_id;
  SELECT name INTO carrier_name FROM carriers WHERE id = OLD.carrier_id;

  -- Log to customer timeline
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
      'tariff',
      'Tariff Deleted: ' || COALESCE(OLD.tariff_reference_id, 'Unknown'),
      'Tariff ' || COALESCE(OLD.tariff_reference_id, 'Unknown') || ' with ' || COALESCE(carrier_name, 'carrier') || ' was deleted',
      jsonb_build_object(
        'tariff_id', OLD.id,
        'tariff_reference_id', OLD.tariff_reference_id,
        'carrier_id', OLD.carrier_id,
        'customer_id', OLD.customer_id,
        'deleted_by', user_id_val
      ),
      NOW(),
      user_id_val
    );
  END IF;

  -- Log to carrier timeline
  IF OLD.carrier_id IS NOT NULL THEN
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
      'carrier',
      OLD.carrier_id,
      'tariff',
      'Tariff Deleted: ' || COALESCE(OLD.tariff_reference_id, 'Unknown'),
      'Tariff ' || COALESCE(OLD.tariff_reference_id, 'Unknown') || ' for ' || COALESCE(customer_name, 'customer') || ' was deleted',
      jsonb_build_object(
        'tariff_id', OLD.id,
        'tariff_reference_id', OLD.tariff_reference_id,
        'carrier_id', OLD.carrier_id,
        'customer_id', OLD.customer_id,
        'deleted_by', user_id_val
      ),
      NOW(),
      user_id_val
    );
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_tariff_deletion ON tariffs;
CREATE TRIGGER trigger_log_tariff_deletion
  BEFORE DELETE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_deletion();

-- ========================================
-- 5. DOCUMENT DELETION TRACKING
-- ========================================

CREATE OR REPLACE FUNCTION log_document_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();

  -- Log to customer timeline
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
      'document',
      'Document Deleted: ' || OLD.name,
      'Document "' || OLD.name || '" was deleted',
      jsonb_build_object(
        'document_id', OLD.id,
        'document_name', OLD.name,
        'document_type', OLD.doc_type,
        'customer_id', OLD.customer_id,
        'deleted_by', user_id_val
      ),
      NOW(),
      user_id_val
    );
  END IF;

  -- Log to carrier timeline
  IF OLD.carrier_id IS NOT NULL THEN
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
      'carrier',
      OLD.carrier_id,
      'document',
      'Document Deleted: ' || OLD.name,
      'Document "' || OLD.name || '" was deleted',
      jsonb_build_object(
        'document_id', OLD.id,
        'document_name', OLD.name,
        'document_type', OLD.doc_type,
        'carrier_id', OLD.carrier_id,
        'deleted_by', user_id_val
      ),
      NOW(),
      user_id_val
    );
  END IF;

  -- Log to CSP event timeline (via customer)
  IF OLD.csp_event_id IS NOT NULL THEN
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
      'document',
      'Document Deleted: ' || OLD.name,
      'Document "' || OLD.name || '" was deleted from CSP: ' || ce.title,
      jsonb_build_object(
        'document_id', OLD.id,
        'document_name', OLD.name,
        'csp_event_id', OLD.csp_event_id,
        'deleted_by', user_id_val
      ),
      NOW(),
      user_id_val
    FROM csp_events ce
    WHERE ce.id = OLD.csp_event_id AND ce.customer_id IS NOT NULL;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_document_deletion ON documents;
CREATE TRIGGER trigger_log_document_deletion
  BEFORE DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_deletion();

-- ========================================
-- 6. CALENDAR EVENT TRACKING
-- ========================================

CREATE OR REPLACE FUNCTION log_calendar_event_activity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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
    activity_details := 'Event scheduled for ' || TO_CHAR(NEW.start_time, 'Mon DD, YYYY at HH:MI AM');
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

DROP TRIGGER IF EXISTS trigger_log_calendar_create ON calendar_events;
CREATE TRIGGER trigger_log_calendar_create
  AFTER INSERT ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION log_calendar_event_activity();

DROP TRIGGER IF EXISTS trigger_log_calendar_update ON calendar_events;
CREATE TRIGGER trigger_log_calendar_update
  AFTER UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION log_calendar_event_activity();

DROP TRIGGER IF EXISTS trigger_log_calendar_delete ON calendar_events;
CREATE TRIGGER trigger_log_calendar_delete
  BEFORE DELETE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION log_calendar_event_activity();

-- ========================================
-- 7. MANUAL NOTE TRACKING (ensure user_id)
-- ========================================

CREATE OR REPLACE FUNCTION ensure_interaction_user_id()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If user_id is not set, use auth.uid()
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Ensure created_date is set
  IF NEW.created_date IS NULL THEN
    NEW.created_date := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ensure_interaction_user_id ON interactions;
CREATE TRIGGER trigger_ensure_interaction_user_id
  BEFORE INSERT ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_interaction_user_id();

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_interactions_entity_type_id ON interactions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_date ON interactions(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_interactions_customer_date ON interactions(entity_id, created_date DESC) WHERE entity_type = 'customer';
CREATE INDEX IF NOT EXISTS idx_interactions_carrier_date ON interactions(entity_id, created_date DESC) WHERE entity_type = 'carrier';
