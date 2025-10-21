/*
  # Add Extended Carrier Information

  This migration adds additional fields to the carriers table to support:
  - Complete carrier contact information
  - Service network/geographic coverage
  - Additional business details

  ## New Fields Added
  
  ### Contact Information
    - `website` (text): Carrier's website URL
    - `carrier_rep_name` (text): Primary carrier representative name
    - `carrier_rep_email` (text): Carrier representative email
    - `carrier_rep_phone` (text): Carrier representative phone
    - `billing_contact_name` (text): Billing contact name
    - `billing_contact_email` (text): Billing contact email
    - `billing_contact_phone` (text): Billing contact phone
  
  ### Service Network
    - `service_regions` (text[]): Array of regions served (e.g., ['upper_midwest', 'northeast'])
    - `service_states` (text[]): Array of US state codes served (e.g., ['WI', 'MN', 'IL'])
    - `service_countries` (text[]): Array of country codes (e.g., ['US', 'CA', 'MX'])
    - `coverage_type` (text): Type of coverage - 'national', 'regional', 'local', 'international'
  
  ### Additional Details
    - `equipment_types` (text[]): Types of equipment available (e.g., ['dry_van', 'reefer', 'flatbed'])
    - `specializations` (text[]): Special services offered (e.g., ['hazmat', 'expedited', 'white_glove'])

  ## Notes
  - All new fields are nullable to support gradual data population
  - Using PostgreSQL arrays for multi-value fields (regions, states, equipment types)
  - Existing carrier records will have NULL values for new fields
*/

-- Add contact information fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'website'
  ) THEN
    ALTER TABLE carriers ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'carrier_rep_name'
  ) THEN
    ALTER TABLE carriers ADD COLUMN carrier_rep_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'carrier_rep_email'
  ) THEN
    ALTER TABLE carriers ADD COLUMN carrier_rep_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'carrier_rep_phone'
  ) THEN
    ALTER TABLE carriers ADD COLUMN carrier_rep_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'billing_contact_name'
  ) THEN
    ALTER TABLE carriers ADD COLUMN billing_contact_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'billing_contact_email'
  ) THEN
    ALTER TABLE carriers ADD COLUMN billing_contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'billing_contact_phone'
  ) THEN
    ALTER TABLE carriers ADD COLUMN billing_contact_phone text;
  END IF;
END $$;

-- Add service network fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'service_regions'
  ) THEN
    ALTER TABLE carriers ADD COLUMN service_regions text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'service_states'
  ) THEN
    ALTER TABLE carriers ADD COLUMN service_states text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'service_countries'
  ) THEN
    ALTER TABLE carriers ADD COLUMN service_countries text[] DEFAULT ARRAY['US'];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'coverage_type'
  ) THEN
    ALTER TABLE carriers ADD COLUMN coverage_type text DEFAULT 'regional';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'equipment_types'
  ) THEN
    ALTER TABLE carriers ADD COLUMN equipment_types text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'specializations'
  ) THEN
    ALTER TABLE carriers ADD COLUMN specializations text[];
  END IF;
END $$;
