# Supabase Database Migration Guide

## What This Is
Export all data from the current Supabase database to import into your separate Supabase database, then connect Bolt to it.

## Your Data Summary
- 1 user (admin: michael@gorocketshipping.com)
- 15 carriers
- 5 customers (including Torque Fitness with AI strategy)
- 6 CSP events  
- 5 tariffs
- 32 interactions
- Plus: permissions, settings, tasks, alerts, documents

## Quick Steps
1. Run all migrations in your separate Supabase database
2. Import the SQL export file (BOLT_DATA_EXPORT.sql)
3. Create admin user in Supabase Auth
4. Update user_id references
5. Click "Connect" in Bolt to link to your database

See full instructions in the SQL file header.
