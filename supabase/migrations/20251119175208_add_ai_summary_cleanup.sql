/*
  # Add AI Summary Automatic Cleanup
  
  1. New Function
    - `cleanup_old_ai_summaries()` - Removes AI summaries and chat history older than 24 hours
    
  2. Purpose
    - Automatically clean up cached AI content to save space
    - Summaries can be regenerated on demand when needed
    - Prevents database bloat from stored AI responses
    
  3. Scheduling
    - Function can be called manually or scheduled via cron job
    - Clears `ai_summary` and `ai_summary_generated_at` fields for tariffs older than 1 day
*/

-- Create function to cleanup old AI summaries
CREATE OR REPLACE FUNCTION cleanup_old_ai_summaries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear AI summaries older than 24 hours
  UPDATE tariffs
  SET 
    ai_summary = NULL,
    ai_summary_generated_at = NULL
  WHERE 
    ai_summary IS NOT NULL 
    AND ai_summary_generated_at < NOW() - INTERVAL '24 hours';
    
  RAISE NOTICE 'Cleaned up AI summaries older than 24 hours';
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION cleanup_old_ai_summaries() IS 
'Automatically removes AI-generated summaries older than 24 hours to prevent database bloat. Summaries can be regenerated on demand.';
