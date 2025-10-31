/*
  # User Onboarding State

  ## Overview
  Tracks whether users have completed the onboarding tour and which step they're on.

  ## Tables
  1. New Table: `user_onboarding_state`
    - `id` (uuid, primary key) - Unique identifier
    - `user_id` (uuid, foreign key) - References auth.users
    - `onboarding_completed` (boolean) - Whether user completed tour
    - `current_step` (integer) - Current step in tour (0-based)
    - `skipped` (boolean) - Whether user skipped the tour
    - `completed_at` (timestamptz, nullable) - When tour was completed
    - `created_at` (timestamptz) - When record was created
    - `updated_at` (timestamptz) - Last update time

  ## Security
  - Enable RLS on user_onboarding_state table
  - Users can read and update their own onboarding state
  - Automatic creation via trigger when user profile is created

  ## Indexes
  - `user_id` for quick lookup
*/

-- Create user_onboarding_state table
CREATE TABLE IF NOT EXISTS user_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  onboarding_completed boolean DEFAULT false NOT NULL,
  current_step integer DEFAULT 0 NOT NULL,
  skipped boolean DEFAULT false NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_onboarding_state_user_id ON user_onboarding_state(user_id);

-- Enable RLS
ALTER TABLE user_onboarding_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own onboarding state"
  ON user_onboarding_state
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding state"
  ON user_onboarding_state
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding state"
  ON user_onboarding_state
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to create onboarding state for new users
CREATE OR REPLACE FUNCTION create_user_onboarding_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_onboarding_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create onboarding state when user profile is created
DROP TRIGGER IF EXISTS on_user_profile_created_onboarding ON user_profiles;
CREATE TRIGGER on_user_profile_created_onboarding
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_onboarding_state();

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_onboarding_timestamp ON user_onboarding_state;
CREATE TRIGGER update_onboarding_timestamp
  BEFORE UPDATE ON user_onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();