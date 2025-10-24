/*
  # Create Email Templates Table

  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name/label
      - `template_key` (text, unique) - Key used in code (e.g., 'new_csp_request')
      - `subject_template` (text) - Subject line template with variables
      - `body_template` (text) - Email body template with variables
      - `description` (text) - Description of when to use this template
      - `is_system` (boolean) - Whether this is a system template (can't be deleted)
      - `created_by` (uuid) - User who created the template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `email_templates` table
    - Add policies for authenticated users to read all templates
    - Add policies for admin and elite roles to manage templates
*/

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_key text UNIQUE NOT NULL,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and elite can insert email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  );

CREATE POLICY "Admin and elite can update email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  );

CREATE POLICY "Admin and elite can delete non-system templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (
    is_system = false
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'elite')
    )
  );

-- Insert default email templates
INSERT INTO email_templates (template_key, name, subject_template, body_template, description, is_system) VALUES
('new_csp_request', 'New CSP Request', 'Carrier Service Provider Review - {{customerName}}', 'Hi {{recipientName}},

I hope this message finds you well.

We''re conducting a Carrier Service Provider review for {{customerName}} and would like to invite you to participate in our RFP process.

{{cspDescription}}

Please let me know if you''re interested in submitting a proposal.

Best regards', 'Use when inviting carriers to participate in a new CSP/RFP process', true),

('follow_up', 'Follow Up', 'Re: {{contextTitle}}', 'Hi {{recipientName}},

I wanted to follow up on our previous discussion regarding {{contextTitle}}.

{{notes}}

Looking forward to hearing from you.

Best regards', 'Use for general follow-up communications', true),

('rate_request', 'Rate Request', 'Rate Request - {{customerName}} - {{mode}}', 'Hi {{recipientName}},

We''re seeking competitive rate proposals for {{customerName}}.

Service Details:
- Mode: {{mode}}
- Customer: {{customerName}}
{{additionalDetails}}

Please provide your best rates at your earliest convenience.

Best regards', 'Use when requesting rate proposals from carriers', true),

('status_update', 'Status Update', 'Update: {{contextTitle}}', 'Hi {{recipientName}},

I wanted to provide you with an update on {{contextTitle}}.

{{updateDetails}}

Let me know if you have any questions.

Best regards', 'Use for providing status updates on projects or negotiations', true),

('general', 'General Message', 'Re: {{context}}', 'Hi {{recipientName}},

{{message}}

Best regards', 'Use for general communications', true)
ON CONFLICT (template_key) DO NOTHING;
