/*
  # Add single carrier and credential fields to tariffs

  1. Changes
    - Add `carrier_id` (uuid) - Single carrier per tariff
    - Add `credential_username` (text) - Login username for carrier portal
    - Add `credential_password` (text) - Password for carrier portal (encrypted)
    - Add `shipper_number` (text) - Shipper number/code for this tariff
    - Add foreign key constraint to carriers table
    - Add index on carrier_id for performance

  2. Notes
    - Keeps existing `carrier_ids` array for backward compatibility during migration
    - credential_password should be encrypted at application level before storage
*/

-- Add new columns
ALTER TABLE tariffs 
ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES carriers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS credential_username text,
ADD COLUMN IF NOT EXISTS credential_password text,
ADD COLUMN IF NOT EXISTS shipper_number text;

-- Add index for carrier lookups
CREATE INDEX IF NOT EXISTS idx_tariffs_carrier_id ON tariffs(carrier_id);

-- Migrate existing data: if carrier_ids array has one item, move it to carrier_id
UPDATE tariffs 
SET carrier_id = carrier_ids[1]
WHERE carrier_ids IS NOT NULL 
  AND array_length(carrier_ids, 1) = 1
  AND carrier_id IS NULL;
