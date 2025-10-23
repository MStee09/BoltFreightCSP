# Test Email Button - Quick Verification

## Overview

After connecting your Gmail or Google Workspace email, you'll see a **"Send Test Email"** button that lets you verify your integration is working correctly.

---

## How to Use

### Step 1: Connect Your Email
1. Go to **Settings → Integrations**
2. Follow the setup to connect Gmail/Workspace
3. See "Connected" badge appear

### Step 2: Send Test Email
1. Click **"Send Test Email"** button (big blue button)
2. Wait a few seconds (button shows "Sending...")
3. See success message: "Test email sent to your@email.com!"

### Step 3: Check Your Inbox
1. Open your email inbox (Gmail or Workspace)
2. Look for email with subject: **"CRM Email Integration Test"**
3. Email should arrive within 5-10 seconds

---

## What the Test Email Contains

```
Subject: CRM Email Integration Test

Hello!

This is a test email from your CRM system.

If you're reading this, your email integration is working perfectly! 🎉

Test Details:
- Tracking Code: TEST-ABC123
- Sent At: [current timestamp]
- From: your@email.com

You can now send tracked emails from CSP Events, Customers, and Carriers in your CRM.

Best regards,
Your CRM System
```

---

## What This Tests

✅ **SMTP Connection** - Verifies app password works
✅ **Email Sending** - Confirms emails can be sent
✅ **Tracking Codes** - Tests tracking system (TEST-XXXXXX format)
✅ **Database Logging** - Email is saved to email_activities table
✅ **End-to-End Flow** - Full integration from UI to inbox

---

## Visual Flow

```
┌──────────────────────────────────────────────┐
│  Settings → Integrations                     │
│                                               │
│  Gmail Integration              ✓ Connected  │
│  Connected Email: you@company.com            │
│                                               │
│  ✅ Ready to Send Emails                     │
│  You can now send tracked emails from CSP    │
│  Events, Customers, and Carriers.            │
│                                               │
│  ┌─────────────────┐  ┌──────────────┐      │
│  │ Send Test Email │  │ Disconnect   │      │
│  └─────────────────┘  └──────────────┘      │
└──────────────────────────────────────────────┘
          ↓ Click
┌──────────────────────────────────────────────┐
│  Button changes to:                          │
│  ⟳ Sending...                                │
└──────────────────────────────────────────────┘
          ↓ 2-5 seconds
┌──────────────────────────────────────────────┐
│  ✅ Toast notification:                      │
│  Test email sent to you@company.com!         │
│  Check your inbox.                           │
└──────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────┐
│  Your Email Inbox                            │
│                                               │
│  📧 CRM Email Integration Test               │
│     Just now - Your CRM System               │
│                                               │
│     Hello! This is a test email...           │
└──────────────────────────────────────────────┘
```

---

## Troubleshooting

### Test email button does nothing
- Check browser console for errors
- Verify you're connected (see green "Connected" badge)
- Try disconnecting and reconnecting

### "Failed to send test email" error
- **Check app password** - May have expired or been revoked
- **Verify 2FA enabled** - Required by Google
- **Check with IT** (Workspace users) - App passwords may be disabled
- **Network issues** - SMTP port 587 might be blocked
- **Try regenerating** - Create new app password in Google

### Email not arriving in inbox
- **Check spam folder** - First email might be flagged
- **Wait 30 seconds** - Sometimes there's a delay
- **Check email_activities table** - Verify it was logged in database
- **Check "Sent" folder** - Should appear there too
- **Google delays** - First email from new app password may be slower

### "Gmail not connected" error
- Connection was lost
- Database entry was deleted
- Click "Connect Gmail Account" again

---

## What Gets Logged

When you send a test email, it's saved to the database just like real emails:

**Database Record (email_activities table):**
- `tracking_code`: TEST-XXXXXX (unique random code)
- `subject`: "CRM Email Integration Test"
- `from_email`: Your connected email
- `to_emails`: [Your email]
- `body_text`: Full test message
- `direction`: "outbound"
- `sent_at`: Current timestamp
- `created_by`: Your user ID

You can verify this in:
- **Supabase Dashboard** → Table Editor → email_activities
- Look for most recent row with tracking code starting with "TEST-"

---

## Production Usage

Once the test succeeds:

### From CSP Events
1. Go to **Pipeline**
2. Click any CSP Event
3. Click **[Email]** button in header
4. Compose and send to carriers

### From Customers
1. Go to **Customers**
2. Click customer name to open details
3. Go to "Emails" tab
4. Click **"Compose Email"**

### From Carriers
1. Go to **Carriers**
2. Click carrier name to open details
3. Go to "Emails" tab
4. Click **"Compose Email"**

All these will work the same way as the test email, but with:
- Real recipients
- Context-aware subject lines
- Proper tracking codes (CSP-XXXXXX format)
- Automatic CC to tracking@csp-crm.app

---

## Technical Details

### Test Email Flow

1. **UI Click** → `handleSendTestEmail()` function
2. **Generate** → Random tracking code: `TEST-XXXXXX`
3. **API Call** → POST to `/functions/v1/send-email`
4. **Edge Function** → Retrieves your credentials from database
5. **SMTP Send** → Connects to smtp.gmail.com:587 with TLS
6. **Database Log** → Saves to email_activities table
7. **Response** → Returns success/error to UI
8. **Toast** → Shows confirmation message

### Error Handling

The test button catches and displays specific errors:
- Authentication errors → "Gmail not connected"
- SMTP errors → "Invalid credentials" or "Connection failed"
- Network errors → "Network request failed"
- Database errors → "Failed to save email activity"

All errors are logged to browser console for debugging.

---

## Success Indicators

You know it's working when you see ALL of these:

✅ **UI:** "Test email sent!" toast notification
✅ **Inbox:** Email arrives within 10 seconds
✅ **Database:** New row in email_activities table
✅ **Button:** Returns to "Send Test Email" state (not stuck on "Sending...")

---

## Next Steps After Successful Test

1. ✅ **Test passed!** Your integration is working
2. 📧 **Start sending real emails** from CSP Events
3. 📊 **Check email timelines** in event/customer details
4. 🔍 **Monitor tracking** in email_activities table
5. 🎯 **Use for real negotiations** with confidence

---

## Summary

The "Send Test Email" button provides **one-click verification** that:
- Your Gmail/Workspace credentials are valid
- SMTP connection is working
- Email can be sent successfully
- Database logging is functioning
- End-to-end integration is operational

**Takes 10 seconds. Confirms everything works. 🚀**
