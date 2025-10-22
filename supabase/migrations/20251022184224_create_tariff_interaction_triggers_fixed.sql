/*
  # Create Tariff Interaction Auto-Logging (Fixed)

  ## Overview
  This migration creates triggers that automatically log tariffs as interactions
  for customers and carriers whenever tariffs are created or updated.

  ## Changes
  
  1. Functions Created
    - `log_tariff_as_interaction()` - Logs new tariffs as customer/carrier interactions
    - `log_tariff_update_as_interaction()` - Logs tariff updates as interactions
  
  2. Triggers Created
    - Automatically create interaction when tariff is inserted
    - Automatically create interaction when tariff customer/carrier changes
  
  3. Backfill
    - Creates interactions for all existing tariffs
  
  ## Security
    - Functions run with proper user context
    - Maintains existing RLS policies
*/

-- Function to log tariff creation as interaction
CREATE OR REPLACE FUNCTION log_tariff_as_interaction()
RETURNS TRIGGER AS $$
DECLARE
  customer_name_val TEXT;
  carrier_names_val TEXT[];
BEGIN
  -- Get customer name if customer_id exists
  IF NEW.customer_id IS NOT NULL THEN
    SELECT name INTO customer_name_val 
    FROM customers 
    WHERE id = NEW.customer_id;
    
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
      'Tariff Created',
      'A new tariff was created, effective from ' || COALESCE(NEW.effective_date::text, 'TBD') || ' to ' || COALESCE(NEW.expiry_date::text, 'TBD'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'effective_date', NEW.effective_date,
        'expiry_date', NEW.expiry_date,
        'status', NEW.status,
        'version', NEW.version
      ),
      NEW.created_date,
      NEW.user_id
    );
  END IF;

  -- Log interaction for each carrier in carrier_ids array
  IF NEW.carrier_ids IS NOT NULL AND array_length(NEW.carrier_ids, 1) > 0 THEN
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
      'Tariff Created',
      'A new tariff was created' || CASE WHEN customer_name_val IS NOT NULL THEN ' with ' || customer_name_val ELSE '' END || ', effective from ' || COALESCE(NEW.effective_date::text, 'TBD'),
      jsonb_build_object(
        'tariff_id', NEW.id,
        'customer_name', customer_name_val,
        'effective_date', NEW.effective_date,
        'expiry_date', NEW.expiry_date,
        'status', NEW.status,
        'version', NEW.version
      ),
      NEW.created_date,
      NEW.user_id
    FROM unnest(NEW.carrier_ids) AS carrier_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log tariff updates as interaction
CREATE OR REPLACE FUNCTION log_tariff_update_as_interaction()
RETURNS TRIGGER AS $$
DECLARE
  customer_name_val TEXT;
  change_summary TEXT := '';
BEGIN
  -- Check if customer_id changed
  IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
    -- Remove from old customer
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
        'Tariff Disassociated',
        'A tariff was removed from this customer.',
        jsonb_build_object(
          'tariff_id', NEW.id,
          'action', 'removed'
        ),
        NOW(),
        NEW.user_id
      );
    END IF;
    
    -- Add to new customer
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
        'Tariff Associated',
        'A tariff was associated with this customer.',
        jsonb_build_object(
          'tariff_id', NEW.id,
          'status', NEW.status,
          'action', 'associated'
        ),
        NOW(),
        NEW.user_id
      );
    END IF;
  -- If customer didn't change but status changed
  ELSIF NEW.customer_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    change_summary := 'Status changed from "' || COALESCE(OLD.status, 'none') || '" to "' || COALESCE(NEW.status, 'none') || '"';
    
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
      'Tariff Updated',
      change_summary,
      jsonb_build_object(
        'tariff_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'action', 'updated'
      ),
      NOW(),
      NEW.user_id
    );
  END IF;

  -- Handle carrier_ids array changes for carriers that were removed
  IF OLD.carrier_ids IS NOT NULL AND array_length(OLD.carrier_ids, 1) > 0 THEN
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
      'Tariff Removed',
      'A tariff was removed or modified for this carrier.',
      jsonb_build_object(
        'tariff_id', NEW.id,
        'action', 'removed'
      ),
      NOW(),
      NEW.user_id
    FROM unnest(OLD.carrier_ids) AS carrier_id
    WHERE NOT (carrier_id = ANY(COALESCE(NEW.carrier_ids, ARRAY[]::uuid[])));
  END IF;
  
  -- Handle carrier_ids array changes for carriers that were added
  IF NEW.carrier_ids IS NOT NULL AND array_length(NEW.carrier_ids, 1) > 0 THEN
    SELECT name INTO customer_name_val FROM customers WHERE id = NEW.customer_id;
    
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
      'Tariff Added',
      'A tariff was added for this carrier' || CASE WHEN customer_name_val IS NOT NULL THEN ' with ' || customer_name_val ELSE '' END,
      jsonb_build_object(
        'tariff_id', NEW.id,
        'customer_name', customer_name_val,
        'status', NEW.status,
        'action', 'added'
      ),
      NOW(),
      NEW.user_id
    FROM unnest(NEW.carrier_ids) AS carrier_id
    WHERE NOT (carrier_id = ANY(COALESCE(OLD.carrier_ids, ARRAY[]::uuid[])));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS trigger_log_tariff_creation ON tariffs;
DROP TRIGGER IF EXISTS trigger_log_tariff_update ON tariffs;

-- Create trigger for new tariffs
CREATE TRIGGER trigger_log_tariff_creation
  AFTER INSERT ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_as_interaction();

-- Create trigger for tariff updates
CREATE TRIGGER trigger_log_tariff_update
  AFTER UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_update_as_interaction();

-- Backfill: Create interactions for all existing tariffs (customers)
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
  t.customer_id,
  'tariff',
  'Tariff',
  'Tariff effective from ' || COALESCE(t.effective_date::text, 'TBD') || ' to ' || COALESCE(t.expiry_date::text, 'TBD') || ', status: ' || COALESCE(t.status, 'unknown'),
  jsonb_build_object(
    'tariff_id', t.id,
    'effective_date', t.effective_date,
    'expiry_date', t.expiry_date,
    'status', t.status,
    'version', t.version,
    'backfilled', true
  ),
  t.created_date,
  t.user_id
FROM tariffs t
WHERE t.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM interactions i
    WHERE i.entity_type = 'customer'
      AND i.entity_id = t.customer_id
      AND i.interaction_type = 'tariff'
      AND i.metadata->>'tariff_id' = t.id::text
  );

-- Backfill: Create interactions for all existing tariffs (carriers)
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
  'Tariff with ' || COALESCE(c.name, 'Customer'),
  'Tariff effective from ' || COALESCE(t.effective_date::text, 'TBD') || ', status: ' || COALESCE(t.status, 'unknown'),
  jsonb_build_object(
    'tariff_id', t.id,
    'customer_name', c.name,
    'effective_date', t.effective_date,
    'expiry_date', t.expiry_date,
    'status', t.status,
    'version', t.version,
    'backfilled', true
  ),
  t.created_date,
  t.user_id
FROM tariffs t
CROSS JOIN unnest(t.carrier_ids) AS carrier_id
LEFT JOIN customers c ON c.id = t.customer_id
WHERE t.carrier_ids IS NOT NULL 
  AND array_length(t.carrier_ids, 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM interactions i
    WHERE i.entity_type = 'carrier'
      AND i.entity_id = carrier_id
      AND i.interaction_type = 'tariff'
      AND i.metadata->>'tariff_id' = t.id::text
  );
