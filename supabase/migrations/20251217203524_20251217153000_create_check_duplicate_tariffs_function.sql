/*
  # Create Tariff Duplicate Detection Function

  1. New Function
    - `check_duplicate_tariffs` - Checks for similar active tariffs
    - Parameters:
      - p_customer_id: UUID of the customer
      - p_carrier_id: UUID of the carrier
      - p_effective_date: Proposed effective date
      - p_expiry_date: Proposed expiry date
      - p_ownership_type: Type of ownership (rocket_blanket, priority_1, priority_2, priority_3, etc)

  2. Detection Logic
    - Direct duplicates: Same customer, same carrier, overlapping dates
    - Blanket coverage: Active blanket tariffs that include this customer
    - Parent blanket coverage: Rocket/Priority 1 blankets that would cover this customer
    - Date proximity: Similar tariffs within 30 days of proposed dates

  3. Returns
    - JSON array of similar tariffs with details and similarity reasons
    - Only checks active tariffs
*/

CREATE OR REPLACE FUNCTION check_duplicate_tariffs(
  p_customer_id UUID,
  p_carrier_id UUID,
  p_effective_date DATE,
  p_expiry_date DATE,
  p_ownership_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_similar_tariffs JSON;
  v_customer_ownership TEXT;
BEGIN
  -- Get the customer's ownership type if not provided
  IF p_ownership_type IS NULL THEN
    SELECT ownership_type INTO v_customer_ownership
    FROM customers
    WHERE id = p_customer_id;
  ELSE
    v_customer_ownership := p_ownership_type;
  END IF;

  -- Find similar active tariffs
  WITH similar_tariffs AS (
    SELECT
      t.id,
      t.tariff_reference_id,
      t.carrier_id,
      t.effective_date,
      t.expiry_date,
      t.ownership_type,
      t.customer_ids,
      t.status,
      c.carrier_name,
      c.scac_code,
      CASE
        -- Direct duplicate: same customer and carrier with overlapping dates
        WHEN p_customer_id = ANY(t.customer_ids)
          AND t.carrier_id = p_carrier_id
          AND t.effective_date <= p_expiry_date
          AND t.expiry_date >= p_effective_date
        THEN 'direct_duplicate'

        -- Blanket coverage: this customer is already in a blanket tariff for this carrier
        WHEN t.ownership_type IN ('rocket_blanket', 'priority_1_blanket', 'priority_2_blanket', 'priority_3_blanket')
          AND t.carrier_id = p_carrier_id
          AND p_customer_id = ANY(t.customer_ids)
          AND t.effective_date <= p_expiry_date
          AND t.expiry_date >= p_effective_date
        THEN 'blanket_customer_coverage'

        -- Rocket blanket coverage: Rocket blanket exists for carrier and customer is Rocket
        WHEN t.ownership_type = 'rocket_blanket'
          AND t.carrier_id = p_carrier_id
          AND v_customer_ownership IN ('rocket_shipping', 'rocket_blanket')
          AND t.effective_date <= p_expiry_date
          AND t.expiry_date >= p_effective_date
        THEN 'rocket_blanket_coverage'

        -- Priority 1 blanket coverage: Priority 1 blanket exists for carrier and customer is Priority 1
        WHEN t.ownership_type = 'priority_1_blanket'
          AND t.carrier_id = p_carrier_id
          AND v_customer_ownership IN ('priority_1', 'priority_1_blanket')
          AND t.effective_date <= p_expiry_date
          AND t.expiry_date >= p_effective_date
        THEN 'priority_1_blanket_coverage'

        -- Date proximity: same customer and carrier with nearby dates (within 30 days)
        WHEN p_customer_id = ANY(t.customer_ids)
          AND t.carrier_id = p_carrier_id
          AND (
            ABS(EXTRACT(days FROM (t.effective_date - p_effective_date))) <= 30
            OR ABS(EXTRACT(days FROM (t.expiry_date - p_expiry_date))) <= 30
          )
        THEN 'date_proximity'

        ELSE NULL
      END as similarity_type,
      CASE
        WHEN p_customer_id = ANY(t.customer_ids)
          AND t.carrier_id = p_carrier_id
          AND t.effective_date <= p_expiry_date
          AND t.expiry_date >= p_effective_date
        THEN 'Exact duplicate: Same customer and carrier with overlapping dates'

        WHEN t.ownership_type IN ('rocket_blanket', 'priority_1_blanket', 'priority_2_blanket', 'priority_3_blanket')
          AND t.carrier_id = p_carrier_id
          AND p_customer_id = ANY(t.customer_ids)
        THEN 'This customer is already covered by a blanket tariff for this carrier'

        WHEN t.ownership_type = 'rocket_blanket'
          AND t.carrier_id = p_carrier_id
          AND v_customer_ownership IN ('rocket_shipping', 'rocket_blanket')
        THEN 'Rocket customers may be covered by this Rocket blanket tariff'

        WHEN t.ownership_type = 'priority_1_blanket'
          AND t.carrier_id = p_carrier_id
          AND v_customer_ownership IN ('priority_1', 'priority_1_blanket')
        THEN 'Priority 1 customers may be covered by this Priority 1 blanket tariff'

        WHEN p_customer_id = ANY(t.customer_ids)
          AND t.carrier_id = p_carrier_id
        THEN 'Similar tariff with nearby dates for this customer and carrier'

        ELSE 'Similar tariff found'
      END as reason,
      -- Calculate date overlap details
      CASE
        WHEN t.effective_date <= p_expiry_date AND t.expiry_date >= p_effective_date
        THEN json_build_object(
          'overlap', true,
          'overlap_start', GREATEST(t.effective_date, p_effective_date),
          'overlap_end', LEAST(t.expiry_date, p_expiry_date)
        )
        ELSE json_build_object('overlap', false)
      END as date_overlap
    FROM tariffs t
    LEFT JOIN carriers c ON c.id = t.carrier_id
    WHERE t.status = 'active'
      AND t.carrier_id = p_carrier_id
      AND (
        -- Check for direct duplicates
        (p_customer_id = ANY(t.customer_ids)
          AND t.effective_date <= p_expiry_date
          AND t.expiry_date >= p_effective_date)

        -- Check for blanket coverage
        OR (t.ownership_type IN ('rocket_blanket', 'priority_1_blanket', 'priority_2_blanket', 'priority_3_blanket')
          AND (
            p_customer_id = ANY(t.customer_ids)
            OR (t.ownership_type = 'rocket_blanket' AND v_customer_ownership IN ('rocket_shipping', 'rocket_blanket'))
            OR (t.ownership_type = 'priority_1_blanket' AND v_customer_ownership IN ('priority_1', 'priority_1_blanket'))
          )
          AND t.effective_date <= p_expiry_date
          AND t.expiry_date >= p_effective_date)

        -- Check for date proximity
        OR (p_customer_id = ANY(t.customer_ids)
          AND (
            ABS(EXTRACT(days FROM (t.effective_date - p_effective_date))) <= 30
            OR ABS(EXTRACT(days FROM (t.expiry_date - p_expiry_date))) <= 30
          ))
      )
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'tariff_reference_id', tariff_reference_id,
      'carrier_id', carrier_id,
      'carrier_name', carrier_name,
      'scac_code', scac_code,
      'effective_date', effective_date,
      'expiry_date', expiry_date,
      'ownership_type', ownership_type,
      'status', status,
      'similarity_type', similarity_type,
      'reason', reason,
      'date_overlap', date_overlap,
      'customer_count', COALESCE(array_length(customer_ids, 1), 0)
    ) ORDER BY
      CASE similarity_type
        WHEN 'direct_duplicate' THEN 1
        WHEN 'blanket_customer_coverage' THEN 2
        WHEN 'rocket_blanket_coverage' THEN 3
        WHEN 'priority_1_blanket_coverage' THEN 4
        WHEN 'date_proximity' THEN 5
        ELSE 6
      END,
      effective_date DESC
  )
  INTO v_similar_tariffs
  FROM similar_tariffs
  WHERE similarity_type IS NOT NULL;

  RETURN COALESCE(v_similar_tariffs, '[]'::json);
END;
$$;