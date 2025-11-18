/*
  # Remove Duplicate Index - Security Audit

  1. Purpose
    - Remove duplicate index on interactions table
    - Reduces storage overhead and improves write performance
    - Addresses security audit finding

  2. Changes
    - Drop idx_interactions_entity (duplicate of idx_interactions_entity_type_id)
    - Keep idx_interactions_entity_type_id (more descriptive name)

  3. Performance Impact
    - Reduced storage space
    - Faster INSERT, UPDATE, DELETE operations on interactions table
    - No negative impact on queries (both indexes were identical)
*/

DROP INDEX IF EXISTS public.idx_interactions_entity;