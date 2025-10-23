# Quick Email Test - 5 Minutes

## Fastest Way to Test Email Tracking

### Prerequisites (One-Time Setup - 5 minutes)

1. **Get Google OAuth Client ID:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create new project if needed
   - Click "Create Credentials" → "OAuth client ID" → "Web application"
   - Add redirect URI: `http://localhost:5173/gmail-callback`
   - Copy the Client ID

2. **Add to .env file:**
   ```bash
   echo "VITE_GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com" >> .env
   ```

3. **Enable Gmail API:**
   - Go to: https://console.cloud.google.com/apis/library/gmail.googleapis.com
   - Click "Enable"

4. **Add yourself as test user:**
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Add your Gmail address under "Test users"

### Test Steps (2 minutes)

1. **Start app:**
   ```bash
   npm run dev
   ```

2. **Connect Gmail:**
   - Go to Settings → Integrations
   - Click "Connect Gmail Account"
   - Authorize with your Gmail
   - You should see "Connected" badge

3. **Send Test Email:**
   - Go to Pipeline → Click any CSP Event
   - Click [Email] button in header
   - In "To" field, add your own email
   - Click "Send Email"
   - Check your inbox!

4. **Verify:**
   - Check received email has clean subject (CSP Event title)
   - Check tracking@csp-crm.app is CC'd
   - Open email → Show original → Look for `X-CSP-Tracking-Code` header
   - Go to Emails tab in CSP Event → See your sent email

### What Happens Without Setup?

If you click "Connect Gmail Account" without configuring the Client ID:

- ✅ **App won't break** - You'll see a helpful error message
- ✅ **Clear instructions displayed** - Amber warning box with setup steps
- ✅ **Button disabled** - Can't accidentally trigger the OAuth flow
- ✅ **Link to this guide** - Directs you to setup instructions

The Settings page will show:
```
┌────────────────────────────────────────────────────┐
│ ⚠️  Gmail Client ID Not Configured                │
│                                                     │
│ To connect Gmail, you need to add                  │
│ VITE_GMAIL_CLIENT_ID to your .env file.           │
│                                                     │
│ Setup Steps:                                        │
│ 1. Go to Google Cloud Console                      │
│ 2. Create OAuth 2.0 Client ID                      │
│ 3. Add to .env: VITE_GMAIL_CLIENT_ID=your-id      │
│ 4. Restart dev server                              │
│                                                     │
│ See QUICK_EMAIL_TEST.md for detailed instructions. │
└────────────────────────────────────────────────────┘

[Connect Gmail Account] (disabled)
```

### Test Without Gmail API (No Setup Required)

If you don't want to set up Gmail, test the UI and database:

1. **Test UI:**
   - Open any CSP Event
   - Click [Email] button
   - Verify dialog shows CSP Event title as subject
   - Verify tracking code appears (e.g., CSP-M7K2L1-AB3D)
   - Verify tracking@csp-crm.app is auto-CC'd
   - Add/remove recipients to test functionality

2. **Mock Email Data:**
   ```sql
   -- Run this in Supabase SQL Editor
   -- Replace [csp-event-id] with a real ID from your csp_events table

   INSERT INTO email_activities (
     tracking_code, csp_event_id, subject,
     from_email, to_emails, body_text,
     direction, sent_at
   ) VALUES
   -- Outbound email
   (
     'CSP-TEST-001',
     '[csp-event-id]',
     'New Lane Expansion - West Coast',
     'you@company.com',
     ARRAY['carrier@example.com'],
     'Hi team, wanted to follow up regarding the new lane expansion.',
     'outbound',
     NOW()
   ),
   -- Reply (1 hour later)
   (
     'CSP-TEST-001',
     '[csp-event-id]',
     'Re: New Lane Expansion - West Coast',
     'carrier@example.com',
     ARRAY['you@company.com'],
     'Thanks for reaching out. We are interested in discussing rates.',
     'inbound',
     NOW() + interval '1 hour'
   ),
   -- Another reply (2 hours later)
   (
     'CSP-TEST-001',
     '[csp-event-id]',
     'Re: New Lane Expansion - West Coast',
     'you@company.com',
     ARRAY['carrier@example.com'],
     'Great! Let me schedule a call for next week.',
     'outbound',
     NOW() + interval '2 hours'
   );
   ```

3. **View in Timeline:**
   - Open the CSP Event
   - Go to "Emails" tab
   - See the conversation thread with blue/green indicators

### What to Look For

✅ **Email Dialog:**
- Subject shows CSP Event title naturally
- Tracking code visible but hidden from recipients
- tracking@csp-crm.app automatically CC'd
- Can't remove tracking email

✅ **Settings Explanation:**
- 4 color-coded steps explaining how it works
- Clear info about tracking@csp-crm.app
- Privacy & security section

✅ **Email Timeline:**
- Outbound emails in blue
- Inbound emails in green
- Chronological order
- Full conversation visible

### Troubleshooting

**App breaks when clicking "Connect Gmail Account":**
- **FIXED!** The app now shows a helpful error instead of breaking
- You'll see an amber warning box with setup instructions
- The button is disabled until you configure the Client ID

**"Gmail not connected" error when sending email:**
- Check `.env` has `VITE_GMAIL_CLIENT_ID`
- Restart dev server after adding env var
- Go to Settings → Integrations and connect Gmail

**OAuth redirect fails:**
- Verify redirect URI in Google Cloud Console: `http://localhost:5173/gmail-callback`
- Must be exact match (no trailing slash)

**Email doesn't send:**
- Check browser console for errors
- Verify Gmail API is enabled
- Make sure you're added as test user in OAuth consent screen

### Done! 🎉

You've now tested:
- Gmail OAuth connection
- Email composition with smart defaults
- Tracking code generation
- Email timeline view
- Complete email tracking workflow

For full production setup including Gmail monitoring/webhooks, see `EMAIL_TESTING_GUIDE.md`.
