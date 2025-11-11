# Email Reply Tracking with Reply-To Addresses

## Overview

The app automatically tracks email replies using unique Reply-To addresses. This is the **simplest and most reliable method** - it works even when recipients click "Reply" instead of "Reply All".

## How It Works

1. **Unique Reply-To**: Each email gets a unique Reply-To address like `replies+FO-ABC12345@yourdomain.com`
2. **Catch-All Forwarding**: You set up catch-all email forwarding for `replies+*@yourdomain.com` to a webhook
3. **100% Capture**: ALL replies are captured automatically, regardless of "Reply" vs "Reply All"
4. **Thread Linking**: Replies are automatically linked to the original email thread using the tracking code embedded in the Reply-To address

## Quick Setup (3 Steps)

### Step 1: Configure Your Domain
- Go to **Settings → Integrations**
- Enter your domain (e.g., `yourdomain.com`)
- Click Save

### Step 2: Set Up Catch-All Forwarding
Choose the easiest option for you:
- **Cloudflare Email Routing** (free, unlimited)
- **SendGrid Inbound Parse** (free tier: 100/day)
- **Mailgun Routes** (free trial)

### Step 3: Test
- Send an email through the app
- Reply to it (regular Reply, not Reply All)
- Watch it appear in the app automatically!

## Why This Works Better

**Reply-To vs BCC Comparison:**

| Method | Works with "Reply"? | Works with "Reply All"? |
|--------|--------------------|-----------------------|
| Reply-To | ✅ Yes | ✅ Yes |
| BCC | ❌ No | ✅ Yes |

**The Problem with BCC:**
- You send email with BCC to `tracker@yourdomain.com`
- Recipient clicks "Reply" → BCC is lost
- Only "Reply All" keeps the BCC in thread
- Most people just click "Reply"

**The Reply-To Solution:**
- Email shows Reply-To: `replies+FO-ABC12345@yourdomain.com`
- Recipient clicks "Reply" → Goes to Reply-To address
- Catch-all forwarding sends to webhook
- 100% capture rate!

## Detailed Setup Instructions

### Option A: Cloudflare Email Routing (Recommended - FREE!)

1. Add domain to Cloudflare (free account)
2. Enable **Email Routing**
3. Create custom address: `replies+*`
4. Forward to webhook (create Worker or use HTTP forwarding)
5. Done! Cloudflare handles DNS automatically

### Option B: SendGrid Inbound Parse

1. Sign up at sendgrid.com
2. Go to Settings → Inbound Parse
3. Add domain: `yourdomain.com`
4. Webhook URL: `https://your-project.supabase.co/functions/v1/receive-email`
5. Configure MX records:
   ```
   MX  replies.yourdomain.com  mx.sendgrid.net  10
   ```

### Option C: Zapier (No Domain Control Needed)

1. Create Zap: Email Received → Webhook
2. Filter for `replies+*@yourdomain.com`
3. Parse email data
4. POST to webhook URL

## Webhook Format

The webhook expects this JSON:
```json
{
  "from": "customer@example.com",
  "to": ["replies+FO-ABC12345@yourdomain.com"],
  "subject": "Re: Your email",
  "body": "Email content",
  "messageId": "<msg-id@domain>",
  "inReplyTo": "<parent-msg-id>",
  "date": "2025-01-15T10:30:00Z"
}
```

## Troubleshooting

**Replies not appearing?**
- Test forwarding: Send email to `replies+test@yourdomain.com`
- Check Supabase function logs
- Verify webhook URL in forwarding service

**Reply-To not set?**
- Check domain is saved in Settings
- Look for errors in browser console

## Cost

All options have free tiers:
- **Cloudflare**: Unlimited, forever free
- **SendGrid**: 100 emails/day free
- **Mailgun**: 5,000/month free trial
- **Zapier**: 100 tasks/month free

Start with Cloudflare for unlimited free tracking!
