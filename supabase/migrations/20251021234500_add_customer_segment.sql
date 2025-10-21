/*
  # Add Customer Segment/Revenue Tier

  1. Changes
    - Add `segment` column to customers table
    - Values: 'Enterprise', 'Mid-Market', 'SMB'
    - Default to 'Mid-Market'

  2. Purpose
    - Helps analysts prioritize which customers justify heavy bid preparation
    - Provides instant context for customer importance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'segment'
  ) THEN
    ALTER TABLE customers ADD COLUMN segment text DEFAULT 'Mid-Market';
  END IF;
END $$;
