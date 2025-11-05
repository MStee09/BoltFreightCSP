# Complete Email Setup Guide

This app has two email systems that need to be configured:

## System 1: SMTP Email (For Invitations & Feedback)

**Used for:**
- Sending user invitations from Admin panel
- Sending feedback emails to support

**Where it's used:**
- Edge Function: `send-invitation`
- Edge Function: `send-feedback-email`

### Setup Steps

#### Step 1: Get Gmail App Password

1. Go to your Gmail account
2. Navigate to: Google Account → Security → 2-Step Verification
3. Scroll down to "App passwords"
4. Create a new app password:
   - App: Mail
   - Device: Other (Custom name) - Enter "CSP CRM"
5. Copy the 16-character password (example: `abcd efgh ijkl mnop`)

#### Step 2: Add Secrets to Supabase

1. Go to your Supabase Dashboard
2. Navigate to: Project Settings → Edge Functions → Manage secrets
3. Add these three secrets:

```
EMAIL_USERNAME = your-email@gmail.com
EMAIL_PASSWORD = abcdefghijklmnop (16 chars, no spaces)
EMAIL_FROM = your-email@gmail.com
```

**Important:** Click "Save" after adding each secret.

#### Step 3: Verify Setup

The edge functions are already deployed and will automatically use these secrets once they're added.

---

## System 2: Gmail OAuth (For Personal Email Integration)

**Used for:**
- Connecting user's Gmail to send/receive emails within the app
- Email timeline tracking
- Direct carrier communication

**Where it's used:**
- Settings → Gmail Integration
- Email compose dialogs throughout the app

### Setup Steps

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Name it: "CSP CRM" (or your choice)

#### Step 2: Enable Gmail API

1. Go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click "Enable"

#### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have Google Workspace)
3. Fill in required fields:
   - App name: CSP CRM
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
5. Add test users (your email addresses that will use the app)
6. Save and continue

#### Step 4: Create OAuth Client ID

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "CSP CRM Web Client"
5. Authorized redirect URIs:
   - For local: `http://localhost:5173/gmail-callback`
   - For production: `https://yourdomain.com/gmail-callback`
6. Click "Create"
7. Copy the "Client ID" (looks like: `xxxxx.apps.googleusercontent.com`)

#### Step 5: Add to Local Environment

Add to your `.env` file:

```env
VITE_GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

Restart your dev server: `npm run dev`

#### Step 6: Test Connection

1. Go to Settings → Integrations
2. Click "Connect Gmail Account"
3. Authorize with Google
4. Should redirect back successfully

---

## Quick Reference

### What needs to be configured where?

| Secret | Location | Purpose |
|--------|----------|---------|
| `EMAIL_USERNAME` | Supabase Secrets | SMTP sending |
| `EMAIL_PASSWORD` | Supabase Secrets | SMTP sending |
| `EMAIL_FROM` | Supabase Secrets | SMTP sending |
| `VITE_GMAIL_CLIENT_ID` | Local `.env` | Gmail OAuth |

### Current Status Check

Run this in your browser console on the app:

```javascript
console.log('Gmail Client ID:', import.meta.env.VITE_GMAIL_CLIENT_ID ? '✅ Configured' : '❌ Missing');
```

Check Supabase secrets:
1. Supabase Dashboard → Project Settings → Edge Functions
2. Look for: `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_FROM`

---

## Testing

### Test SMTP Email (Invitations)

1. Go to Settings → User Management
2. Click "Invite User"
3. Enter an email address
4. Click "Send Invitation"
5. Check if email was received

### Test Gmail OAuth

1. Go to Settings → Integrations
2. Click "Connect Gmail Account"
3. Authorize with Google
4. Should see "Connected" status
5. Try composing an email from a CSP event

---

## Troubleshooting

### "Missing secrets" warning in Claude Code

This means Supabase secrets aren't set. Follow "System 1" setup above.

### Gmail button is disabled

Missing `VITE_GMAIL_CLIENT_ID` in `.env`. Follow "System 2" setup above.

### OAuth error: "redirect_uri_mismatch"

Your redirect URI in Google Cloud Console doesn't match your app URL. Add the correct URL to authorized redirect URIs.

### "App not verified" warning from Google

This is normal for apps in testing mode. Add yourself as a test user in the OAuth consent screen.

### Emails not sending

1. Check Gmail App Password is correct (16 chars, no spaces)
2. Verify 2-Step Verification is enabled on Gmail
3. Check Supabase Edge Function logs for errors

---

## Security Notes

- Never commit `.env` to git (already in `.gitignore`)
- Gmail App Passwords have limited scope (safer than your actual password)
- OAuth tokens are stored securely in Supabase database
- Edge Function secrets are only accessible to deployed functions

---

## Production Deployment

When deploying to production:

1. Add production redirect URI to Google Cloud OAuth settings
2. Keep the same Supabase secrets (they work for all environments)
3. Add `VITE_GMAIL_CLIENT_ID` to your hosting platform's environment variables
4. Consider submitting your app for Google verification (removes "unverified" warning)
