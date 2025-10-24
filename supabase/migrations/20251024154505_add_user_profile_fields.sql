/*
  # Add User Profile Fields for Email Signatures

  1. Changes
    - Add profile fields to `user_profiles` table
      - `first_name` - User's first name
      - `last_name` - User's last name
      - `phone` - Contact phone number
      - `title` - Job title (e.g., "Customer Pricing Manager")
      - `company` - Company name (defaults to "Rocketshipping")
      - `email_signature` - Custom email signature (optional override)
    
  2. Purpose
    - Enable personalized email signatures
    - Provide contact info for carriers/customers
    - Distinguish app-sent emails from personal Gmail
*/

-- Add profile fields to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'title'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'company'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN company text DEFAULT 'Rocketshipping';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email_signature'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email_signature text;
  END IF;
END $$;
