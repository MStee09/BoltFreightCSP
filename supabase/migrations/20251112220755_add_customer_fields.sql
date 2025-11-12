/*
  # Add Missing Customer Fields

  1. Changes
    - Add `segment` column to store revenue tier (Enterprise, Mid-Market, SMB)
    - Add `annual_revenue` column to store customer's annual revenue
    - Add `primary_contact_name` column for main contact person
    - Add `primary_contact_email` column for main contact email
    - Add `primary_contact_phone` column for main contact phone
  
  2. Notes
    - All fields are optional to maintain compatibility with existing data
    - Uses safe IF NOT EXISTS checks for idempotency
*/

-- Add segment column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'segment'
  ) THEN
    ALTER TABLE customers ADD COLUMN segment text DEFAULT 'Mid-Market';
  END IF;
END $$;

-- Add annual_revenue column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'annual_revenue'
  ) THEN
    ALTER TABLE customers ADD COLUMN annual_revenue numeric;
  END IF;
END $$;

-- Add primary_contact_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'primary_contact_name'
  ) THEN
    ALTER TABLE customers ADD COLUMN primary_contact_name text;
  END IF;
END $$;

-- Add primary_contact_email column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'primary_contact_email'
  ) THEN
    ALTER TABLE customers ADD COLUMN primary_contact_email text;
  END IF;
END $$;

-- Add primary_contact_phone column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'primary_contact_phone'
  ) THEN
    ALTER TABLE customers ADD COLUMN primary_contact_phone text;
  END IF;
END $$;
