/*
  # Create User Pins System

  1. New Tables
    - `user_pins`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `pin_type` (text, enum: 'customer' | 'tariff_family')
      - `ref_id` (uuid, the ID of the pinned customer or tariff family)
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, pin_type, ref_id)

  2. Security
    - Enable RLS on `user_pins` table
    - Users can only manage their own pins

  3. Indexes
    - Index on (user_id, pin_type) for fast lookup
*/

-- Create user_pins table
CREATE TABLE IF NOT EXISTS user_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pin_type text NOT NULL CHECK (pin_type IN ('customer', 'tariff_family')),
  ref_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, pin_type, ref_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_pins_user_type ON user_pins(user_id, pin_type);

-- Enable RLS
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;

-- Users can view their own pins
CREATE POLICY "Users can view own pins"
  ON user_pins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own pins
CREATE POLICY "Users can create own pins"
  ON user_pins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own pins
CREATE POLICY "Users can delete own pins"
  ON user_pins FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);