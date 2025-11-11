# Email Reply Tracking with Auto-BCC

## Overview

The app now automatically tracks email replies using a BCC (Blind Carbon Copy) approach. This is simpler than Google's webhook system and doesn't require domain verification.

## How It Works

1. **Auto-BCC**: Every email sent through the app automatically BCCs a tracking email address you configure
2. **Email Forwarding**: You set up email forwarding to send those BCCs to a webhook
3. **Automatic Capture**: When recipients reply (and include the tracking email in the thread), the app automatically captures their responses
4. **Thread Linking**: Replies are automatically linked to the original email thread using the tracking code in the subject line

## Setup Steps

### 1. Configure Tracking Email (Admin Only)

1. Go to **Settings → Integrations** tab
2. Find the "Auto-BCC Email Tracking" section
3. Enter a dedicated tracking email (e.g., `tracker@yourdomain.com`)
4. Click **Save**

### 2. Set Up Email Forwarding

You have several options to forward emails to the webhook:

#### Option A: SendGrid Inbound Parse (Recommended)

1. Sign up for SendGrid (free tier available)
2. Go to Settings → Inbound Parse
3. Add your tracking email domain
4. Set the webhook URL to: `https://your-supabase-url.supabase.co/functions/v1/receive-email`
5. Configure MX records to point to SendGrid

#### Option B: Mailgun Routes

1. Sign up for Mailgun (free tier available)
2. Add and verify your domain
3. Create a route for your tracking email
4. Forward to the webhook URL
5. Configure DNS records

#### Option C: Zapier/Make Automation

1. Create a new automation triggered by incoming email
2. Use Email Parser to extract email data
3. Format as JSON: `{ from, to, cc, subject, body, messageId, inReplyTo, date }`
4. POST to webhook URL

#### Option D: Gmail + Zapier

1. Set up Gmail filter to auto-forward tracking emails
2. Use Zapier to catch forwarded emails
3. Parse and POST to webhook

### 3. Test the Setup

1. Send a test email through the app
2. Check that the tracking email receives the BCC
3. Reply to the test email
4. Verify the reply appears in the app's email timeline

## Webhook Endpoint

**URL**: `https://your-supabase-url.supabase.co/functions/v1/receive-email`

**Method**: POST

**Expected JSON Format**:
```json
{
  "from": "sender@example.com",
  "to": ["recipient@example.com"],
  "cc": ["cc@example.com"],
  "subject": "[FO-ABC12345] Original Subject",
  "body": "Email body text",
  "messageId": "<unique-message-id@domain.com>",
  "inReplyTo": "<previous-message-id@domain.com>",
  "date": "2025-01-15T10:30:00Z"
}
```

## Benefits

- **No domain verification required** - Unlike Google's webhook system
- **Works with any email client** - Recipients can reply from Gmail, Outlook, etc.
- **Automatic thread tracking** - Replies are automatically linked to original emails
- **Follow-up task automation** - Pending follow-up tasks are auto-closed when replies arrive
- **Simple setup** - Just configure email forwarding once

## How Tracking Codes Work

Each outgoing email gets a unique tracking code like `[FO-ABC12345]` added to the subject line. When recipients reply:

1. The tracking code stays in the subject (email clients preserve this in replies)
2. The reply is BCCed to your tracking email
3. Email forwarding sends it to the webhook
4. The webhook extracts the tracking code
5. The app links the reply to the original thread

## Troubleshooting

**Replies not showing up?**
- Check your email forwarding is working
- Verify the tracking email is receiving BCCs
- Ensure the webhook URL is correct
- Check Supabase function logs for errors

**Tracking code missing?**
- The app automatically adds tracking codes
- Codes look like `[FO-ABC12345]` in the subject line
- Don't manually remove or modify them

**Want to stop tracking?**
- Simply remove the tracking email address in Settings
- Existing threads will still work
- New emails won't be BCC'd

## Privacy & Security

- The tracking email only receives copies of YOUR sent emails and their replies
- No access to your entire inbox
- Only emails with tracking codes are processed
- All data is stored securely in your Supabase database
- You control the tracking email and forwarding setup
