/*
  # Backfill Creation Activities for Existing Entities
  
  ## Overview
  This migration creates "Created" activities for all existing entities that were created
  before we added activity tracking triggers. This gives a complete history.
  
  ## What Gets Backfilled
  1. All existing customers → "Customer Created" activity
  2. All existing carriers → "Carrier Created" activity
  3. All existing CSP events → "CSP Event Created" activity
  4. All existing tariffs → "Tariff Created" activity
  
  ## Notes
  - Uses the entity's created_date as the activity timestamp
  - Uses mock user ID for system-generated backfill records
  - Only backfills entities that don't already have a "create" activity
*/

-- ========================================
-- BACKFILL CUSTOMER CREATION ACTIVITIES
-- ========================================

INSERT INTO interactions (
  entity_type,
  entity_id,
  interaction_type,
  summary,
  details,
  metadata,
  created_date,
  user_id
)
SELECT
  'customer',
  c.id,
  'create',
  'Customer Created',
  'Customer "' || c.name || '" was created' || 
  CASE 
    WHEN c.segment IS NOT NULL THEN ' with segment: ' || c.segment
    ELSE ''
  END,
  jsonb_build_object(
    'customer_id', c.id,
    'customer_name', c.name,
    'segment', c.segment,
    'status', c.status,
    'backfilled', true
  ),
  COALESCE(c.created_date, NOW()),
  'a0000000-0000-0000-0000-000000000001'::uuid  -- Mock user for system records
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM interactions i
  WHERE i.entity_id = c.id
    AND i.entity_type = 'customer'
    AND i.interaction_type = 'create'
);

-- ========================================
-- BACKFILL CARRIER CREATION ACTIVITIES
-- ========================================

INSERT INTO interactions (
  entity_type,
  entity_id,
  interaction_type,
  summary,
  details,
  metadata,
  created_date,
  user_id
)
SELECT
  'carrier',
  cr.id,
  'create',
  'Carrier Created',
  'Carrier "' || cr.name || '" was created' ||
  CASE 
    WHEN cr.scac_code IS NOT NULL THEN ' (SCAC: ' || cr.scac_code || ')'
    ELSE ''
  END,
  jsonb_build_object(
    'carrier_id', cr.id,
    'carrier_name', cr.name,
    'scac_code', cr.scac_code,
    'service_type', cr.service_type,
    'backfilled', true
  ),
  COALESCE(cr.created_date, NOW()),
  'a0000000-0000-0000-0000-000000000001'::uuid
FROM carriers cr
WHERE NOT EXISTS (
  SELECT 1 FROM interactions i
  WHERE i.entity_id = cr.id
    AND i.entity_type = 'carrier'
    AND i.interaction_type = 'create'
);

-- ========================================
-- BACKFILL CSP EVENT CREATION ACTIVITIES
-- ========================================

INSERT INTO interactions (
  entity_type,
  entity_id,
  interaction_type,
  summary,
  details,
  metadata,
  created_date,
  user_id
)
SELECT
  'customer',
  ce.customer_id,
  'csp_event',
  'CSP Event Created: ' || ce.title,
  'New CSP event "' || ce.title || '" was created' ||
  CASE 
    WHEN ce.mode IS NOT NULL THEN ' for ' || ce.mode
    ELSE ''
  END,
  jsonb_build_object(
    'csp_event_id', ce.id,
    'csp_title', ce.title,
    'mode', ce.mode,
    'ownership_type', ce.ownership_type,
    'customer_id', ce.customer_id,
    'backfilled', true
  ),
  COALESCE(ce.created_date, NOW()),
  'a0000000-0000-0000-0000-000000000001'::uuid
FROM csp_events ce
WHERE ce.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM interactions i
    WHERE i.entity_id = ce.customer_id
      AND i.entity_type = 'customer'
      AND i.interaction_type = 'csp_event'
      AND i.metadata->>'csp_event_id' = ce.id::text
      AND i.summary LIKE 'CSP Event Created:%'
  );

-- ========================================
-- BACKFILL TARIFF CREATION ACTIVITIES
-- ========================================

-- Backfill to customer timelines
INSERT INTO interactions (
  entity_type,
  entity_id,
  interaction_type,
  summary,
  details,
  metadata,
  created_date,
  user_id
)
SELECT
  'customer',
  t.customer_id,
  'tariff',
  'Tariff Created: ' || COALESCE(t.tariff_reference_id, 'Tariff'),
  'New tariff ' || COALESCE(t.tariff_reference_id, '') || ' created with ' || COALESCE(car.name, 'carrier'),
  jsonb_build_object(
    'tariff_id', t.id,
    'tariff_reference_id', t.tariff_reference_id,
    'status', t.status,
    'ownership_type', t.ownership_type,
    'carrier_id', t.carrier_id,
    'customer_id', t.customer_id,
    'backfilled', true
  ),
  COALESCE(t.created_date, NOW()),
  'a0000000-0000-0000-0000-000000000001'::uuid
FROM tariffs t
LEFT JOIN carriers car ON car.id = t.carrier_id
WHERE t.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM interactions i
    WHERE i.entity_id = t.customer_id
      AND i.entity_type = 'customer'
      AND i.interaction_type = 'tariff'
      AND i.metadata->>'tariff_id' = t.id::text
      AND i.summary LIKE 'Tariff Created:%'
  );

-- Backfill to carrier timelines
INSERT INTO interactions (
  entity_type,
  entity_id,
  interaction_type,
  summary,
  details,
  metadata,
  created_date,
  user_id
)
SELECT
  'carrier',
  t.carrier_id,
  'tariff',
  'Tariff Created: ' || COALESCE(t.tariff_reference_id, 'Tariff'),
  'New tariff ' || COALESCE(t.tariff_reference_id, '') || ' created for ' || COALESCE(cust.name, 'customer'),
  jsonb_build_object(
    'tariff_id', t.id,
    'tariff_reference_id', t.tariff_reference_id,
    'status', t.status,
    'ownership_type', t.ownership_type,
    'carrier_id', t.carrier_id,
    'customer_id', t.customer_id,
    'backfilled', true
  ),
  COALESCE(t.created_date, NOW()),
  'a0000000-0000-0000-0000-000000000001'::uuid
FROM tariffs t
LEFT JOIN customers cust ON cust.id = t.customer_id
WHERE t.carrier_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM interactions i
    WHERE i.entity_id = t.carrier_id
      AND i.entity_type = 'carrier'
      AND i.interaction_type = 'tariff'
      AND i.metadata->>'tariff_id' = t.id::text
      AND i.summary LIKE 'Tariff Created:%'
  );
