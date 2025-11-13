/*
  # Fix Award Carrier Function - Remove Non-Existent Date Columns

  1. Changes
    - Removes references to ce.effective_date and ce.expiry_date
    - These columns don't exist in csp_events table
    - Tariff dates will be set to NULL initially and can be updated later

  2. Security
    - No changes to security model
*/

CREATE OR REPLACE FUNCTION award_carrier_with_tariff(
  p_assignment_id uuid,
  p_awarded_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carrier_id uuid;
  v_carrier_name text;
  v_csp_event_id uuid;
  v_csp_title text;
  v_customer_id uuid;
  v_customer_name text;
  v_family_id uuid;
  v_tariff_id uuid;
  v_tariff_reference_id text;
  v_ownership_type text;
  v_mode text;
BEGIN
  -- Get assignment details
  SELECT
    cec.carrier_id,
    c.name,
    cec.csp_event_id,
    ce.title,
    ce.customer_id,
    cu.name,
    ce.ownership_type,
    ce.mode
  INTO
    v_carrier_id,
    v_carrier_name,
    v_csp_event_id,
    v_csp_title,
    v_customer_id,
    v_customer_name,
    v_ownership_type,
    v_mode
  FROM csp_event_carriers cec
  JOIN carriers c ON c.id = cec.carrier_id
  JOIN csp_events ce ON ce.id = cec.csp_event_id
  LEFT JOIN customers cu ON cu.id = ce.customer_id
  WHERE cec.id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Assignment not found');
  END IF;

  -- Update assignment to awarded
  UPDATE csp_event_carriers
  SET
    status = 'awarded',
    awarded_at = now(),
    awarded_by = p_awarded_by,
    updated_date = now()
  WHERE id = p_assignment_id;

  -- Resolve or create tariff family
  SELECT id INTO v_family_id
  FROM tariff_families
  WHERE customer_id = v_customer_id
    AND carrier_id = v_carrier_id
    AND ownership_type = v_ownership_type;

  IF v_family_id IS NULL THEN
    INSERT INTO tariff_families (
      customer_id,
      carrier_id,
      ownership_type,
      created_by,
      created_at
    ) VALUES (
      v_customer_id,
      v_carrier_id,
      v_ownership_type,
      p_awarded_by,
      now()
    )
    RETURNING id INTO v_family_id;
  END IF;

  -- Generate tariff reference ID using current date
  v_tariff_reference_id := generate_tariff_reference_id(
    v_customer_id,
    ARRAY[v_carrier_id],
    current_date
  );

  -- Create proposed tariff (dates can be set later when known)
  INSERT INTO tariffs (
    reference_id,
    family_id,
    customer_id,
    carrier_ids,
    status,
    ownership_type,
    effective_date,
    expiry_date,
    csp_event_id,
    mode,
    created_by,
    created_date,
    user_id
  ) VALUES (
    v_tariff_reference_id,
    v_family_id,
    v_customer_id,
    ARRAY[v_carrier_id],
    'proposed',
    v_ownership_type,
    NULL,  -- Can be set later
    NULL,  -- Can be set later
    v_csp_event_id,
    v_mode,
    p_awarded_by,
    now(),
    p_awarded_by
  )
  RETURNING id INTO v_tariff_id;

  -- Link tariff back to assignment
  UPDATE csp_event_carriers
  SET proposed_tariff_id = v_tariff_id
  WHERE id = p_assignment_id;

  -- Log to CSP event (via customer if exists)
  IF v_customer_id IS NOT NULL THEN
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'customer',
      v_customer_id,
      'csp_award',
      'Awarded ' || v_carrier_name || ' in CSP: ' || v_csp_title,
      'Proposed tariff ' || v_tariff_reference_id || ' created',
      jsonb_build_object(
        'csp_event_id', v_csp_event_id,
        'carrier_id', v_carrier_id,
        'carrier_name', v_carrier_name,
        'tariff_id', v_tariff_id,
        'tariff_reference_id', v_tariff_reference_id
      ),
      now(),
      p_awarded_by
    );
  END IF;

  -- Log to carrier
  INSERT INTO interactions (
    entity_type,
    entity_id,
    interaction_type,
    summary,
    details,
    metadata,
    created_date,
    user_id
  ) VALUES (
    'carrier',
    v_carrier_id,
    'csp_award',
    'Awarded in CSP: ' || v_csp_title,
    'Proposed tariff ' || v_tariff_reference_id || ' created for customer: ' || COALESCE(v_customer_name, 'Unknown'),
    jsonb_build_object(
      'csp_event_id', v_csp_event_id,
      'customer_id', v_customer_id,
      'customer_name', v_customer_name,
      'tariff_id', v_tariff_id,
      'tariff_reference_id', v_tariff_reference_id
    ),
    now(),
    p_awarded_by
  );

  -- Log to tariff activities
  INSERT INTO tariff_activities (
    tariff_id,
    activity_type,
    summary,
    details,
    metadata,
    created_by,
    created_at,
    csp_event_id
  ) VALUES (
    v_tariff_id,
    'created',
    'Proposed tariff created from CSP award',
    'Carrier ' || v_carrier_name || ' awarded in CSP event: ' || v_csp_title,
    jsonb_build_object(
      'csp_event_id', v_csp_event_id,
      'carrier_id', v_carrier_id,
      'customer_id', v_customer_id,
      'assignment_id', p_assignment_id
    ),
    p_awarded_by,
    now(),
    v_csp_event_id
  );

  -- Return success with tariff details
  RETURN jsonb_build_object(
    'success', true,
    'tariff_id', v_tariff_id,
    'tariff_reference_id', v_tariff_reference_id,
    'family_id', v_family_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;
