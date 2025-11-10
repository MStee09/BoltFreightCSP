/*
  # Add carrier portal login URL fields

  1. Changes to carriers table
    - Add `portal_login_url` (text) - URL to carrier's login portal

  2. Changes to tariffs table
    - Add `carrier_portal_url` (text) - Can override carrier's default portal URL
    - This allows tariff-specific URLs while maintaining a default at carrier level

  3. Notes
    - When a carrier is selected for a tariff, the portal URL will be copied from carrier
    - Users can override it on the tariff level if needed
    - Application will prompt to update carrier record when manually changed
*/

-- Add portal login URL to carriers table
ALTER TABLE carriers 
ADD COLUMN IF NOT EXISTS portal_login_url text;

-- Add carrier portal URL to tariffs table (can override carrier default)
ALTER TABLE tariffs 
ADD COLUMN IF NOT EXISTS carrier_portal_url text;
