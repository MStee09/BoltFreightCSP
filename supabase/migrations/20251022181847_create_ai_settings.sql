/*
  # Create AI Chatbot Settings Table

  1. New Tables
    - `ai_chatbot_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, can be null for org-wide settings)
      - `organization_id` (text, for multi-tenant support)
      - `instructions` (text, custom instructions for the AI)
      - `knowledge_base` (text, custom knowledge base content)
      - `temperature` (numeric, controls AI creativity, default 0.7)
      - `max_tokens` (integer, max response length, default 1000)
      - `is_active` (boolean, whether these settings are active)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `ai_chatbot_settings` table
    - Add policies for authenticated users to manage their own settings
    - Add policy for reading organization-wide settings
*/

CREATE TABLE IF NOT EXISTS ai_chatbot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id text,
  instructions text DEFAULT 'You are a helpful logistics and procurement analyst. Provide clear, actionable insights based on the shipment data.',
  knowledge_base text DEFAULT '',
  temperature numeric DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens integer DEFAULT 1000 CHECK (max_tokens > 0 AND max_tokens <= 4000),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_chatbot_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own settings
CREATE POLICY "Users can read own AI settings"
  ON ai_chatbot_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own settings
CREATE POLICY "Users can insert own AI settings"
  ON ai_chatbot_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own settings
CREATE POLICY "Users can update own AI settings"
  ON ai_chatbot_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own settings
CREATE POLICY "Users can delete own AI settings"
  ON ai_chatbot_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can read organization-wide settings (where user_id is null)
CREATE POLICY "Users can read org-wide AI settings"
  ON ai_chatbot_settings
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_chatbot_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_chatbot_settings_updated_at
  BEFORE UPDATE ON ai_chatbot_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chatbot_settings_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_chatbot_settings_user_id ON ai_chatbot_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chatbot_settings_active ON ai_chatbot_settings(is_active) WHERE is_active = true;
