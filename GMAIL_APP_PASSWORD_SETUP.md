# Gmail App Password Setup - 2 Minutes

## What You Need

- A Gmail account (e.g., you@gmail.com)
- 2-Factor Authentication enabled (required by Google)
- 2 minutes of your time

---

## Step 1: Enable 2-Factor Authentication (If Not Already Enabled)

1. Go to: https://myaccount.google.com/security
2. Scroll to "How you sign in to Google"
3. Click "2-Step Verification"
4. Follow the setup wizard (usually phone verification)

**Already have 2FA?** Skip to Step 2!

---

## Step 2: Generate App Password

1. **Go to App Passwords page:**
   - Visit: https://myaccount.google.com/apppasswords
   - Or manually: Google Account → Security → 2-Step Verification → App passwords

2. **Create the password:**
   - In the "App name" field, type: `CRM Email` (or any name you want)
   - Click **"Generate"**

3. **Copy the password:**
   - Google shows a 16-character code like: `abcd efgh ijkl mnop`
   - Copy this code (spaces don't matter, we'll remove them)

---

## Step 3: Connect in the CRM

1. **Open the CRM**
   - Login to your account
   - Go to **Settings** (gear icon in sidebar)
   - Click **"Integrations"** tab

2. **Connect Gmail**
   - Click **"Connect Gmail Account"** button
   - You'll see a setup form

3. **Enter your details:**
   - **Gmail Address:** your@gmail.com
   - **App Password:** Paste the 16-character code
   - Click **"Connect"**

4. **Done!**
   - You'll see "Connected" badge
   - Ready to send tracked emails

---

## Quick Visual Guide

```
┌─────────────────────────────────────────────────┐
│  Step 1: Google Account Security                │
│  https://myaccount.google.com/security          │
│                                                  │
│  → Enable 2-Step Verification                   │
│  → (Usually takes 1 minute)                     │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  Step 2: Generate App Password                  │
│  https://myaccount.google.com/apppasswords      │
│                                                  │
│  → Type "CRM Email" as app name                 │
│  → Click "Generate"                             │
│  → Copy: abcd efgh ijkl mnop                    │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  Step 3: CRM Settings                           │
│  Settings → Integrations → Connect Gmail        │
│                                                  │
│  Email: you@gmail.com                           │
│  Password: [paste 16-char code]                 │
│  → Click "Connect"                              │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  ✅ Done! Start Sending Emails                  │
│                                                  │
│  Pipeline → CSP Event → [Email] button          │
└─────────────────────────────────────────────────┘
```

---

## Testing

Once connected, test it immediately:

1. Go to **Pipeline** page
2. Click any CSP Event to open details
3. Click **[Email]** button in the header
4. The compose dialog opens with:
   - Subject: CSP Event title
   - Tracking code generated
   - tracking@csp-crm.app auto-CC'd
5. Add your own email in the "To" field
6. Click **"Send Email"**
7. Check your inbox!

**What to verify:**
- ✅ Email arrives in your inbox
- ✅ Subject line is clean (CSP Event title, no tracking code)
- ✅ tracking@csp-crm.app is CC'd
- ✅ Email appears in the "Emails" tab of the CSP Event

---

## Troubleshooting

### "Invalid credentials" error

**Problem:** App password doesn't work

**Solutions:**
- Make sure you copied the entire 16-character code
- Spaces don't matter (we remove them automatically)
- Try regenerating a new app password
- Verify 2FA is enabled on your Google account

### Can't find App Passwords page

**Problem:** Link doesn't work or page doesn't show App Passwords

**Solutions:**
- Make sure 2-Step Verification is enabled first
- Use this direct link: https://myaccount.google.com/apppasswords
- If still not visible, you might need to enable "Less secure app access" (deprecated) or contact Google support

### Email not sending

**Problem:** "Failed to send email" error

**Solutions:**
- Verify Gmail address is correct (must be @gmail.com)
- Check that app password has no spaces or typos
- Try disconnecting and reconnecting
- Check browser console for detailed error messages

### Email sends but doesn't appear in timeline

**Problem:** Email sent successfully but not showing in CRM

**Solutions:**
- Refresh the page
- Check the "Emails" tab in CSP Event details
- Verify the email was logged: Go to Supabase dashboard → Table Editor → email_activities

---

## Security Notes

### What This Allows

- ✅ CRM can send emails on your behalf
- ✅ Emails appear as coming from your Gmail address
- ✅ Full email tracking and logging in CRM

### What This Does NOT Allow

- ❌ Cannot read your existing emails (read-only access not granted)
- ❌ Cannot access personal emails (only sends CRM-generated emails)
- ❌ Cannot change your Google account settings

### How to Revoke Access

If you want to disconnect:

1. **In the CRM:**
   - Settings → Integrations → "Disconnect Gmail"

2. **In Google:**
   - Go to: https://myaccount.google.com/apppasswords
   - Find "CRM Email" app password
   - Click "Remove" or "Revoke"

Both steps will immediately stop the CRM from sending emails using your account.

---

## Why App Passwords Instead of OAuth?

**OAuth (Old Approach):**
- Requires Google Cloud Project setup
- Need Client ID and Client Secret
- Complex redirect URLs and consent screens
- Takes 10-15 minutes to configure
- Requires domain verification for production

**App Passwords (New Approach):**
- No Google Cloud Project needed
- Just 2 pieces of info: email + password
- Takes 2 minutes total
- Works immediately
- Perfect for individual users and small teams

**Trade-off:**
- App passwords can ONLY send emails (no reading/monitoring)
- If you need automatic reply capture, you'd need OAuth + Gmail API
- For most use cases, sending tracked emails is enough!

---

## Next Steps

Once Gmail is connected:

1. **Send your first tracked email** from a CSP Event
2. **Check the Emails tab** to see the timeline
3. **Verify tracking codes** are working (hidden in headers)
4. **Use mock data** (see QUICK_EMAIL_TEST.md) to test reply capture UI

---

## Summary

```
Time: 2 minutes
Steps: 3 (Enable 2FA → Generate password → Connect in CRM)
Requirements: Gmail account with 2FA
Result: Send tracked emails directly from CRM
```

That's it! No complex OAuth, no Google Cloud setup, just simple email + password. 🎉
