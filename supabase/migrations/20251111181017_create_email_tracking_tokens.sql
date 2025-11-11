/*
  # Create Email Tracking Token System

  1. New Tables
    - `freightops_thread_tokens`
      - Stores tracking tokens for email threads
      - Links tokens to CSP events, customers, and carriers
      - Enables reply tracking and thread association

  2. Security
    - Enable RLS on `freightops_thread_tokens` table
    - Add policies for authenticated users to create and read tokens
    - Users can read all tokens for visibility
    - Only token creators can update their tokens

  3. Indexes
    - Add index on token for fast lookups
    - Add index on thread_id for thread queries
    - Add indexes on foreign keys for performance
*/

CREATE TABLE IF NOT EXISTS freightops_thread_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  thread_id text NOT NULL,
  csp_event_id uuid REFERENCES csp_events(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  carrier_id uuid REFERENCES carriers(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_token ON freightops_thread_tokens(token);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_thread_id ON freightops_thread_tokens(thread_id);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_csp_event_id ON freightops_thread_tokens(csp_event_id);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_customer_id ON freightops_thread_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_carrier_id ON freightops_thread_tokens(carrier_id);
CREATE INDEX IF NOT EXISTS idx_freightops_thread_tokens_created_by ON freightops_thread_tokens(created_by);

ALTER TABLE freightops_thread_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create tracking tokens"
  ON freightops_thread_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can read all tracking tokens"
  ON freightops_thread_tokens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own tracking tokens"
  ON freightops_thread_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
