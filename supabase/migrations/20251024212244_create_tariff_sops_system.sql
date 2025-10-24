/*
  # Create Tariff SOP (Standard Operating Procedures) System

  1. Overview
    - Enables documentation and collaboration space for tariff families
    - Supports both document uploads and rich-text notes
    - Tracks revision history and visibility settings
    - Integrates with activity tracking

  2. New Tables
    
    ### `tariff_sops`
    - `id` (uuid, primary key) - Unique identifier
    - `tariff_id` (uuid, foreign key) - References tariffs table (can be family or version)
    - `tariff_family_id` (uuid, nullable) - Direct reference to family for family-wide SOPs
    - `title` (text) - SOP title/name
    - `type` (text) - 'document' or 'note'
    - `content` (text, nullable) - Rich text content for notes
    - `document_url` (text, nullable) - URL to uploaded document
    - `document_type` (text, nullable) - File extension (pdf, docx, xlsx, etc)
    - `visibility` (text) - 'internal' or 'shared'
    - `version` (integer) - Version number for tracking revisions
    - `created_by` (uuid, foreign key) - User who created the SOP
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
    - `user_id` (uuid, foreign key) - Owner/tenant
    - `metadata` (jsonb) - Additional context (carrier contacts, etc)

    ### `tariff_sop_revisions`
    - `id` (uuid, primary key) - Unique identifier
    - `sop_id` (uuid, foreign key) - References tariff_sops
    - `version` (integer) - Version number
    - `title` (text) - Title at this version
    - `content` (text, nullable) - Content at this version
    - `document_url` (text, nullable) - Document URL at this version
    - `changed_by` (uuid, foreign key) - User who made the change
    - `changed_at` (timestamptz) - When the change occurred
    - `change_notes` (text) - Description of changes

  3. Activity Tracking
    - Add new activity types: sop_added, sop_updated, sop_deleted
    - Automatically log SOP changes to tariff activity timeline

  4. Security
    - Enable RLS on all tables
    - Users can view SOPs for tariffs they have access to
    - Only creators and admins can update/delete SOPs
    - Shared SOPs visible to carrier contacts (future portal integration)
*/

-- Create tariff_sops table
CREATE TABLE IF NOT EXISTS tariff_sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id uuid REFERENCES tariffs(id) ON DELETE CASCADE,
  tariff_family_id text,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('document', 'note')),
  content text,
  document_url text,
  document_type text,
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'shared')),
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create tariff_sop_revisions table
CREATE TABLE IF NOT EXISTS tariff_sop_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid NOT NULL REFERENCES tariff_sops(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  content text,
  document_url text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_notes text DEFAULT ''
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tariff_sops_tariff ON tariff_sops(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sops_family ON tariff_sops(tariff_family_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sops_user ON tariff_sops(user_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sops_created ON tariff_sops(created_at);
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_sop ON tariff_sop_revisions(sop_id);
CREATE INDEX IF NOT EXISTS idx_tariff_sop_revisions_version ON tariff_sop_revisions(sop_id, version);

-- Enable RLS
ALTER TABLE tariff_sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_sop_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tariff_sops

-- Users can view SOPs for their tariffs
CREATE POLICY "Users can view their SOPs"
  ON tariff_sops
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Mock user can view mock SOPs
CREATE POLICY "Mock user can view mock SOPs"
  ON tariff_sops
  FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Users can create SOPs
CREATE POLICY "Users can create SOPs"
  ON tariff_sops
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Mock user can create SOPs
CREATE POLICY "Mock user can create mock SOPs"
  ON tariff_sops
  FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Users can update their own SOPs
CREATE POLICY "Users can update their SOPs"
  ON tariff_sops
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Mock user can update mock SOPs
CREATE POLICY "Mock user can update mock SOPs"
  ON tariff_sops
  FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Users can delete their own SOPs
CREATE POLICY "Users can delete their SOPs"
  ON tariff_sops
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Mock user can delete mock SOPs
CREATE POLICY "Mock user can delete mock SOPs"
  ON tariff_sops
  FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- RLS Policies for tariff_sop_revisions

-- Users can view revisions for SOPs they can access
CREATE POLICY "Users can view SOP revisions"
  ON tariff_sop_revisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tariff_sops
      WHERE tariff_sops.id = tariff_sop_revisions.sop_id
      AND tariff_sops.user_id = auth.uid()
    )
  );

-- Mock user can view mock revisions
CREATE POLICY "Mock user can view mock SOP revisions"
  ON tariff_sop_revisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tariff_sops
      WHERE tariff_sops.id = tariff_sop_revisions.sop_id
      AND tariff_sops.user_id = '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- System creates revisions (via trigger)
CREATE POLICY "System can create revisions"
  ON tariff_sop_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to create revision on SOP update
CREATE OR REPLACE FUNCTION create_sop_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create revision if content actually changed
  IF (OLD.title IS DISTINCT FROM NEW.title) OR
     (OLD.content IS DISTINCT FROM NEW.content) OR
     (OLD.document_url IS DISTINCT FROM NEW.document_url) THEN
    
    -- Increment version
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();
    
    -- Create revision record
    INSERT INTO tariff_sop_revisions (
      sop_id,
      version,
      title,
      content,
      document_url,
      changed_by,
      changed_at
    ) VALUES (
      OLD.id,
      OLD.version,
      OLD.title,
      OLD.content,
      OLD.document_url,
      auth.uid(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to create revisions
DROP TRIGGER IF EXISTS on_tariff_sop_update ON tariff_sops;
CREATE TRIGGER on_tariff_sop_update
  BEFORE UPDATE ON tariff_sops
  FOR EACH ROW
  EXECUTE FUNCTION create_sop_revision();

-- Function to log SOP activity
CREATE OR REPLACE FUNCTION log_sop_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_type text;
  activity_description text;
  tariff_record record;
BEGIN
  -- Determine activity type
  IF TG_OP = 'INSERT' THEN
    activity_type := 'sop_added';
    activity_description := 'SOP "' || NEW.title || '" added';
  ELSIF TG_OP = 'UPDATE' THEN
    activity_type := 'sop_updated';
    activity_description := 'SOP "' || NEW.title || '" updated to v' || NEW.version::text;
  ELSIF TG_OP = 'DELETE' THEN
    activity_type := 'sop_deleted';
    activity_description := 'SOP "' || OLD.title || '" deleted';
  END IF;
  
  -- Get tariff details for activity log
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO tariff_record FROM tariffs WHERE id = OLD.tariff_id;
  ELSE
    SELECT * INTO tariff_record FROM tariffs WHERE id = NEW.tariff_id;
  END IF;
  
  -- Log to tariff_activity if tariff exists
  IF tariff_record.id IS NOT NULL THEN
    INSERT INTO tariff_activity (
      tariff_id,
      activity_type,
      description,
      user_id,
      metadata
    ) VALUES (
      tariff_record.id,
      activity_type,
      activity_description,
      COALESCE(auth.uid(), (CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END)),
      jsonb_build_object(
        'sop_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        'sop_type', CASE WHEN TG_OP = 'DELETE' THEN OLD.type ELSE NEW.type END,
        'visibility', CASE WHEN TG_OP = 'DELETE' THEN OLD.visibility ELSE NEW.visibility END
      )
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Triggers to log SOP activity
DROP TRIGGER IF EXISTS on_tariff_sop_activity ON tariff_sops;
CREATE TRIGGER on_tariff_sop_activity
  AFTER INSERT OR UPDATE OR DELETE ON tariff_sops
  FOR EACH ROW
  EXECUTE FUNCTION log_sop_activity();