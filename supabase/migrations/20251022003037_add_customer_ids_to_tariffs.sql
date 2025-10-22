/*
  # Add customer_ids to tariffs table

  1. Changes
    - Add `customer_ids` column to store multiple customers for blanket tariffs
    - This allows blanket tariffs to be associated with multiple customers
  
  2. Notes
    - Existing single customer relationships remain in `customer_id` column
    - For blanket tariffs, use `customer_ids` array instead
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariffs' AND column_name = 'customer_ids'
  ) THEN
    ALTER TABLE tariffs ADD COLUMN customer_ids uuid[] DEFAULT '{}';
  END IF;
END $$;
