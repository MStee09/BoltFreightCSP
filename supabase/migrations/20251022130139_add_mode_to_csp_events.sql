/*
  # Add Mode Field to CSP Events

  1. Changes
    - Add `mode` column to csp_events table for categorizing freight type
    - Common values: LTL, Truckload, Home Delivery, Parcel, Intermodal

  2. Purpose
    - Enable filtering and sorting of CSP events by freight mode
    - Better organization and visibility for different service types
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'mode'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN mode text;
  END IF;
END $$;