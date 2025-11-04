/*
  ==========================================================================
  COMPLETE DATA IMPORT FOR SUPABASE
  ==========================================================================
  
  Run this file in your separate Supabase project's SQL Editor.
  
  PREREQUISITES:
  1. All migrations must be applied first
  2. Tables must exist before running this
  
  AFTER IMPORT:
  1. Create your admin user via Supabase Auth (michael@gorocketshipping.com)
  2. Get the user UUID from auth.users
  3. Run the UPDATE commands at the end to fix user_id references
  
  DATA INCLUDED:
  - 40 permissions
  - 118 role_permission mappings
  - 1 admin user profile
  - 15 carriers (ODFL, EXLA, RDFS, DAFG, etc.)
  - 5 customers (including Torque Fitness)
  - 6 CSP events (with AI-generated strategy for Torque Fitness)
  - 5 tariffs
  - 32 interaction records
  - 3 tasks, 3 alerts
  - 2 documents
  - 1 calendar event
  - 4 stage history records
  - 2 tariff activities
  - 1 AI chatbot settings
  - 1 Gmail credentials
  - 2 field mappings
  - 2 alert preferences
  - 3 user invitations
  
  TOTAL: 247 rows of data
  ==========================================================================
*/

-- Temporarily disable triggers for faster import
SET session_replication_role = replica;

SELECT 'Starting data import...' as status;

