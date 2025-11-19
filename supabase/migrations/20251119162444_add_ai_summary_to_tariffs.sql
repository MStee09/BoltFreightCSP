/*
  # Add AI Summary columns to tariffs table

  1. Changes
    - Add `ai_summary` column to store AI-generated document summaries
    - Add `ai_summary_generated_at` column to track when summary was created
  
  2. Purpose
    - Enable AI-powered document analysis for tariff documents
    - Track when summaries were generated for cache management
*/

-- Add AI summary columns to tariffs table
ALTER TABLE tariffs 
ADD COLUMN IF NOT EXISTS ai_summary text,
ADD COLUMN IF NOT EXISTS ai_summary_generated_at timestamptz;
