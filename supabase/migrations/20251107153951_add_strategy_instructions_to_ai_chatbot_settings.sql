/*
  # Add strategy instructions to AI chatbot settings

  1. Changes
    - Add strategy_instructions column to ai_chatbot_settings table
    - This allows customization of the AI strategy summary generation
    
  2. Notes
    - Field is optional (nullable)
    - When null/empty, default instructions will be used by the edge function
*/

-- Add strategy_instructions column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_chatbot_settings' AND column_name = 'strategy_instructions'
  ) THEN
    ALTER TABLE ai_chatbot_settings ADD COLUMN strategy_instructions text;
  END IF;
END $$;
