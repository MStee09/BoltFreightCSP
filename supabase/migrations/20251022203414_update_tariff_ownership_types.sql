/*
  # Update Tariff Ownership Types

  1. Changes
    - Update existing tariffs to have proper ownership types
    - Add index for ownership_type filtering
    - Ensure ownership_type has proper constraint for valid values
  
  2. Valid ownership types:
    - customer_direct: Customer-specific tariffs (not Rocket managed)
    - rocket_csp: Rocket-managed customer-specific tariffs
    - rocket_blanket: Rocket's blanket tariffs
    - priority1_blanket: Priority 1's blanket tariffs
*/

-- Update existing tariffs with proper ownership types first
UPDATE tariffs 
SET ownership_type = CASE
  WHEN is_blanket_tariff = true THEN 'rocket_blanket'
  WHEN is_blanket_tariff = false AND customer_id IS NOT NULL THEN 'rocket_csp'
  ELSE 'rocket_csp'
END
WHERE ownership_type IS NULL OR ownership_type NOT IN ('customer_direct', 'rocket_csp', 'rocket_blanket', 'priority1_blanket');

-- Add constraint for valid ownership types (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'tariffs_ownership_type_check'
  ) THEN
    ALTER TABLE tariffs ADD CONSTRAINT tariffs_ownership_type_check 
      CHECK (ownership_type IN ('customer_direct', 'rocket_csp', 'rocket_blanket', 'priority1_blanket'));
  END IF;
END $$;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tariffs_ownership_type ON tariffs(ownership_type);
CREATE INDEX IF NOT EXISTS idx_tariffs_status ON tariffs(status);
CREATE INDEX IF NOT EXISTS idx_tariffs_expiry_date ON tariffs(expiry_date);
CREATE INDEX IF NOT EXISTS idx_tariffs_effective_date ON tariffs(effective_date);
CREATE INDEX IF NOT EXISTS idx_tariffs_customer_id ON tariffs(customer_id) WHERE customer_id IS NOT NULL;