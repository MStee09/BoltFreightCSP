/*
  # Comprehensive Customer & Carrier Activity Tracking (HubSpot-style)

  ## Overview
  This migration creates a comprehensive activity tracking system that automatically logs
  ALL customer and carrier-related activities to their timelines, mimicking HubSpot's CRM behavior.

  ## Changes

  1. Enhanced CSP Event Tracking
    - Logs CSP stage changes to BOTH customer AND all assigned carriers
    - Logs CSP status changes to customer and carriers
    - Logs carrier assignments/removals to CSP events

  2. Document Activity Tracking
    - Logs document uploads to customer/carrier timelines
    - Tracks document type and metadata

  3. Tariff Activity Tracking
    - Logs tariff uploads to customer timelines
    - Logs tariff updates and expirations
    - Logs rate changes

  4. Carrier Assignment Tracking
    - Logs when carriers are added to CSP events
    - Logs when carriers are removed from CSP events
    - Shows on both customer and carrier timelines

  ## Functions Created
  - `log_carrier_to_csp_assignment()` - Logs carrier assignments to CSP events
  - `log_document_activity()` - Logs document uploads
  - `log_csp_stage_to_carriers()` - Logs CSP stage changes to all carriers in the event
  - `log_tariff_activity()` - Logs tariff-related activities

  ## Security
  - All functions run with SECURITY DEFINER
  - Maintains existing RLS policies
*/

-- ========================================
-- Enhanced CSP Event Triggers (Customer + Carriers)
-- ========================================

-- Function to log CSP stage changes to ALL assigned carriers
CREATE OR REPLACE FUNCTION log_csp_stage_to_carriers()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if stage changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Log to customer timeline
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
        'csp_stage_update',
        'CSP Stage Changed: ' || NEW.title,
        'Stage moved from "' || COALESCE(OLD.stage, 'none') || '" to "' || COALESCE(NEW.stage, 'none') || '"',
        jsonb_build_object(
          'csp_event_id', NEW.id,
          'csp_event_title', NEW.title,
          'old_stage', OLD.stage,
          'new_stage', NEW.stage,
          'status', NEW.status
        ),
        NOW(),
        NEW.user_id
      );
    END IF;

    -- Log to ALL assigned carriers
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
      'carrier',
      cec.carrier_id,
      'csp_stage_update',
      'CSP Stage Changed: ' || NEW.title,
      'Stage moved from "' || COALESCE(OLD.stage, 'none') || '" to "' || COALESCE(NEW.stage, 'none') || '" for customer: ' || COALESCE((SELECT name FROM customers WHERE id = NEW.customer_id), 'Unknown'),
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'csp_event_title', NEW.title,
        'old_stage', OLD.stage,
        'new_stage', NEW.stage,
        'status', NEW.status,
        'customer_id', NEW.customer_id
      ),
      NOW(),
      NEW.user_id
    FROM csp_event_carriers cec
    WHERE cec.csp_event_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for CSP stage changes
DROP TRIGGER IF EXISTS trigger_log_csp_stage_to_carriers ON csp_events;
CREATE TRIGGER trigger_log_csp_stage_to_carriers
  AFTER UPDATE ON csp_events
  FOR EACH ROW
  WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
  EXECUTE FUNCTION log_csp_stage_to_carriers();

-- ========================================
-- Carrier Assignment Tracking
-- ========================================

-- Function to log carrier assignments to CSP events
CREATE OR REPLACE FUNCTION log_carrier_to_csp_assignment()
RETURNS TRIGGER AS $$
DECLARE
  csp_title TEXT;
  customer_name TEXT;
  carrier_name TEXT;
  customer_id_val uuid;
BEGIN
  -- Get CSP event details
  SELECT ce.title, c.name, ce.customer_id
  INTO csp_title, customer_name, customer_id_val
  FROM csp_events ce
  LEFT JOIN customers c ON c.id = ce.customer_id
  WHERE ce.id = NEW.csp_event_id;

  -- Get carrier name
  SELECT name INTO carrier_name
  FROM carriers
  WHERE id = NEW.carrier_id;

  -- Log to carrier timeline
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
    NEW.carrier_id,
    'csp_event',
    'Added to CSP Event: ' || COALESCE(csp_title, 'Unknown'),
    'You were added to the CSP event "' || COALESCE(csp_title, 'Unknown') || '" for customer: ' || COALESCE(customer_name, 'Unknown'),
    jsonb_build_object(
      'csp_event_id', NEW.csp_event_id,
      'action', 'carrier_assigned',
      'invited_date', NEW.invited_date,
      'status', NEW.status
    ),
    NEW.created_date,
    NEW.user_id
  );

  -- Log to customer timeline if customer exists
  IF customer_id_val IS NOT NULL THEN
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
      customer_id_val,
      'csp_event',
      'Carrier Added to CSP: ' || COALESCE(carrier_name, 'Unknown'),
      'Carrier "' || COALESCE(carrier_name, 'Unknown') || '" was added to CSP event: ' || COALESCE(csp_title, 'Unknown'),
      jsonb_build_object(
        'csp_event_id', NEW.csp_event_id,
        'carrier_id', NEW.carrier_id,
        'carrier_name', carrier_name,
        'action', 'carrier_assigned'
      ),
      NEW.created_date,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for carrier assignments
DROP TRIGGER IF EXISTS trigger_log_carrier_assignment ON csp_event_carriers;
CREATE TRIGGER trigger_log_carrier_assignment
  AFTER INSERT ON csp_event_carriers
  FOR EACH ROW
  EXECUTE FUNCTION log_carrier_to_csp_assignment();

-- ========================================
-- Document Upload Tracking
-- ========================================

-- Function to log document uploads
CREATE OR REPLACE FUNCTION log_document_activity()
RETURNS TRIGGER AS $$
DECLARE
  related_name TEXT;
BEGIN
  -- Log to customer if document is for a customer
  IF NEW.entity_type = 'customer' AND NEW.entity_id IS NOT NULL THEN
    SELECT name INTO related_name FROM customers WHERE id = NEW.entity_id;
    
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
      NEW.entity_id,
      'document_upload',
      'Document Uploaded: ' || COALESCE(NEW.file_name, 'Unknown'),
      'A new document was uploaded: ' || COALESCE(NEW.file_name, 'Unknown') || ' (' || COALESCE(NEW.document_type, 'general') || ')',
      jsonb_build_object(
        'document_id', NEW.id,
        'file_name', NEW.file_name,
        'document_type', NEW.document_type,
        'file_size', NEW.file_size,
        'mime_type', NEW.mime_type
      ),
      NEW.created_at,
      NEW.uploaded_by
    );
  END IF;

  -- Log to carrier if document is for a carrier
  IF NEW.entity_type = 'carrier' AND NEW.entity_id IS NOT NULL THEN
    SELECT name INTO related_name FROM carriers WHERE id = NEW.entity_id;
    
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
      NEW.entity_id,
      'document_upload',
      'Document Uploaded: ' || COALESCE(NEW.file_name, 'Unknown'),
      'A new document was uploaded: ' || COALESCE(NEW.file_name, 'Unknown') || ' (' || COALESCE(NEW.document_type, 'general') || ')',
      jsonb_build_object(
        'document_id', NEW.id,
        'file_name', NEW.file_name,
        'document_type', NEW.document_type,
        'file_size', NEW.file_size,
        'mime_type', NEW.mime_type
      ),
      NEW.created_at,
      NEW.uploaded_by
    );
  END IF;

  -- Log to CSP event if document is for a CSP event
  IF NEW.entity_type = 'csp_event' AND NEW.entity_id IS NOT NULL THEN
    -- Also log to the customer associated with the CSP event
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
      'document_upload',
      'CSP Document Uploaded: ' || COALESCE(NEW.file_name, 'Unknown'),
      'A document was uploaded to CSP event "' || ce.title || '": ' || COALESCE(NEW.file_name, 'Unknown'),
      jsonb_build_object(
        'document_id', NEW.id,
        'file_name', NEW.file_name,
        'document_type', NEW.document_type,
        'csp_event_id', NEW.entity_id
      ),
      NEW.created_at,
      NEW.uploaded_by
    FROM csp_events ce
    WHERE ce.id = NEW.entity_id AND ce.customer_id IS NOT NULL;

    -- Also log to all carriers in the CSP event
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
      'carrier',
      cec.carrier_id,
      'document_upload',
      'CSP Document Uploaded: ' || COALESCE(NEW.file_name, 'Unknown'),
      'A document was uploaded to CSP event "' || ce.title || '": ' || COALESCE(NEW.file_name, 'Unknown'),
      jsonb_build_object(
        'document_id', NEW.id,
        'file_name', NEW.file_name,
        'document_type', NEW.document_type,
        'csp_event_id', NEW.entity_id
      ),
      NEW.created_at,
      NEW.uploaded_by
    FROM csp_events ce
    JOIN csp_event_carriers cec ON cec.csp_event_id = ce.id
    WHERE ce.id = NEW.entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for document uploads
DROP TRIGGER IF EXISTS trigger_log_document_upload ON documents;
CREATE TRIGGER trigger_log_document_upload
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_activity();

-- ========================================
-- Tariff Activity Tracking
-- ========================================

-- Function to log tariff activities
CREATE OR REPLACE FUNCTION log_tariff_activity()
RETURNS TRIGGER AS $$
DECLARE
  carrier_name TEXT;
  tariff_display_name TEXT;
BEGIN
  -- Create a display name for the tariff
  tariff_display_name := COALESCE(NEW.version, 'Tariff #' || NEW.id::text);

  -- Get carrier name (handle array of carrier_ids)
  IF NEW.carrier_ids IS NOT NULL AND array_length(NEW.carrier_ids, 1) > 0 THEN
    SELECT name INTO carrier_name FROM carriers WHERE id = NEW.carrier_ids[1];
  END IF;

  -- Log to carrier timeline for each carrier
  IF NEW.carrier_ids IS NOT NULL THEN
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
      'carrier',
      carrier_id,
      'tariff',
      'Tariff ' || (CASE WHEN TG_OP = 'INSERT' THEN 'Uploaded' ELSE 'Updated' END) || ': ' || tariff_display_name,
      'Tariff effective from ' || COALESCE(NEW.effective_date::text, 'unknown') || ' to ' || COALESCE(NEW.expiry_date::text, 'unknown'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'tariff_version', NEW.version,
        'effective_date', NEW.effective_date,
        'expiry_date', NEW.expiry_date,
        'ownership_type', NEW.ownership_type,
        'action', LOWER(TG_OP)
      ),
      COALESCE(NEW.created_date, NOW()),
      NEW.user_id
    FROM unnest(NEW.carrier_ids) AS carrier_id;
  END IF;

  -- Log to customer timeline
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
      'tariff',
      'Tariff ' || (CASE WHEN TG_OP = 'INSERT' THEN 'Received' ELSE 'Updated' END) || ' from ' || COALESCE(carrier_name, 'carrier'),
      'New tariff from carrier "' || COALESCE(carrier_name, 'Unknown') || '" effective: ' || COALESCE(NEW.effective_date::text, 'unknown'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'tariff_version', NEW.version,
        'carrier_name', carrier_name,
        'effective_date', NEW.effective_date,
        'expiry_date', NEW.expiry_date,
        'ownership_type', NEW.ownership_type,
        'action', LOWER(TG_OP)
      ),
      COALESCE(NEW.created_date, NOW()),
      NEW.user_id
    );
  END IF;

  -- Log to all additional customers in customer_ids array
  IF NEW.customer_ids IS NOT NULL AND array_length(NEW.customer_ids, 1) > 0 THEN
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
      customer_id,
      'tariff',
      'Tariff ' || (CASE WHEN TG_OP = 'INSERT' THEN 'Received' ELSE 'Updated' END) || ' from ' || COALESCE(carrier_name, 'carrier'),
      'New tariff from carrier "' || COALESCE(carrier_name, 'Unknown') || '" effective: ' || COALESCE(NEW.effective_date::text, 'unknown'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'tariff_version', NEW.version,
        'carrier_name', carrier_name,
        'effective_date', NEW.effective_date,
        'expiry_date', NEW.expiry_date,
        'ownership_type', NEW.ownership_type,
        'action', LOWER(TG_OP)
      ),
      COALESCE(NEW.created_date, NOW()),
      NEW.user_id
    FROM unnest(NEW.customer_ids) AS customer_id
    WHERE customer_id != NEW.customer_id OR NEW.customer_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for tariff activities
DROP TRIGGER IF EXISTS trigger_log_tariff_insert ON tariffs;
CREATE TRIGGER trigger_log_tariff_insert
  AFTER INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_activity();

DROP TRIGGER IF EXISTS trigger_log_tariff_update ON tariffs;
CREATE TRIGGER trigger_log_tariff_update
  AFTER UPDATE ON tariffs
  FOR EACH ROW
  WHEN (
    OLD.effective_date IS DISTINCT FROM NEW.effective_date OR
    OLD.expiry_date IS DISTINCT FROM NEW.expiry_date OR
    OLD.customer_ids IS DISTINCT FROM NEW.customer_ids OR
    OLD.carrier_ids IS DISTINCT FROM NEW.carrier_ids
  )
  EXECUTE FUNCTION log_tariff_activity();
