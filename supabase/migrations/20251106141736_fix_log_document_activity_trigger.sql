/*
  # Fix log_document_activity Trigger Function

  1. Changes
    - Replace references to `created_at` with `created_date` in log_document_activity function
    - The documents table uses `created_date` not `created_at`

  2. Security
    - No changes to security policies
    - Only fixes column reference in trigger function
*/

CREATE OR REPLACE FUNCTION log_document_activity()
RETURNS TRIGGER AS $$
DECLARE
  related_name TEXT;
BEGIN
  -- Log to customer if document is for a customer
  IF NEW.entity_type = 'customer' AND NEW.entity_id IS NOT NULL THEN
    SELECT name INTO related_name FROM customers WHERE id = NEW.entity_id;
    
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'customer',
      NEW.entity_id,
      'document_upload',
      'Document Uploaded: ' || COALESCE(NEW.file_name, 'Unknown'),
      'A new document was uploaded: ' || COALESCE(NEW.file_name, 'Unknown') || ' (' || COALESCE(NEW.document_type, 'general') || ')',
      jsonb_build_object(
        'document_id', NEW.id,
        'file_name', NEW.file_name,
        'document_type', NEW.document_type,
        'file_size', NEW.file_size,
        'mime_type', NEW.file_type
      ),
      NEW.created_date,
      NEW.user_id
    );
  END IF;

  -- Log to carrier if document is for a carrier
  IF NEW.entity_type = 'carrier' AND NEW.entity_id IS NOT NULL THEN
    SELECT name INTO related_name FROM carriers WHERE id = NEW.entity_id;
    
    INSERT INTO interactions (
      entity_type,
      entity_id,
      interaction_type,
      summary,
      details,
      metadata,
      created_date,
      user_id
    ) VALUES (
      'carrier',
      NEW.entity_id,
      'document_upload',
      'Document Uploaded: ' || COALESCE(NEW.file_name, 'Unknown'),
      'A new document was uploaded: ' || COALESCE(NEW.file_name, 'Unknown') || ' (' || COALESCE(NEW.document_type, 'general') || ')',
      jsonb_build_object(
        'document_id', NEW.id,
        'file_name', NEW.file_name,
        'document_type', NEW.document_type,
        'file_size', NEW.file_size,
        'mime_type', NEW.file_type
      ),
      NEW.created_date,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
