/*
  # Add mode column to tariffs

  1. Changes
    - Add `mode` column to tariffs table to store service type (LTL, Home Delivery, TL, etc.)
    - This allows filtering tariffs by service type in the UI

  2. Notes
    - Column is nullable for backward compatibility with existing tariffs
    - Common values: LTL, Home Delivery, TL, Parcel, Ocean, Air
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'mode'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN mode text;
  END IF;
END $$;
