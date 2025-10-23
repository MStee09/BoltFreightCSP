# Google Workspace Email Setup

## For Users With Company Email (you@company.com)

Good news! The setup process is **identical** to Gmail. Google Workspace uses the same authentication system.

---

## Quick Setup (2 Minutes)

### Step 1: Enable 2FA
Go to: https://myaccount.google.com/security
- Enable 2-Step Verification if not already active
- Use your **company Google account**

### Step 2: Generate App Password
Go to: https://myaccount.google.com/apppasswords
- App name: "CRM Email"
- Click "Generate"
- Copy the 16-character code

### Step 3: Connect in CRM
Settings → Integrations → "Connect Gmail Account"
- Email: **you@company.com** (your Workspace email)
- App Password: [paste code]
- Click "Connect"

Done! 🎉

---

## Common Questions

### Q: Does this work with custom domains?
**A: Yes!** Google Workspace uses the same SMTP server (smtp.gmail.com) as regular Gmail.

### Q: What if I can't see "App Passwords"?
**A: Check with your IT admin.** Some organizations disable app passwords for security. Options:
1. Ask IT to enable app passwords for your account
2. Ask IT to whitelist the CRM application
3. Use a personal Gmail for testing (if allowed by company policy)

### Q: Will emails come from my company address?
**A: Yes!** Emails will appear as sent from you@company.com, maintaining your professional identity.

### Q: Does this require admin approval?
**A: Maybe.** It depends on your organization's security policies:
- **Most companies:** App passwords work immediately
- **High-security orgs:** May require IT approval
- **Check:** Try the setup - if it doesn't work, contact IT

---

## For IT Administrators

If your users need to connect the CRM, here's what they're doing:

### What Users Are Connecting
- **Application:** Custom CRM system
- **Method:** SMTP with App Password
- **Protocol:** TLS on port 587
- **Server:** smtp.gmail.com
- **Permissions:** Send-only (cannot read emails)

### Security Considerations
✅ **Secure:**
- Uses official Google SMTP server
- App passwords are revocable anytime
- TLS encryption for all connections
- Send-only access (no read permissions)
- Credentials stored encrypted

❌ **Does NOT:**
- Read user's emails
- Access personal data
- Store OAuth tokens
- Require domain-wide delegation

### Enable App Passwords for Users

1. **Admin Console:**
   - Go to: https://admin.google.com
   - Security → Less secure apps → Allow users to manage access

2. **Per-User Basis:**
   - Users can generate their own app passwords
   - No domain-wide setup required
   - Each user controls their own access

3. **Revoke Access:**
   - Users can revoke in their Google Account settings
   - Or: Admin can disable app passwords entirely

---

## Testing with Workspace Email

After connecting:

1. **Send test email** from any CSP Event
2. **Verify "From" address** is your company email
3. **Check company email signature** (if configured in Gmail)
4. **Confirm email logs** to company's sent folder

---

## Troubleshooting

### "App Passwords" option missing
- 2FA must be enabled first
- Check with IT - may be disabled org-wide
- Try: https://myaccount.google.com/apppasswords directly

### "Invalid credentials" error
- Verify you're using company Google account (not personal)
- Ensure 2FA is enabled on company account
- Check app password was copied completely
- Try generating a new app password

### Email not sending
- Verify SMTP isn't blocked by company firewall
- Check if IT has restricted third-party app access
- Contact IT to whitelist smtp.gmail.com:587
- Try from different network (outside company VPN)

### "Admin has disabled app passwords"
**Solutions:**
1. Contact IT explaining the use case
2. Share this document with IT for security review
3. Request temporary access for testing
4. Alternative: Use OAuth setup (more complex but may be allowed)

---

## Alternative: OAuth Setup

If your organization doesn't allow app passwords, OAuth is available but more complex:

**Requirements:**
- Google Cloud Project
- OAuth Client ID/Secret
- Admin consent for domain-wide delegation
- Requires technical setup (see GMAIL_SETUP_FIX.md)

**When to use OAuth:**
- App passwords blocked by admin
- Need to read emails (automatic reply capture)
- Organization requires OAuth for all apps
- Production deployment with many users

---

## Summary for Workspace Users

```
✅ Same process as Gmail
✅ Works with custom domains (you@company.com)
✅ Professional sender identity maintained
✅ 2-minute setup
⚠️  May require IT approval in some orgs
```

**Bottom line:** Try the setup! If it works, you're done. If not, share this doc with IT. 🚀
