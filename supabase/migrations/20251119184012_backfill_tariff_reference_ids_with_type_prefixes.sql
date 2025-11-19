/*
  # Backfill Tariff Reference IDs with Type Prefixes
  
  1. Purpose
    - Update all existing tariff reference IDs to use the new type prefix system
    - Ensures consistency across all tariffs, old and new
  
  2. Changes
    - Regenerate all tariff_reference_id values using the improved naming function
    - Preserves the sequence numbering within each type/customer/carrier/year combination
    - Updates in order of creation to maintain chronological sequence
  
  3. Examples of Changes
    - "EXTE-FEDEX-2025-001" → "DIR-EXTE-FEDEX-2025-001" (Customer Direct)
    - "OUT-AIT-2412-001" → "RKT-OUT-AIT-2024-001" (Rocket CSP)
    - Blanket tariffs → "BLK-ROCKET-CARRIER-2025-001"
  
  4. Safety
    - No data loss - only updating the reference ID field
    - All relationships and history preserved
    - Function handles NULL values gracefully
*/

-- Update all existing tariffs with new reference IDs
DO $$
DECLARE
  tariff_record RECORD;
  new_ref_id text;
BEGIN
  -- Process all tariffs in order of creation date
  FOR tariff_record IN 
    SELECT 
      id,
      customer_id,
      carrier_ids,
      effective_date,
      COALESCE(is_blanket_tariff, false) as is_blanket_tariff,
      COALESCE(ownership_type, 'customer_direct') as ownership_type
    FROM tariffs
    ORDER BY created_date
  LOOP
    -- Generate new reference ID using the improved function
    new_ref_id := generate_tariff_reference_id(
      tariff_record.customer_id,
      tariff_record.carrier_ids,
      tariff_record.effective_date,
      tariff_record.is_blanket_tariff,
      tariff_record.ownership_type
    );
    
    -- Update the tariff with the new reference ID
    UPDATE tariffs
    SET tariff_reference_id = new_ref_id
    WHERE id = tariff_record.id;
    
    RAISE NOTICE 'Updated tariff % with new reference ID: %', tariff_record.id, new_ref_id;
  END LOOP;
END $$;
