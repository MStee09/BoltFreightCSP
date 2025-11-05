# Google Workspace Admin Setup Guide

This guide is for **Google Workspace administrators** who need to set up Gmail integration for their entire organization.

## Overview

As a Workspace admin, you'll configure OAuth **once** for the entire organization. After setup, any user in your organization can simply click "Connect Gmail Account" without needing to do any configuration themselves.

---

## Prerequisites

- Google Workspace admin account
- Access to Google Cloud Console
- Admin privileges to manage OAuth apps

---

## Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your **Workspace admin account**
3. Click "Select a project" → "New Project"
4. Project name: **FreightOps CRM** (or your company name)
5. Organization: Select your Workspace organization
6. Click "Create"

### 2. Enable Gmail API

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on it and click **Enable**

### 3. Configure OAuth Consent Screen

This is the screen users see when connecting their Gmail.

1. Go to **APIs & Services** → **OAuth consent screen**
2. User Type: Select **Internal** (this restricts to your organization only)
3. Click "Create"

**Fill in the form:**

- App name: `FreightOps CRM` (or your app name)
- User support email: Your support email
- App logo: (optional) Upload your company logo
- Application home page: Your app URL
- Authorized domains: Add your domain (e.g., `yourcompany.com`)
- Developer contact: Your IT/development team email

4. Click **Save and Continue**

**Add Scopes:**

5. Click "Add or Remove Scopes"
6. Add these scopes:
   - `https://www.googleapis.com/auth/gmail.send` (Send emails)
   - `https://www.googleapis.com/auth/gmail.readonly` (Read emails)
   - `https://www.googleapis.com/auth/userinfo.email` (Get email address)
7. Click **Update**
8. Click **Save and Continue**

**Test Users:** (Skip this - not needed for Internal apps)

9. Click **Save and Continue**

**Summary:**

10. Review your settings
11. Click **Back to Dashboard**

### 4. Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `FreightOps Web Client`

**Authorized JavaScript origins:**

Add these URLs (adjust for your domains):
```
http://localhost:5173
https://yourdomain.com
https://app.yourdomain.com
```

**Authorized redirect URIs:**

Add these URLs (adjust for your domains):
```
http://localhost:5173/gmail-callback
https://yourdomain.com/gmail-callback
https://app.yourdomain.com/gmail-callback
```

5. Click **Create**

**IMPORTANT:** Copy the Client ID that appears - you'll need this!

It looks like: `123456789-abcdefg.apps.googleusercontent.com`

### 5. Configure FreightOps Application

**For Local Development:**

1. Open the `.env` file in your FreightOps project
2. Add this line:
   ```
   VITE_GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   ```
3. Restart the development server

**For Production/Hosted Version:**

1. Go to your hosting platform (Netlify, Vercel, etc.)
2. Add environment variable:
   - Key: `VITE_GMAIL_CLIENT_ID`
   - Value: `your-client-id-here.apps.googleusercontent.com`
3. Redeploy the application

---

## User Experience After Setup

Once you've completed the setup above:

1. Users go to **Settings → Integrations**
2. They see a green "Ready" badge
3. They click **"Connect Gmail Account"**
4. They're redirected to Google
5. They see your OAuth consent screen (with your branding)
6. They click **"Allow"**
7. They're redirected back to FreightOps - Done!

**No configuration needed from users!**

---

## Security & Permissions

### What Users Can Do:
- Connect their own Gmail account
- Send emails as themselves
- Track email conversations
- Disconnect at any time

### What Users Cannot Do:
- Access other users' emails
- Send emails as other users
- Access Gmail accounts outside your organization (Internal app)

### Admin Controls:
- As a Workspace admin, you can:
  - View all OAuth apps in [Google Admin Console](https://admin.google.com)
  - Revoke access to the app for all users
  - See which users have connected
  - Monitor API usage

---

## Testing

### Test with Your Account First:

1. Go to the FreightOps app
2. Navigate to **Settings → Integrations**
3. Click **"Connect Gmail Account"**
4. Sign in with your Workspace account
5. Grant permissions
6. Verify you're redirected back successfully
7. Try sending a test email

### Roll Out to Users:

Once you've verified it works:
1. Notify users that Gmail integration is available
2. Direct them to Settings → Integrations
3. They can connect their accounts independently

---

## Troubleshooting

### "Error 401: Unauthorized"
- Check that the Client ID is correctly added to `.env`
- Verify the redirect URI matches exactly (including http/https)

### "Error 403: Access Denied"
- Verify OAuth consent screen is set to "Internal"
- Check user is part of your Workspace organization

### "Redirect URI Mismatch"
- The URL in your browser must match the authorized redirect URIs exactly
- Add all domains where users access the app

### Users See "This app isn't verified"
- This shouldn't happen with Internal apps
- If it does, verify OAuth consent screen user type is "Internal"

---

## FAQ

**Q: Do users need to configure anything?**
A: No! Once you (admin) complete this setup, users just click "Connect Gmail Account"

**Q: Can users outside our organization use this?**
A: No. "Internal" apps are restricted to your Workspace organization only.

**Q: What if a user leaves the company?**
A: Their Gmail connection will stop working when their Workspace account is disabled.

**Q: Can I restrict which users can connect?**
A: Yes, through Google Workspace Admin Console, you can control app access by organizational unit.

**Q: How do I revoke access for everyone?**
A: In Google Admin Console → Security → API controls → Manage Third Party App Access → Find your app → Revoke

**Q: Do we need to pay for Google Cloud?**
A: No. The Gmail API usage for a typical business is well within the free tier (1 billion quota units/day).

**Q: What data does the app store?**
A: Only OAuth tokens (encrypted) and email metadata. Email content is fetched from Gmail in real-time.

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all redirect URIs are correct
3. Test with your admin account first
4. Review Google Cloud Console logs (APIs & Services → Dashboard)

For Workspace-specific OAuth issues:
- [Google Workspace Admin Help](https://support.google.com/a/)
- [OAuth 2.0 for Workspace](https://developers.google.com/workspace/guides/configure-oauth-consent)

---

## Summary Checklist

- [ ] Created Google Cloud Project (as Workspace admin)
- [ ] Enabled Gmail API
- [ ] Configured OAuth Consent Screen as "Internal"
- [ ] Added required scopes (gmail.send, gmail.readonly)
- [ ] Created OAuth Client ID (Web application)
- [ ] Added authorized redirect URIs for all domains
- [ ] Copied Client ID
- [ ] Added `VITE_GMAIL_CLIENT_ID` to .env (local) and hosting platform (production)
- [ ] Tested with admin account
- [ ] Notified users that feature is available

---

Once complete, users in your organization can connect Gmail with a single click - no technical configuration required!
