/*
  # Add Document Metadata and AI Summary Support

  1. Changes to documents table
    - Add `data_range_start` (date, nullable) - Start date of data in the file
    - Add `data_range_end` (date, nullable) - End date of data in the file
    - Add `version` (integer, default 1) - Version number for file revisions
    - Add `ai_processing_status` (text, default 'pending') - Status: pending, processing, completed, failed
    - Add `ai_summary` (text, nullable) - AI-generated summary of the file contents
    - Add `ai_summary_generated_at` (timestamptz, nullable) - When the AI summary was created
    
  2. New document_type values
    - 'transaction_detail' - Transaction/shipment detail files
    - 'lost_opportunity' - Lost opportunity files
    - 'summary' - AI-generated summary reports
    - 'general' - Other documents

  3. New csp_events fields
    - Add `strategy_summary` (jsonb, default '{}') - Stores AI-generated topline summary with metadata
    - Add `strategy_summary_updated_at` (timestamptz, nullable) - When the summary was last updated
    
  4. Notes
    - Existing documents will retain their current structure
    - New fields are nullable to support backwards compatibility
    - AI processing happens asynchronously after upload
*/

-- Add new columns to documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'data_range_start'
  ) THEN
    ALTER TABLE documents ADD COLUMN data_range_start date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'data_range_end'
  ) THEN
    ALTER TABLE documents ADD COLUMN data_range_end date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'version'
  ) THEN
    ALTER TABLE documents ADD COLUMN version integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ai_processing_status'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_processing_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ai_summary'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_summary text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ai_summary_generated_at'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_summary_generated_at timestamptz;
  END IF;
END $$;

-- Add strategy summary fields to csp_events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'strategy_summary'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN strategy_summary jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csp_events' AND column_name = 'strategy_summary_updated_at'
  ) THEN
    ALTER TABLE csp_events ADD COLUMN strategy_summary_updated_at timestamptz;
  END IF;
END $$;

-- Create index for faster document queries by version
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(entity_id, document_type, version DESC);

-- Create index for AI processing status
CREATE INDEX IF NOT EXISTS idx_documents_ai_status ON documents(ai_processing_status) WHERE ai_processing_status != 'completed';
