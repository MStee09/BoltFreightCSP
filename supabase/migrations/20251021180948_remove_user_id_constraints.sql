/*
  # Remove user_id foreign key constraints

  1. Changes
    - Drop foreign key constraints on user_id columns across all tables
    - This allows mock data to be inserted without requiring auth.users entries
  
  2. Security
    - RLS policies still protect data access
    - Only affects the foreign key relationship, not the security model
*/

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
ALTER TABLE carriers DROP CONSTRAINT IF EXISTS carriers_user_id_fkey;
ALTER TABLE tariffs DROP CONSTRAINT IF EXISTS tariffs_user_id_fkey;
ALTER TABLE csp_events DROP CONSTRAINT IF EXISTS csp_events_user_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_user_id_fkey;
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_user_id_fkey;
ALTER TABLE lost_opportunities DROP CONSTRAINT IF EXISTS lost_opportunities_user_id_fkey;
ALTER TABLE report_snapshots DROP CONSTRAINT IF EXISTS report_snapshots_user_id_fkey;
