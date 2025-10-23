# Gmail Email Tracking - Testing Guide

## Prerequisites

Before testing the email tracking system, you need:

1. **Gmail Account** - A Google/Gmail account for sending and receiving emails
2. **Google Cloud Project** - Required for Gmail API access
3. **OAuth Credentials** - Client ID and Client Secret from Google Cloud

---

## Setup Steps

### 1. Create Google Cloud Project & Enable Gmail API

**Step 1: Go to Google Cloud Console**
- Navigate to: https://console.cloud.google.com/
- Create a new project or select an existing one

**Step 2: Enable Gmail API**
- Go to "APIs & Services" → "Library"
- Search for "Gmail API"
- Click "Enable"

**Step 3: Create OAuth 2.0 Credentials**
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth client ID"
- Choose "Web application"
- Add authorized redirect URIs:
  - `http://localhost:5173/gmail-callback` (for local testing)
  - `https://your-production-domain.com/gmail-callback` (for production)
- Save the **Client ID** - you'll need this for the `.env` file

**Step 4: Configure OAuth Consent Screen**
- Go to "APIs & Services" → "OAuth consent screen"
- Choose "External" (for testing)
- Fill in required fields:
  - App name: "CSP CRM Email Tracker"
  - User support email: Your email
  - Developer contact: Your email
- Add scopes:
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.modify`
- Add your Gmail address as a test user (important for external apps)

### 2. Configure Environment Variables

Add to your `.env` file:

```env
VITE_GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

### 3. Start the Development Server

```bash
npm run dev
```

---

## Testing Scenarios

### Test 1: Connect Gmail Account

**Goal:** Verify OAuth flow and token storage

**Steps:**
1. Login to the CRM application
2. Navigate to **Settings** → **Integrations** tab
3. Find the **Gmail Integration** card
4. Click **"Connect Gmail Account"**
5. You'll be redirected to Google OAuth consent screen
6. Select your Gmail account
7. Review and accept the permissions
8. You'll be redirected back to the app

**Expected Results:**
✅ "Connected" badge appears on Gmail Integration card
✅ Your email address is displayed
✅ "Email Monitoring" status shows as "Inactive"

**Verify in Database:**
```sql
-- Check if token was saved
SELECT user_id, email_address, created_at
FROM user_gmail_tokens
WHERE user_id = '[your-user-id]';
```

---

### Test 2: Send Tracked Email from CSP Event

**Goal:** Send an email with proper tracking code and subject line

**Steps:**
1. Navigate to **Pipeline** page
2. Click on any CSP Event to open the detail sheet
3. Click the **[Email]** button in the top-right header
4. The compose dialog should open with:
   - **Subject:** CSP Event title (e.g., "New Lane Expansion - West Coast")
   - **Tracking Code:** Displayed in blue box (e.g., CSP-M7K2L1-AB3D)
   - **CC:** tracking@csp-crm.app (automatically added)
5. Add a recipient email in the "To" field (use your own email for testing)
6. Optional: Customize the message body
7. Click **"Send Email"**

**Expected Results:**
✅ Success toast appears: "Email sent successfully"
✅ Dialog closes automatically
✅ You receive the email in your inbox
✅ Subject line is clean (just the CSP Event title, no tracking code visible)
✅ tracking@csp-crm.app is CC'd

**Verify in Database:**
```sql
-- Check if email was logged
SELECT
  tracking_code,
  subject,
  to_emails,
  cc_emails,
  direction,
  csp_event_id,
  sent_at
FROM email_activities
WHERE direction = 'outbound'
ORDER BY sent_at DESC
LIMIT 1;
```

**Verify Email Headers:**
- Open the received email in Gmail
- Click the three dots menu → "Show original"
- Look for `X-CSP-Tracking-Code: CSP-M7K2L1-AB3D` in the headers
- Verify tracking code is NOT in the subject line

---

### Test 3: Enable Email Monitoring (Optional - Advanced)

**⚠️ Note:** This requires setting up Gmail Push Notifications with Google Cloud Pub/Sub

**Steps:**
1. In Settings → Integrations
2. Click **"Enable Email Monitoring"** button
3. System will set up Gmail watch subscription

**Expected Results:**
✅ "Email Monitoring" status changes to "Active" with green badge

**Why This Might Fail:**
- Gmail Push Notifications require a verified domain
- Need to configure Google Cloud Pub/Sub topic
- For development, you can skip this and test without real-time monitoring

---

### Test 4: View Email in Timeline

**Goal:** Verify sent email appears in the CSP Event timeline

**Steps:**
1. Return to the CSP Event detail sheet
2. Click on the **"Emails"** tab
3. Look for your sent email in the timeline

**Expected Results:**
✅ Email appears with blue "Outbound" indicator
✅ Shows correct subject, recipients, and timestamp
✅ Click to expand and view full email body

---

### Test 5: Manual Reply Capture (Without Gmail Monitoring)

**Goal:** Test email tracking without real-time webhook

**Since Gmail monitoring requires production setup, you can manually test the webhook:**

**Option A: Reply to Email and Manually Trigger Processing**
1. Reply to the email you sent in Test 2
2. Keep the same subject line (Gmail does this automatically)
3. The reply won't be auto-captured without monitoring enabled

**Option B: Simulate Inbound Email in Database**
```sql
-- Manually insert a reply (for testing only)
INSERT INTO email_activities (
  tracking_code,
  csp_event_id,
  customer_id,
  subject,
  from_email,
  from_name,
  to_emails,
  body_text,
  direction,
  sent_at
) VALUES (
  'CSP-M7K2L1-AB3D',  -- Use the same tracking code from Test 2
  '[csp-event-id]',
  '[customer-id]',
  'Re: New Lane Expansion - West Coast',
  'recipient@example.com',
  'Test Recipient',
  ARRAY['you@gmail.com'],
  'Thanks for reaching out. Here are my thoughts...',
  'inbound',
  NOW()
);
```

**Expected Results:**
✅ Inbound email appears in the Emails tab
✅ Shows green "Inbound" indicator
✅ Linked to the same CSP Event

---

## Testing Without Gmail API (Mock Mode)

If you don't want to set up Gmail API, you can test the UI and database logic:

### Test Email Compose Dialog UI

1. Open CSP Event → Click [Email]
2. Verify dialog layout and fields
3. Add/remove recipients
4. Check that tracking@csp-crm.app can't be removed
5. Verify tracking code generates uniquely each time

### Test Email Timeline View

1. Manually insert test data:

```sql
-- Insert test outbound email
INSERT INTO email_activities (
  tracking_code, csp_event_id, subject,
  from_email, to_emails, body_text,
  direction, sent_at
) VALUES (
  'CSP-TEST-001',
  '[csp-event-id]',
  'Test Email Subject',
  'you@company.com',
  ARRAY['carrier@example.com'],
  'This is a test email body.',
  'outbound',
  NOW()
);

-- Insert test reply
INSERT INTO email_activities (
  tracking_code, csp_event_id, subject,
  from_email, to_emails, body_text,
  direction, sent_at
) VALUES (
  'CSP-TEST-001',
  '[csp-event-id]',
  'Re: Test Email Subject',
  'carrier@example.com',
  ARRAY['you@company.com'],
  'This is the reply to your email.',
  'inbound',
  NOW() + interval '1 hour'
);
```

2. View the emails in the Emails tab of CSP Event

---

## Common Issues & Troubleshooting

### Issue: "Gmail not connected" error when sending email

**Solution:**
- Go to Settings → Integrations
- Verify "Connected" badge is showing
- If not, click "Connect Gmail Account" again
- Check that `VITE_GMAIL_CLIENT_ID` is set in `.env`

### Issue: Email not appearing in timeline

**Solution:**
- Check the database: `SELECT * FROM email_activities ORDER BY sent_at DESC LIMIT 5;`
- Verify `csp_event_id` matches the CSP Event you're viewing
- Check browser console for any errors

### Issue: OAuth redirect fails

**Solution:**
- Verify redirect URI in Google Cloud Console matches exactly
- For local dev, use: `http://localhost:5173/gmail-callback`
- Clear browser cookies and try again

### Issue: "Failed to send email" error

**Solution:**
- Check browser console for detailed error message
- Verify Gmail API is enabled in Google Cloud Console
- Check that OAuth token hasn't expired (reconnect Gmail)
- Ensure you're added as a test user in OAuth consent screen

### Issue: tracking@csp-crm.app bounces emails

**Solution:**
- This is expected if the email address doesn't actually exist
- For production, you'd need to:
  - Register the domain `csp-crm.app` OR
  - Use a real email address you control (e.g., `tracking@yourcompany.com`)
  - Update the tracking email in `EmailComposeDialog.jsx` line 20

---

## Quick Test Checklist

Use this checklist for rapid testing:

- [ ] Gmail OAuth connection successful
- [ ] Connected email shows in Settings
- [ ] Can open email compose dialog from CSP Event
- [ ] Subject line shows CSP Event title
- [ ] Tracking code generates uniquely
- [ ] tracking@csp-crm.app is auto-CC'd
- [ ] Can add/remove recipients
- [ ] Email sends successfully
- [ ] Outbound email appears in database
- [ ] Outbound email shows in timeline
- [ ] Can disconnect Gmail
- [ ] UI shows detailed explanations in Settings

---

## Production Considerations

Before deploying to production:

1. **Update Tracking Email**
   - Change `tracking@csp-crm.app` to a real email you control
   - Or set up the domain and email forwarding

2. **Gmail Push Notifications**
   - Set up Google Cloud Pub/Sub
   - Configure push notifications endpoint
   - Update webhook URL in `GmailSetup.jsx`

3. **OAuth Consent Screen**
   - Submit for Google verification (if using external users)
   - Add privacy policy and terms of service URLs

4. **Environment Variables**
   - Add production redirect URI to Google Cloud Console
   - Update `VITE_GMAIL_CLIENT_ID` in production `.env`

5. **Rate Limits**
   - Gmail API has daily quotas
   - Implement rate limiting and error handling
   - Consider batch processing for high volume

---

## Support

If you encounter issues not covered here:

1. Check browser console for detailed errors
2. Check Supabase logs for edge function errors
3. Review the email tracking tables in the database
4. Verify all environment variables are set correctly

For Gmail API specific issues, consult:
- https://developers.google.com/gmail/api/guides
- https://console.cloud.google.com/apis/api/gmail.googleapis.com
