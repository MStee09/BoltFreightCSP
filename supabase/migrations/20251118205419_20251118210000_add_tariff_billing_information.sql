/*
  # Add Billing Information to Tariffs

  1. Purpose
    - Add billing contact and address information to tariffs
    - Essential for invoice routing and payment processing
    - Tracks who should receive invoices for each tariff

  2. New Fields
    - billing_company_name: Company name for billing
    - billing_address_line1: Street address
    - billing_address_line2: Suite, floor, etc.
    - billing_city: City
    - billing_state: State/province
    - billing_postal_code: ZIP/postal code
    - billing_country: Country
    - billing_contact_name: Contact person for billing inquiries
    - billing_contact_email: Email for invoices
    - billing_contact_phone: Phone number for billing contact

  3. Notes
    - All fields are optional to support gradual data entry
    - Can default to customer information but may differ (e.g., AP department)
*/

-- Add billing information fields to tariffs table
ALTER TABLE public.tariffs
  ADD COLUMN IF NOT EXISTS billing_company_name text,
  ADD COLUMN IF NOT EXISTS billing_address_line1 text,
  ADD COLUMN IF NOT EXISTS billing_address_line2 text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_state text,
  ADD COLUMN IF NOT EXISTS billing_postal_code text,
  ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'USA',
  ADD COLUMN IF NOT EXISTS billing_contact_name text,
  ADD COLUMN IF NOT EXISTS billing_contact_email text,
  ADD COLUMN IF NOT EXISTS billing_contact_phone text;