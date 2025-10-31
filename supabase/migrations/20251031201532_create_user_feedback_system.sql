/*
  # User Feedback and Feature Request System

  ## Overview
  Allows users to submit feedback, bug reports, and feature requests with automatic context detection.

  ## Tables
  1. New Table: `user_feedback`
    - `id` (uuid, primary key) - Unique identifier
    - `user_id` (uuid, foreign key) - References auth.users
    - `feedback_type` (text) - Type: 'bug', 'feature_request', 'improvement', 'question', 'other'
    - `title` (text) - Brief title of the feedback
    - `description` (text) - Detailed description
    - `current_page` (text) - Page/location where feedback originated
    - `priority` (text) - User-indicated priority: 'low', 'medium', 'high', 'critical'
    - `status` (text) - Status: 'submitted', 'reviewing', 'planned', 'in_progress', 'completed', 'declined'
    - `admin_notes` (text, nullable) - Notes from admin review
    - `bolt_prompt_suggestion` (text, nullable) - AI-generated prompt suggestion
    - `created_at` (timestamptz) - When feedback was submitted
    - `updated_at` (timestamptz) - Last update time
    - `completed_at` (timestamptz, nullable) - When resolved

  ## Security
  - Enable RLS on user_feedback table
  - Users can create and view their own feedback
  - Admins can view and update all feedback

  ## Indexes
  - `user_id` for quick lookup
  - `feedback_type` for filtering
  - `status` for filtering
  - `created_at` for sorting
*/

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'feature_request', 'improvement', 'question', 'other')),
  title text NOT NULL,
  description text NOT NULL,
  current_page text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'planned', 'in_progress', 'completed', 'declined')),
  admin_notes text,
  bolt_prompt_suggestion text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own feedback"
  ON user_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
  ON user_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert own feedback"
  ON user_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update all feedback"
  ON user_feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IN ('completed', 'declined') AND OLD.status NOT IN ('completed', 'declined') THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_feedback_timestamp ON user_feedback;
CREATE TRIGGER update_feedback_timestamp
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();