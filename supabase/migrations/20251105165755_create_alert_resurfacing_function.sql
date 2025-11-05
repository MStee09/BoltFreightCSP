/*
  # Create Alert Resurfacing Function
  
  1. New Function
    - `resurface_dismissed_alerts()` - Automatically reactivates dismissed alerts after 24 hours
    
  2. Purpose
    - Called when querying alerts to check if any dismissed alerts should be reactivated
    - Updates alerts where dismissed_until has passed
    - Clears dismissal fields so alert appears as active again
*/

-- Function to resurface dismissed alerts that have passed their dismissal period
CREATE OR REPLACE FUNCTION resurface_dismissed_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reactivate dismissed alerts where the dismissed_until time has passed
  UPDATE alerts
  SET 
    status = 'active',
    dismissed_at = NULL,
    dismissed_by = NULL,
    dismissed_until = NULL
  WHERE 
    status = 'dismissed'
    AND dismissed_until IS NOT NULL
    AND dismissed_until <= NOW();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION resurface_dismissed_alerts() TO authenticated;

COMMENT ON FUNCTION resurface_dismissed_alerts() IS 'Automatically reactivates dismissed alerts after their 24-hour dismissal period has expired';
