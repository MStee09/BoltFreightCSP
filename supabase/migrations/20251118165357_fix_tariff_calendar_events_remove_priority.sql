/*
  # Fix Tariff Calendar Events Function - Remove Priority Field

  1. Changes
    - Update check_and_create_tariff_calendar_events function to remove references to non-existent 'priority' column
    - Calendar events table doesn't have a priority field, so we remove it from INSERT statements
  
  2. Notes
    - This fixes the "column 'priority' of relation 'calendar_events' does not exist" error when updating tariffs
*/

CREATE OR REPLACE FUNCTION check_and_create_tariff_calendar_events()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tariff_record RECORD;
  days_until_expiry INTEGER;
  review_date DATE;
  event_exists BOOLEAN;
  customer_name TEXT;
  carrier_names TEXT;
BEGIN
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
    
    SELECT name INTO customer_name
    FROM customers
    WHERE id = tariff_record.customer_id;
    
    IF tariff_record.carrier_ids IS NOT NULL AND array_length(tariff_record.carrier_ids, 1) > 0 THEN
      SELECT name INTO carrier_names
      FROM carriers
      WHERE id = tariff_record.carrier_ids[1];
    END IF;
    
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
          status
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
          'pending'
        );
      END IF;
    END IF;
    
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
          status
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
          'pending'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;
