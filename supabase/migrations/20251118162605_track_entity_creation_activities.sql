/*
  # Track Entity Creation Activities
  
  ## Overview
  This migration adds tracking for when entities are CREATED (not just updated).
  Previously we only tracked updates, but creation events are equally important for reporting.
  
  ## What Gets Tracked
  1. Customer creation → who created the customer
  2. Carrier creation → who created the carrier
  3. CSP Event creation → who created the CSP and link to customer
  4. Tariff creation → already tracked, but ensuring it logs to timelines
  
  ## Security
  - All functions use SECURITY DEFINER with explicit search_path
  - User ID captured from auth.uid()
*/

-- ========================================
-- 1. CUSTOMER CREATION TRACKING
-- ========================================

CREATE OR REPLACE FUNCTION log_customer_creation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();

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
    'create',
    'Customer Created',
    'Customer "' || NEW.name || '" was created' || 
    CASE 
      WHEN NEW.segment IS NOT NULL THEN ' with segment: ' || NEW.segment
      ELSE ''
    END,
    jsonb_build_object(
      'customer_id', NEW.id,
      'customer_name', NEW.name,
      'segment', NEW.segment,
      'status', NEW.status,
      'created_by', user_id_val
    ),
    NOW(),
    user_id_val
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_customer_creation ON customers;
CREATE TRIGGER trigger_log_customer_creation
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_customer_creation();

-- ========================================
-- 2. CARRIER CREATION TRACKING
-- ========================================

CREATE OR REPLACE FUNCTION log_carrier_creation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();

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
    'create',
    'Carrier Created',
    'Carrier "' || NEW.name || '" was created' ||
    CASE 
      WHEN NEW.scac_code IS NOT NULL THEN ' (SCAC: ' || NEW.scac_code || ')'
      ELSE ''
    END,
    jsonb_build_object(
      'carrier_id', NEW.id,
      'carrier_name', NEW.name,
      'scac_code', NEW.scac_code,
      'service_type', NEW.service_type,
      'created_by', user_id_val
    ),
    NOW(),
    user_id_val
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_carrier_creation ON carriers;
CREATE TRIGGER trigger_log_carrier_creation
  AFTER INSERT ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION log_carrier_creation();

-- ========================================
-- 3. CSP EVENT CREATION TRACKING
-- ========================================

CREATE OR REPLACE FUNCTION log_csp_event_creation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_id_val uuid;
  customer_name TEXT;
BEGIN
  user_id_val := auth.uid();

  -- Get customer name
  IF NEW.customer_id IS NOT NULL THEN
    SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
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
      'csp_event',
      'CSP Event Created: ' || NEW.title,
      'New CSP event "' || NEW.title || '" was created' ||
      CASE 
        WHEN NEW.mode IS NOT NULL THEN ' for ' || NEW.mode
        ELSE ''
      END,
      jsonb_build_object(
        'csp_event_id', NEW.id,
        'csp_title', NEW.title,
        'mode', NEW.mode,
        'ownership_type', NEW.ownership_type,
        'customer_id', NEW.customer_id,
        'created_by', user_id_val
      ),
      NOW(),
      user_id_val
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_csp_creation ON csp_events;
CREATE TRIGGER trigger_log_csp_creation
  AFTER INSERT ON csp_events
  FOR EACH ROW
  EXECUTE FUNCTION log_csp_event_creation();

-- ========================================
-- 4. TARIFF CREATION TRACKING (Enhanced)
-- ========================================

-- Verify tariff creation is properly tracked to customer and carrier timelines
-- The trigger already exists, but let's ensure it logs to both entities

CREATE OR REPLACE FUNCTION log_tariff_creation_to_timelines()
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

  -- Get names for better details
  SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
  SELECT name INTO carrier_name FROM carriers WHERE id = NEW.carrier_id;

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
      'Tariff Created: ' || COALESCE(NEW.tariff_reference_id, 'New Tariff'),
      'New tariff ' || COALESCE(NEW.tariff_reference_id, '') || ' created with ' || COALESCE(carrier_name, 'carrier'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'tariff_reference_id', NEW.tariff_reference_id,
        'status', NEW.status,
        'ownership_type', NEW.ownership_type,
        'carrier_id', NEW.carrier_id,
        'customer_id', NEW.customer_id,
        'created_by', user_id_val
      ),
      NOW(),
      user_id_val
    );
  END IF;

  -- Log to carrier timeline
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
      'tariff',
      'Tariff Created: ' || COALESCE(NEW.tariff_reference_id, 'New Tariff'),
      'New tariff ' || COALESCE(NEW.tariff_reference_id, '') || ' created for ' || COALESCE(customer_name, 'customer'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'tariff_reference_id', NEW.tariff_reference_id,
        'status', NEW.status,
        'ownership_type', NEW.ownership_type,
        'carrier_id', NEW.carrier_id,
        'customer_id', NEW.customer_id,
        'created_by', user_id_val
      ),
      NOW(),
      user_id_val
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Only create if it doesn't exist or replace existing
DROP TRIGGER IF EXISTS trigger_log_tariff_creation_timelines ON tariffs;
CREATE TRIGGER trigger_log_tariff_creation_timelines
  AFTER INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_creation_to_timelines();

-- ========================================
-- 5. DOCUMENT UPLOAD TRACKING (Ensure it works)
-- ========================================

-- Verify document upload tracking is working
-- The function already exists from previous migration, just ensure it's active

-- Check if trigger exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name = 'trigger_log_document_upload'
      AND event_object_table = 'documents'
  ) THEN
    -- Create the trigger if it doesn't exist
    CREATE TRIGGER trigger_log_document_upload
      AFTER INSERT ON documents
      FOR EACH ROW
      EXECUTE FUNCTION log_document_activity();
  END IF;
END $$;
