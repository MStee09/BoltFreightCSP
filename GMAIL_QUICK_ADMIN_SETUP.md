# Gmail API - Quick Admin Setup (5 Minutes)

Follow these steps to enable Gmail integration for your organization.

---

## Step 1: Create Google Cloud Project (1 min)

1. **Open:** https://console.cloud.google.com/projectcreate
2. **Project name:** FreightOps CRM
3. **Organization:** Select your company
4. **Click:** Create

---

## Step 2: Enable Gmail API (30 seconds)

1. **Open:** https://console.cloud.google.com/apis/library/gmail.googleapis.com
2. Make sure your new project is selected (top dropdown)
3. **Click:** Enable

---

## Step 3: Configure OAuth Consent Screen (2 min)

1. **Open:** https://console.cloud.google.com/apis/credentials/consent
2. **User Type:** Select **Internal** (only your organization)
3. **Click:** Create

**Fill in:**
- App name: `FreightOps CRM`
- User support email: Your email
- Developer contact: Your email
- **Click:** Save and Continue

**Add Scopes:**
- **Click:** Add or Remove Scopes
- Search and select:
  - `gmail.send`
  - `gmail.readonly`
  - `userinfo.email`
- **Click:** Update
- **Click:** Save and Continue
- **Click:** Save and Continue (skip test users for Internal apps)
- **Click:** Back to Dashboard

---

## Step 4: Create OAuth Client ID (1 min)

1. **Open:** https://console.cloud.google.com/apis/credentials
2. **Click:** Create Credentials → OAuth client ID
3. **Application type:** Web application
4. **Name:** FreightOps Web Client

**Authorized redirect URIs:** Add these (replace with your actual domains):
```
http://localhost:5173/gmail-callback
https://yourdomain.com/gmail-callback
```

5. **Click:** Create
6. **Copy the Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

---

## Step 5: Add to Application (30 seconds)

**Add to your `.env` file:**
```
VITE_GMAIL_CLIENT_ID=paste-your-client-id-here.apps.googleusercontent.com
```

**Restart your dev server:**
```bash
npm run dev
```

---

## Done!

Users can now go to **Settings → Integrations** and click "Connect Gmail Account" to sign in with their company Google account.

---

## What Users Will See

1. They click "Connect Gmail Account"
2. Google sign-in page (your company branding)
3. Permission request (send/read emails)
4. Redirected back - Connected!

No configuration needed from them!
