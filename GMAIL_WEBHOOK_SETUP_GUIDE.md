# Gmail Webhook Setup Guide

This guide will walk you through setting up Gmail push notifications so that incoming email replies are automatically tracked in the app.

## Overview

The webhook system allows the app to receive real-time notifications from Gmail when new emails arrive. This enables automatic tracking of email replies without manual intervention.

## Prerequisites

1. Gmail account connected in the app (Settings → Email)
2. Google Cloud Project with Gmail API enabled
3. OAuth 2.0 credentials configured

## Step-by-Step Setup

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your existing project (the one with Gmail API enabled)

### Step 2: Enable Pub/Sub API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Cloud Pub/Sub API"
3. Click on it and click **Enable** (if not already enabled)

### Step 3: Create a Pub/Sub Topic

1. In the left sidebar, navigate to **Pub/Sub** → **Topics**
2. Click **Create Topic** button at the top
3. Enter a Topic ID: `gmail-notifications` (or any name you prefer)
4. Leave other settings as default
5. Click **Create**

### Step 4: Grant Gmail Permission to Publish

Gmail needs permission to publish messages to your topic:

1. After creating the topic, you'll see it in the topics list
2. Click on your topic name to open its details
3. Go to the **Permissions** tab
4. Click **Add Principal**
5. In the "New principals" field, enter:
   ```
   gmail-api-push@system.gserviceaccount.com
   ```
6. In the "Select a role" dropdown, choose:
   ```
   Pub/Sub → Pub/Sub Publisher
   ```
7. Click **Save**

### Step 5: Get Your Webhook URL

Your Supabase webhook URL is:
```
https://siujmppdeumvwwvyqcsq.supabase.co/functions/v1/gmail-webhook
```

This URL is displayed in the app under Settings → Email → Gmail Webhook Setup.

### Step 6: Create a Push Subscription

Now create a subscription that sends messages to your app:

1. Still in Google Cloud Console, go to **Pub/Sub** → **Subscriptions**
2. Click **Create Subscription** button
3. Configure the subscription:
   - **Subscription ID**: `gmail-webhook-subscription` (or any name)
   - **Select a Cloud Pub/Sub topic**: Choose the topic you created earlier
   - **Delivery type**: Select **Push**
   - **Endpoint URL**: Paste your webhook URL from Step 5
   - **Enable authentication**: Leave unchecked (the webhook validates requests internally)
   - Leave other settings as default
4. Click **Create**

### Step 7: Configure in the App

1. Go to your app → **Settings** → **Email** tab
2. Scroll to the **Gmail Webhook Setup** section
3. You should see your Gmail account is connected
4. Enter your Pub/Sub topic name in the format:
   ```
   projects/YOUR_PROJECT_ID/topics/gmail-notifications
   ```
   - Replace `YOUR_PROJECT_ID` with your actual Google Cloud project ID
   - Replace `gmail-notifications` with your topic name if different
5. Click **Enable Webhook**

### Step 8: Verify Setup

1. The webhook status should change to "Active" with a green indicator
2. You'll see the expiration date (7 days from activation)
3. Send a test email from the app to yourself
4. Reply to that email from Gmail
5. The reply should appear in the app's activity timeline within a few seconds

## Important Notes

### Expiration and Renewal

- Gmail watch subscriptions expire after 7 days
- You'll need to renew the subscription before it expires
- The app will show a warning when expiration is near
- To renew, simply click "Stop Webhook" then "Enable Webhook" again

### Troubleshooting

**Webhook not receiving notifications:**
1. Check that the Pub/Sub topic permissions are correct
2. Verify the subscription endpoint URL is exactly correct
3. Check the Supabase edge function logs for errors
4. Ensure your Gmail account is still connected

**Subscription expired:**
1. Go to Settings → Email → Gmail Webhook Setup
2. Click "Stop Webhook"
3. Click "Enable Webhook" again with the same topic name

**Pub/Sub errors:**
1. Verify the Gmail service account has Publisher permissions
2. Check that the subscription endpoint is accessible
3. Review Google Cloud Console → Pub/Sub → Subscriptions for delivery errors

### Security

- The webhook endpoint validates all incoming requests
- Only authenticated Gmail notifications are processed
- Email data is encrypted in transit and at rest
- RLS policies ensure users only see their own email data

## How It Works

1. When you enable the webhook, the app calls Gmail API's `watch()` endpoint
2. Gmail creates a watch subscription and starts monitoring your inbox
3. When new emails arrive, Gmail publishes a notification to your Pub/Sub topic
4. The Pub/Sub subscription forwards the notification to your webhook endpoint
5. The webhook fetches the new email details from Gmail API
6. The system matches the email to existing threads/contacts using:
   - FreightOps tracking token in subject line (`[FO-ABC12345]`)
   - In-Reply-To email headers
   - Gmail thread ID
   - Sender email address matching
7. The email is saved to the database and appears in activity timelines

## Architecture Diagram

```
Gmail Inbox
    ↓
    ↓ (new email arrives)
    ↓
Gmail API (watches inbox)
    ↓
    ↓ (publishes notification)
    ↓
Google Pub/Sub Topic
    ↓
    ↓ (push subscription)
    ↓
Supabase Edge Function (gmail-webhook)
    ↓
    ↓ (fetches full email)
    ↓
Gmail API (get message details)
    ↓
    ↓ (matches to entities)
    ↓
Supabase Database (email_activities)
    ↓
    ↓ (real-time subscription)
    ↓
App UI (activity timeline)
```

## Alternative: Manual Polling

If you prefer not to set up webhooks, email replies can still be tracked manually:
- Outbound emails are always tracked automatically
- Inbound replies can be forwarded to a specific address
- Users can manually log email interactions

However, the webhook system provides the best user experience with automatic, real-time tracking.
