/*
  # Add review_date field to tariffs table

  1. Changes
    - Add review_date column to tariffs table
    - This allows tracking when a tariff should be reviewed, separate from expiry_date
    - Review date helps with proactive tariff management and negotiation planning

  2. Notes
    - The notes column already exists, so only adding review_date
    - review_date is nullable and independent of expiry_date
*/

-- Add review_date column
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS review_date date;

-- Add index for efficient filtering by review_date
CREATE INDEX IF NOT EXISTS idx_tariffs_review_date ON tariffs(review_date) WHERE review_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tariffs.review_date IS 'Date when the tariff should be reviewed for renewal or renegotiation, separate from expiry_date';
