/*
  # Add Recipient Type to Email Templates

  1. Changes
    - Add `recipient_type` column to `email_templates` table (customer/carrier/general)
    - Add `category` column for better organization (csp_loa, csp_progress, bid_invite, etc.)
    - Update existing templates with proper recipient types
    - Add new customer and carrier templates

  2. New Templates
    - Customer Templates (4): CSP Authorization Request, LOA Follow-Up, CSP Progress Update, CSP Results & Awards
    - Carrier Templates (3): Bid Participation Invite, Bid Reminder, Award Notification
*/

-- Add new columns to email_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'recipient_type'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN recipient_type text DEFAULT 'general';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'category'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN category text;
  END IF;
END $$;

-- Update existing templates
UPDATE email_templates 
SET recipient_type = 'general', category = 'general'
WHERE recipient_type IS NULL;

-- Delete old templates to replace with new ones
DELETE FROM email_templates WHERE is_system = true;

-- Insert new customer templates
INSERT INTO email_templates (template_key, name, recipient_type, category, subject_template, body_template, description, is_system) VALUES

-- Customer Templates
('csp_loa_request', 'CSP Authorization Request (LOA)', 'customer', 'csp_loa', 
'Rocketshipping | Authorization Request to Run Your CSP Bid', 
'Hi {{customerName}},

We''d like to run a CSP (Carrier Service Procurement) bid on your behalf to analyze your current LTL and Full-Mile Home Delivery network.
Before we can access lane and spend data, we''ll need your signed Letter of Authorization (LOA).

Please review and return the attached LOA. Once received, we''ll begin pulling carrier data and preparing your opportunity summary.

Thank you for partnering with Rocketshipping — this process typically identifies new savings and improved coverage.

Best regards,
{{senderName}}
Customer Pricing | Rocketshipping',
'Request LOA from customer to begin CSP bid process', true),

('csp_loa_followup', 'LOA Follow-Up', 'customer', 'csp_loa',
'Rocketshipping | Quick Follow-Up: CSP Authorization Still Needed',
'Hi {{customerName}},

Just checking in — we''re ready to begin your CSP bid but still need your signed LOA to proceed.
If you''ve already sent it, thank you! If not, I''ve re-attached the form for convenience.

Once received, we''ll start data collection and confirm next steps.

Thanks again,
{{senderName}}',
'Follow up with customer for pending LOA', true),

('csp_progress_update', 'CSP Progress Update', 'customer', 'csp_progress',
'Rocketshipping | CSP Bid Progress Update – {{customerName}}',
'Hi {{customerName}},

Here''s a quick status update on your CSP bid:

• Participating Carriers: {{carrierCount}}
• Bid Phase: {{bidPhase}}
• Expected Completion: {{completionDate}}

We''ll share final recommendations as soon as carrier responses are complete.

Best,
{{senderName}}',
'Provide status update to customer on CSP bid progress', true),

('csp_results_awards', 'CSP Results & Awards', 'customer', 'csp_awards',
'Rocketshipping | CSP Results & Award Summary – {{customerName}}',
'Hi {{customerName}},

We''ve completed your CSP bid and are pleased to share the results:

• Awarded Carriers: {{awardedCarriers}}
• Estimated Savings: {{estimatedSavings}}
• Effective Date: {{effectiveDate}}

Your awarded tariffs are attached for review. Once approved, we''ll proceed with carrier activation and implementation.

Thank you for trusting Rocketshipping with your carrier strategy,
{{senderName}}',
'Share final CSP bid results and awards with customer', true),

-- Carrier Templates
('bid_participation_invite', 'Bid Participation Invite', 'carrier', 'bid_invite',
'Rocketshipping | Invitation to Participate – {{customerName}} CSP Bid',
'Hi {{carrierName}},

Rocketshipping is running a CSP bid for {{customerName}}''s {{mode}} network and we''d like to invite your team to participate.

Key Details:
• Bid Opens: {{bidOpenDate}}
• Bid Closes: {{bidCloseDate}}
• Mode: {{mode}}
• Contact: {{senderName}} / {{senderEmail}}

Attached are bid instructions and data files.
Please confirm participation by replying to this email or uploading your file in the FreightOps portal.

Thank you,
{{senderName}}
Carrier Relations | Rocketshipping',
'Invite carrier to participate in CSP bid', true),

('bid_reminder', 'Bid Reminder', 'carrier', 'bid_reminder',
'Rocketshipping | Reminder – {{customerName}} CSP Bid Due {{dueDate}}',
'Hi {{carrierName}},

A quick reminder that the CSP bid for {{customerName}} closes on {{dueDate}}.
If you''ve already submitted, thank you! If not, please ensure your file is uploaded before the deadline.

Let us know if you need clarification on any lanes or service requirements.

Best,
{{senderName}}',
'Remind carrier of upcoming CSP bid deadline', true),

('award_notification', 'Award Notification & Tariff Publication', 'carrier', 'bid_award',
'Rocketshipping | Award Notification – {{customerName}} CSP Results',
'Hi {{carrierName}},

Congratulations — your bid for {{customerName}} has been awarded for the following lanes:

{{awardedLanes}}

The awarded tariff is now published in the Rocketshipping FreightOps portal.
Please review and confirm receipt; implementation begins on {{startDate}}.

Thank you for your continued partnership,
{{senderName}}',
'Notify carrier of CSP bid award', true),

-- General Templates
('general_followup', 'General Follow Up', 'general', 'general',
'Rocketshipping | Re: {{contextTitle}}',
'Hi {{recipientName}},

I wanted to follow up on our previous discussion regarding {{contextTitle}}.

{{notes}}

Looking forward to hearing from you.

Best regards,
{{senderName}}',
'Use for general follow-up communications', true),

('general_message', 'General Message', 'general', 'general',
'Rocketshipping | {{context}}',
'Hi {{recipientName}},

{{message}}

Best regards,
{{senderName}}',
'Use for general communications', true)

ON CONFLICT (template_key) DO NOTHING;
