/*
  # Create Comprehensive Tariff Monitoring System
  
  1. Purpose
    - Automatically monitor ALL tariffs (new and existing)
    - Generate alerts for expiring tariffs at 90, 60, 30 days
    - Create calendar events for reviews and renewals
    - Track tariff status changes
  
  2. New Functions
    - check_and_create_tariff_alerts(): Scans all tariffs and creates alerts
    - check_and_create_tariff_calendar_events(): Creates calendar events for reviews
    - on_tariff_insert_or_update(): Trigger to run monitoring on changes
  
  3. Security
    - Functions run with SECURITY DEFINER to access all tariffs
    - No RLS changes needed
*/

-- Function to check and create alerts for expiring tariffs
CREATE OR REPLACE FUNCTION check_and_create_tariff_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tariff_record RECORD;
  days_until_expiry INTEGER;
  alert_exists BOOLEAN;
  customer_name TEXT;
  carrier_names TEXT;
BEGIN
  -- Loop through all active tariffs with expiry dates
  FOR tariff_record IN 
    SELECT 
      t.id,
      t.customer_id,
      t.carrier_ids,
      t.expiry_date,
      t.version,
      t.status,
      t.user_id
    FROM tariffs t
    WHERE t.expiry_date IS NOT NULL
      AND t.status IN ('active', 'proposed')
      AND t.expiry_date >= CURRENT_DATE
  LOOP
    -- Calculate days until expiry
    days_until_expiry := tariff_record.expiry_date - CURRENT_DATE;
    
    -- Get customer name
    SELECT name INTO customer_name
    FROM customers
    WHERE id = tariff_record.customer_id;
    
    -- Get carrier names (first carrier)
    IF tariff_record.carrier_ids IS NOT NULL AND array_length(tariff_record.carrier_ids, 1) > 0 THEN
      SELECT name INTO carrier_names
      FROM carriers
      WHERE id = tariff_record.carrier_ids[1];
    END IF;
    
    -- Create alerts at 90, 60, and 30 days before expiry
    IF days_until_expiry <= 90 AND days_until_expiry > 89 THEN
      -- Check if 90-day alert already exists
      SELECT EXISTS(
        SELECT 1 FROM alerts
        WHERE entity_type = 'tariff'
          AND entity_id = tariff_record.id
          AND alert_type = 'expiring_tariff'
          AND title LIKE '%90 days%'
          AND status = 'active'
      ) INTO alert_exists;
      
      IF NOT alert_exists THEN
        INSERT INTO alerts (
          alert_type,
          severity,
          status,
          title,
          message,
          entity_type,
          entity_id,
          user_id,
          assigned_to,
          recommended_action
        ) VALUES (
          'expiring_tariff',
          'warning',
          'active',
          format('Tariff %s expires in 90 days', tariff_record.version),
          format('Tariff %s for %s (%s) expires on %s. Begin renewal planning.', 
            tariff_record.version, 
            COALESCE(customer_name, 'Unknown Customer'),
            COALESCE(carrier_names, 'Unknown Carrier'),
            to_char(tariff_record.expiry_date, 'Mon DD, YYYY')
          ),
          'tariff',
          tariff_record.id,
          tariff_record.user_id,
          tariff_record.user_id,
          'Start renewal negotiations and gather updated requirements'
        );
      END IF;
    END IF;
    
    IF days_until_expiry <= 60 AND days_until_expiry > 59 THEN
      SELECT EXISTS(
        SELECT 1 FROM alerts
        WHERE entity_type = 'tariff'
          AND entity_id = tariff_record.id
          AND alert_type = 'expiring_tariff'
          AND title LIKE '%60 days%'
          AND status = 'active'
      ) INTO alert_exists;
      
      IF NOT alert_exists THEN
        INSERT INTO alerts (
          alert_type,
          severity,
          status,
          title,
          message,
          entity_type,
          entity_id,
          user_id,
          assigned_to,
          recommended_action
        ) VALUES (
          'expiring_tariff',
          'warning',
          'active',
          format('Tariff %s expires in 60 days', tariff_record.version),
          format('Tariff %s for %s (%s) expires on %s. Finalize renewal terms.', 
            tariff_record.version, 
            COALESCE(customer_name, 'Unknown Customer'),
            COALESCE(carrier_names, 'Unknown Carrier'),
            to_char(tariff_record.expiry_date, 'Mon DD, YYYY')
          ),
          'tariff',
          tariff_record.id,
          tariff_record.user_id,
          tariff_record.user_id,
          'Complete carrier negotiations and prepare new tariff documentation'
        );
      END IF;
    END IF;
    
    IF days_until_expiry <= 30 AND days_until_expiry > 29 THEN
      SELECT EXISTS(
        SELECT 1 FROM alerts
        WHERE entity_type = 'tariff'
          AND entity_id = tariff_record.id
          AND alert_type = 'expiring_tariff'
          AND title LIKE '%30 days%'
          AND status = 'active'
      ) INTO alert_exists;
      
      IF NOT alert_exists THEN
        INSERT INTO alerts (
          alert_type,
          severity,
          status,
          title,
          message,
          entity_type,
          entity_id,
          user_id,
          assigned_to,
          recommended_action
        ) VALUES (
          'expiring_tariff',
          'critical',
          'active',
          format('URGENT: Tariff %s expires in 30 days', tariff_record.version),
          format('Tariff %s for %s (%s) expires on %s. Immediate action required!', 
            tariff_record.version, 
            COALESCE(customer_name, 'Unknown Customer'),
            COALESCE(carrier_names, 'Unknown Carrier'),
            to_char(tariff_record.expiry_date, 'Mon DD, YYYY')
          ),
          'tariff',
          tariff_record.id,
          tariff_record.user_id,
          tariff_record.user_id,
          'URGENT: Execute new tariff or extend existing agreement immediately'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Function to create calendar events for tariff reviews
CREATE OR REPLACE FUNCTION check_and_create_tariff_calendar_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tariff_record RECORD;
  days_until_expiry INTEGER;
  review_date DATE;
  event_exists BOOLEAN;
  customer_name TEXT;
  carrier_names TEXT;
BEGIN
  -- Loop through all active tariffs with expiry dates
  FOR tariff_record IN 
    SELECT 
      t.id,
      t.customer_id,
      t.carrier_ids,
      t.expiry_date,
      t.version,
      t.status,
      t.user_id
    FROM tariffs t
    WHERE t.expiry_date IS NOT NULL
      AND t.status IN ('active', 'proposed')
      AND t.expiry_date >= CURRENT_DATE
  LOOP
    days_until_expiry := tariff_record.expiry_date - CURRENT_DATE;
    
    -- Get customer name
    SELECT name INTO customer_name
    FROM customers
    WHERE id = tariff_record.customer_id;
    
    -- Get carrier names
    IF tariff_record.carrier_ids IS NOT NULL AND array_length(tariff_record.carrier_ids, 1) > 0 THEN
      SELECT name INTO carrier_names
      FROM carriers
      WHERE id = tariff_record.carrier_ids[1];
    END IF;
    
    -- Create review event 90 days before expiry
    IF days_until_expiry <= 90 AND days_until_expiry >= 85 THEN
      review_date := tariff_record.expiry_date - INTERVAL '90 days';
      
      SELECT EXISTS(
        SELECT 1 FROM calendar_events
        WHERE entity_type = 'tariff'
          AND entity_id = tariff_record.id
          AND event_date = review_date
          AND status = 'pending'
      ) INTO event_exists;
      
      IF NOT event_exists THEN
        INSERT INTO calendar_events (
          user_id,
          title,
          description,
          event_date,
          event_type,
          entity_type,
          entity_id,
          status,
          priority
        ) VALUES (
          tariff_record.user_id,
          format('Review: %s - %s', COALESCE(customer_name, 'Customer'), COALESCE(carrier_names, 'Carrier')),
          format('90-day review for tariff %s expiring on %s', 
            tariff_record.version,
            to_char(tariff_record.expiry_date, 'Mon DD, YYYY')
          ),
          review_date,
          'tariff_review',
          'tariff',
          tariff_record.id,
          'pending',
          'high'
        );
      END IF;
    END IF;
    
    -- Create renewal event 60 days before expiry
    IF days_until_expiry <= 60 AND days_until_expiry >= 55 THEN
      review_date := tariff_record.expiry_date - INTERVAL '60 days';
      
      SELECT EXISTS(
        SELECT 1 FROM calendar_events
        WHERE entity_type = 'tariff'
          AND entity_id = tariff_record.id
          AND event_date = review_date
          AND status = 'pending'
      ) INTO event_exists;
      
      IF NOT event_exists THEN
        INSERT INTO calendar_events (
          user_id,
          title,
          description,
          event_date,
          event_type,
          entity_type,
          entity_id,
          status,
          priority
        ) VALUES (
          tariff_record.user_id,
          format('Renewal: %s - %s', COALESCE(customer_name, 'Customer'), COALESCE(carrier_names, 'Carrier')),
          format('Begin renewal process for tariff %s expiring on %s', 
            tariff_record.version,
            to_char(tariff_record.expiry_date, 'Mon DD, YYYY')
          ),
          review_date,
          'tariff_renewal',
          'tariff',
          tariff_record.id,
          'pending',
          'high'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Trigger function to run monitoring on tariff insert/update
CREATE OR REPLACE FUNCTION on_tariff_change_monitor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run if expiry_date is set and tariff is active/proposed
  IF NEW.expiry_date IS NOT NULL AND NEW.status IN ('active', 'proposed') THEN
    PERFORM check_and_create_tariff_alerts();
    PERFORM check_and_create_tariff_calendar_events();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on tariffs table
DROP TRIGGER IF EXISTS trigger_monitor_tariff_lifecycle ON tariffs;
CREATE TRIGGER trigger_monitor_tariff_lifecycle
  AFTER INSERT OR UPDATE OF expiry_date, status ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION on_tariff_change_monitor();

-- Run initial check on all existing tariffs
SELECT check_and_create_tariff_alerts();
SELECT check_and_create_tariff_calendar_events();
