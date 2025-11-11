/*
  # Complete Activity Timeline Tracking

  1. Overview
    This migration ensures ALL activities are tracked in entity timelines:
    - Customer field changes (name, segment, status, etc.)
    - Carrier field changes (name, status, contacts, etc.)
    - CSP event field changes (status, dates, ownership)
    - Email activities (already tracked via email_activities table)
    - All existing triggers remain active

  2. Changes
    - Add trigger for customer updates
    - Add trigger for carrier updates
    - Add trigger for CSP event updates (general fields)
    - Ensure email activities appear in timelines

  3. Security
    - All functions use SECURITY DEFINER
    - All functions have explicit search_path set
*/

-- ========================================
-- Customer Field Change Tracking
-- ========================================

CREATE OR REPLACE FUNCTION log_customer_field_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  change_summary TEXT;
  change_details TEXT[];
  user_id_val uuid;
BEGIN
  -- Get the user ID from auth context
  user_id_val := auth.uid();

  change_details := ARRAY[]::TEXT[];

  -- Track name changes
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    change_details := array_append(change_details, 'Name changed from "' || COALESCE(OLD.name, 'none') || '" to "' || COALESCE(NEW.name, 'none') || '"');
  END IF;

  -- Track segment changes
  IF OLD.segment IS DISTINCT FROM NEW.segment THEN
    change_details := array_append(change_details, 'Segment changed from "' || COALESCE(OLD.segment, 'none') || '" to "' || COALESCE(NEW.segment, 'none') || '"');
  END IF;

  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    change_details := array_append(change_details, 'Status changed from "' || COALESCE(OLD.status, 'none') || '" to "' || COALESCE(NEW.status, 'none') || '"');
  END IF;

  -- Track account owner changes
  IF OLD.account_owner IS DISTINCT FROM NEW.account_owner THEN
    change_details := array_append(change_details, 'Account owner changed from "' || COALESCE(OLD.account_owner, 'none') || '" to "' || COALESCE(NEW.account_owner, 'none') || '"');
  END IF;

  -- Track contact changes
  IF OLD.contact_name IS DISTINCT FROM NEW.contact_name OR
     OLD.contact_email IS DISTINCT FROM NEW.contact_email OR
     OLD.contact_phone IS DISTINCT FROM NEW.contact_phone THEN
    change_details := array_append(change_details, 'Contact information updated');
  END IF;

  -- Track spend changes
  IF OLD.annual_spend IS DISTINCT FROM NEW.annual_spend THEN
    change_details := array_append(change_details, 'Annual spend changed from ' || COALESCE(OLD.annual_spend::TEXT, 'none') || ' to ' || COALESCE(NEW.annual_spend::TEXT, 'none'));
  END IF;

  -- If we have changes, log them
  IF array_length(change_details, 1) > 0 THEN
    change_summary := 'Customer Updated';

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
      'note',
      change_summary,
      array_to_string(change_details, ' • '),
      jsonb_build_object(
        'changes', change_details,
        'updated_by', user_id_val
      ),
      NOW(),
      user_id_val
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for customer updates
DROP TRIGGER IF EXISTS trigger_log_customer_changes ON customers;
CREATE TRIGGER trigger_log_customer_changes
  AFTER UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_customer_field_changes();

-- ========================================
-- Carrier Field Change Tracking
-- ========================================

CREATE OR REPLACE FUNCTION log_carrier_field_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  change_summary TEXT;
  change_details TEXT[];
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  change_details := ARRAY[]::TEXT[];

  -- Track name changes
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    change_details := array_append(change_details, 'Name changed from "' || COALESCE(OLD.name, 'none') || '" to "' || COALESCE(NEW.name, 'none') || '"');
  END IF;

  -- Track SCAC changes
  IF OLD.scac_code IS DISTINCT FROM NEW.scac_code THEN
    change_details := array_append(change_details, 'SCAC changed from "' || COALESCE(OLD.scac_code, 'none') || '" to "' || COALESCE(NEW.scac_code, 'none') || '"');
  END IF;

  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    change_details := array_append(change_details, 'Status changed from "' || COALESCE(OLD.status, 'none') || '" to "' || COALESCE(NEW.status, 'none') || '"');
  END IF;

  -- Track service type changes
  IF OLD.service_type IS DISTINCT FROM NEW.service_type THEN
    change_details := array_append(change_details, 'Service type changed from "' || COALESCE(OLD.service_type, 'none') || '" to "' || COALESCE(NEW.service_type, 'none') || '"');
  END IF;

  -- Track coverage changes
  IF OLD.coverage_type IS DISTINCT FROM NEW.coverage_type THEN
    change_details := array_append(change_details, 'Coverage changed from "' || COALESCE(OLD.coverage_type, 'none') || '" to "' || COALESCE(NEW.coverage_type, 'none') || '"');
  END IF;

  -- Track account owner changes
  IF OLD.account_owner IS DISTINCT FROM NEW.account_owner THEN
    change_details := array_append(change_details, 'Account owner changed from "' || COALESCE(OLD.account_owner, 'none') || '" to "' || COALESCE(NEW.account_owner, 'none') || '"');
  END IF;

  -- Track contact changes
  IF OLD.carrier_rep_name IS DISTINCT FROM NEW.carrier_rep_name OR
     OLD.carrier_rep_email IS DISTINCT FROM NEW.carrier_rep_email OR
     OLD.carrier_rep_phone IS DISTINCT FROM NEW.carrier_rep_phone THEN
    change_details := array_append(change_details, 'Carrier representative information updated');
  END IF;

  IF OLD.billing_contact_name IS DISTINCT FROM NEW.billing_contact_name OR
     OLD.billing_contact_email IS DISTINCT FROM NEW.billing_contact_email OR
     OLD.billing_contact_phone IS DISTINCT FROM NEW.billing_contact_phone THEN
    change_details := array_append(change_details, 'Billing contact information updated');
  END IF;

  -- Track performance metrics changes
  IF OLD.on_time_percentage IS DISTINCT FROM NEW.on_time_percentage THEN
    change_details := array_append(change_details, 'On-time performance changed from ' || COALESCE(OLD.on_time_percentage::TEXT, 'none') || '% to ' || COALESCE(NEW.on_time_percentage::TEXT, 'none') || '%');
  END IF;

  -- If we have changes, log them
  IF array_length(change_details, 1) > 0 THEN
    change_summary := 'Carrier Updated';

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
      'note',
      change_summary,
      array_to_string(change_details, ' • '),
      jsonb_build_object(
        'changes', change_details,
        'updated_by', user_id_val
      ),
      NOW(),
      user_id_val
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for carrier updates
DROP TRIGGER IF EXISTS trigger_log_carrier_changes ON carriers;
CREATE TRIGGER trigger_log_carrier_changes
  AFTER UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION log_carrier_field_changes();

-- ========================================
-- CSP Event Field Change Tracking (General)
-- ========================================

CREATE OR REPLACE FUNCTION log_csp_event_field_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  change_summary TEXT;
  change_details TEXT[];
  user_id_val uuid;
  customer_name TEXT;
BEGIN
  user_id_val := auth.uid();
  change_details := ARRAY[]::TEXT[];

  -- Get customer name for context
  IF NEW.customer_id IS NOT NULL THEN
    SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
  END IF;

  -- Track title changes
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    change_details := array_append(change_details, 'Title changed from "' || COALESCE(OLD.title, 'none') || '" to "' || COALESCE(NEW.title, 'none') || '"');
  END IF;

  -- Track status changes (not stage, that's handled elsewhere)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    change_details := array_append(change_details, 'Status changed from "' || COALESCE(OLD.status, 'none') || '" to "' || COALESCE(NEW.status, 'none') || '"');

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
        'csp_event',
        'CSP Status Changed: ' || NEW.title,
        'CSP event status changed from "' || COALESCE(OLD.status, 'none') || '" to "' || COALESCE(NEW.status, 'none') || '"',
        jsonb_build_object(
          'csp_event_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        NOW(),
        user_id_val
      );
    END IF;

    -- Log to all assigned carriers
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
      'csp_event',
      'CSP Status Changed: ' || NEW.title,
      'CSP event "' || NEW.title || '" for ' || COALESCE(customer_name, 'customer') || ' status changed to "' || COALESCE(NEW.status, 'none') || '"',
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'customer_id', NEW.customer_id,
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      NOW(),
      user_id_val
    FROM csp_event_carriers cec
    WHERE cec.csp_event_id = NEW.id;
  END IF;

  -- Track mode changes
  IF OLD.mode IS DISTINCT FROM NEW.mode THEN
    change_details := array_append(change_details, 'Mode changed from "' || COALESCE(OLD.mode, 'none') || '" to "' || COALESCE(NEW.mode, 'none') || '"');
  END IF;

  -- Track owner changes
  IF OLD.csp_owner IS DISTINCT FROM NEW.csp_owner THEN
    change_details := array_append(change_details, 'CSP owner changed from "' || COALESCE(OLD.csp_owner, 'none') || '" to "' || COALESCE(NEW.csp_owner, 'none') || '"');

    -- Log owner change to customer
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
        'CSP Owner Changed: ' || NEW.title,
        'CSP owner changed from "' || COALESCE(OLD.csp_owner, 'none') || '" to "' || COALESCE(NEW.csp_owner, 'none') || '"',
        jsonb_build_object(
          'csp_event_id', NEW.id,
          'old_owner', OLD.csp_owner,
          'new_owner', NEW.csp_owner
        ),
        NOW(),
        user_id_val
      );
    END IF;
  END IF;

  -- Track date changes
  IF OLD.projected_award_date IS DISTINCT FROM NEW.projected_award_date OR
     OLD.contract_end_date IS DISTINCT FROM NEW.contract_end_date THEN
    change_details := array_append(change_details, 'Important dates updated');
  END IF;

  -- Log general changes to customer timeline if there are any
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
      'note',
      'CSP Event Updated: ' || NEW.title,
      array_to_string(change_details, ' • '),
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'changes', change_details
      ),
      NOW(),
      user_id_val
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for CSP event field changes
DROP TRIGGER IF EXISTS trigger_log_csp_event_changes ON csp_events;
CREATE TRIGGER trigger_log_csp_event_changes
  AFTER UPDATE ON csp_events
  FOR EACH ROW
  WHEN (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.mode IS DISTINCT FROM NEW.mode OR
    OLD.csp_owner IS DISTINCT FROM NEW.csp_owner OR
    OLD.projected_award_date IS DISTINCT FROM NEW.projected_award_date OR
    OLD.contract_end_date IS DISTINCT FROM NEW.contract_end_date
  )
  EXECUTE FUNCTION log_csp_event_field_changes();

-- ========================================
-- Email Activity Integration
-- ========================================

-- Function to sync email_activities to interactions table for timeline display
CREATE OR REPLACE FUNCTION sync_email_to_interactions()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log email to customer timeline
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
      'email',
      NEW.subject,
      'Email sent: ' || NEW.subject,
      jsonb_build_object(
        'email_activity_id', NEW.id,
        'direction', NEW.direction,
        'to_addresses', NEW.to_addresses,
        'thread_id', NEW.thread_id
      ),
      COALESCE(NEW.sent_at, NOW()),
      NEW.created_by
    );
  END IF;

  -- Log email to carrier timeline
  IF NEW.carrier_id IS NOT NULL THEN
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
      'email',
      NEW.subject,
      'Email sent: ' || NEW.subject,
      jsonb_build_object(
        'email_activity_id', NEW.id,
        'direction', NEW.direction,
        'to_addresses', NEW.to_addresses,
        'thread_id', NEW.thread_id
      ),
      COALESCE(NEW.sent_at, NOW()),
      NEW.created_by
    );
  END IF;

  -- Log email to CSP event timeline (and propagate to customer + carriers)
  IF NEW.csp_event_id IS NOT NULL THEN
    -- Log to customer via CSP event
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
      'email',
      NEW.subject,
      'Email sent for CSP: ' || ce.title,
      jsonb_build_object(
        'email_activity_id', NEW.id,
        'csp_event_id', NEW.csp_event_id,
        'direction', NEW.direction
      ),
      COALESCE(NEW.sent_at, NOW()),
      NEW.created_by
    FROM csp_events ce
    WHERE ce.id = NEW.csp_event_id AND ce.customer_id IS NOT NULL;

    -- Log to carriers via CSP event
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
      'email',
      NEW.subject,
      'Email sent for CSP: ' || ce.title,
      jsonb_build_object(
        'email_activity_id', NEW.id,
        'csp_event_id', NEW.csp_event_id,
        'direction', NEW.direction
      ),
      COALESCE(NEW.sent_at, NOW()),
      NEW.created_by
    FROM csp_events ce
    JOIN csp_event_carriers cec ON cec.csp_event_id = ce.id
    WHERE ce.id = NEW.csp_event_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to sync email activities to interactions
DROP TRIGGER IF EXISTS trigger_sync_email_to_interactions ON email_activities;
CREATE TRIGGER trigger_sync_email_to_interactions
  AFTER INSERT ON email_activities
  FOR EACH ROW
  EXECUTE FUNCTION sync_email_to_interactions();
