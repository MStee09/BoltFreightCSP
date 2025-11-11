# Complete Email System Guide

## Overview

Your app has a comprehensive email tracking system that integrates with Gmail to send, receive, and track all customer/carrier communications. It works similarly to HubSpot's email tracking - every email is logged, threaded, and visible in entity timelines.

---

## 🏗️ Architecture

### 1. **Database Tables**

#### `email_activities` - Central Email Log
Stores every email (sent and received) with full context:
```
- id (uuid) - Unique identifier
- tracking_code (text) - Unique tracking code (e.g., "LXYZ123ABC")
- message_id (text) - Gmail message ID
- thread_id (text) - Gmail thread ID for conversation grouping
- in_reply_to_message_id (text) - Links replies to original emails
- csp_event_id (uuid) - Links to CSP events
- customer_id (uuid) - Links to customers
- carrier_id (uuid) - Links to carriers
- subject (text) - Email subject
- from_email (text) - Sender email
- from_name (text) - Sender name
- to_emails (text[]) - Array of recipients
- cc_emails (text[]) - Array of CC recipients
- body_text (text) - Plain text body
- body_html (text) - HTML body
- direction (text) - 'outbound' or 'inbound'
- sent_at (timestamptz) - When sent/received
- created_by (uuid) - User who sent (outbound only)
- is_thread_starter (boolean) - First email in thread
- metadata (jsonb) - Attachments, labels, etc.
```

#### `user_gmail_tokens` - OAuth Tokens
Stores Gmail OAuth credentials for each user:
```
- user_id (uuid) - Links to user
- email_address (text) - Gmail address
- access_token (text) - OAuth access token
- refresh_token (text) - OAuth refresh token
- token_expiry (timestamptz) - When token expires
- scope (text) - OAuth scopes granted
```

#### `user_gmail_credentials` - App Password Fallback
Alternative to OAuth (simpler setup):
```
- user_id (uuid) - Links to user
- email_address (text) - Gmail address
- app_password (text, encrypted) - Gmail App Password
```

#### `gmail_watch_subscriptions` - Push Notifications
Manages Gmail push notifications for incoming emails:
```
- user_id (uuid) - Links to user
- email_address (text) - Gmail address being watched
- history_id (text) - Gmail history ID for incremental sync
- expiration (timestamptz) - When watch expires (7 days max)
- is_active (boolean) - Whether watch is active
```

#### `email_templates` - Email Templates
Pre-written email templates for common scenarios:
```
- name (text) - Template name
- subject (text) - Email subject template
- body (text) - Email body template (supports {{variables}})
- recipient_type (text) - 'customer', 'carrier', or 'general'
- is_active (boolean) - Template enabled/disabled
```

---

## 📧 Sending Emails (Outbound Flow)

### Step 1: User Composes Email
**Component:** `EmailComposeDialog.jsx`

The user clicks "Send Email" from:
- Customer detail page
- Carrier detail page
- CSP event detail page

The dialog opens with:
- **Auto-populated recipients**: Pulls from carrier contacts or customer emails
- **Tracking code**: Generated automatically (e.g., "LXYZ123ABC")
- **Template options**: User can select from pre-made templates
- **Thread context**: If replying, includes `inReplyTo` and `threadId`

### Step 2: Template Application
```javascript
// Templates support variables:
Subject: "CSP Event: {{csp_title}} - Update"
Body: "Hi {{contact_name}},\n\nRegarding {{csp_title}}..."

// Variables are replaced with actual data:
{{csp_title}} → "Q1 2024 LTL RFP"
{{contact_name}} → "John Smith"
{{customer_name}} → "ABC Logistics"
{{carrier_name}} → "XPO Logistics"
```

### Step 3: Email Sent via Edge Function
**Edge Function:** `send-email`

The frontend calls the Supabase Edge Function:
```javascript
const response = await supabase.functions.invoke('send-email', {
  body: {
    trackingCode: 'LXYZ123ABC',
    to: ['carrier@example.com'],
    cc: ['user@company.com'],
    subject: 'CSP Event: Q1 2024 LTL RFP',
    body: 'Email body text...',
    cspEventId: 'uuid-of-csp',
    customerId: 'uuid-of-customer',
    carrierId: 'uuid-of-carrier',
    inReplyTo: 'previous-message-id', // if replying
    threadId: 'thread-id-123' // if replying
  }
});
```

### Step 4: Edge Function Processes Request

#### A. OAuth Flow (Preferred)
```typescript
// 1. Get user's Gmail OAuth tokens from database
const { data: oauthTokens } = await supabase
  .from('user_gmail_tokens')
  .select('*')
  .eq('user_id', user.id)
  .maybeSingle();

// 2. Check if access token is expired
if (now >= tokenExpiry) {
  // 3. Refresh access token using refresh_token
  accessToken = await refreshAccessToken(
    oauthTokens.refresh_token,
    clientId,
    clientSecret
  );

  // 4. Update database with new token
  await supabase
    .from('user_gmail_tokens')
    .update({ access_token: accessToken })
    .eq('user_id', user.id);
}

// 5. Send email via Gmail API
const messageId = await sendViaGmailAPI(
  accessToken,
  fromEmail,
  to,
  cc,
  subject,
  body,
  trackingCode,
  inReplyTo
);
```

**Gmail API Email Format:**
```
From: user@company.com
To: carrier@example.com
Cc: manager@company.com
Subject: CSP Event: Q1 2024 LTL RFP
X-CSP-Tracking-Code: LXYZ123ABC
In-Reply-To: <previous-message-id>  (if replying)
References: <previous-message-id>   (if replying)

Email body text...
```

#### B. App Password Flow (Fallback)
```typescript
// 1. Get user's Gmail App Password credentials
const { data: appPasswordCreds } = await supabase
  .from('user_gmail_credentials')
  .select('*')
  .eq('user_id', user.id)
  .maybeSingle();

// 2. Send via SMTP using Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: appPasswordCreds.email_address,
    pass: appPasswordCreds.app_password
  }
});

const info = await transporter.sendMail({
  from: appPasswordCreds.email_address,
  to: to.join(', '),
  cc: cc.join(', '),
  subject: subject,
  text: body,
  headers: {
    'X-CSP-Tracking-Code': trackingCode,
    'In-Reply-To': inReplyTo  // if replying
  }
});

messageId = info.messageId;
```

### Step 5: Record in Database
```typescript
// Insert into email_activities table
await supabase.from('email_activities').insert({
  tracking_code: trackingCode,
  message_id: messageId,
  thread_id: threadId || generateThreadId(subject),
  in_reply_to_message_id: inReplyTo || null,
  csp_event_id: cspEventId || null,
  customer_id: customerId || null,
  carrier_id: carrierId || null,
  subject: subject,
  from_email: fromEmail,
  from_name: user.user_metadata?.full_name,
  to_emails: to,
  cc_emails: cc,
  body_text: body,
  direction: 'outbound',
  sent_at: new Date().toISOString(),
  created_by: user.id,
  is_thread_starter: !inReplyTo
});
```

### Step 6: Activity Timeline Trigger
**Trigger:** `sync_email_to_interactions()`

Automatically creates timeline entries in the `interactions` table:

```sql
-- Customer timeline
INSERT INTO interactions (
  entity_type: 'customer',
  entity_id: customer_id,
  interaction_type: 'email',
  summary: 'CSP Event: Q1 2024 LTL RFP',
  details: 'Email sent: CSP Event: Q1 2024 LTL RFP',
  metadata: {
    email_activity_id: uuid,
    direction: 'outbound',
    thread_id: 'thread-123'
  }
);

-- Carrier timeline
INSERT INTO interactions (
  entity_type: 'carrier',
  entity_id: carrier_id,
  interaction_type: 'email',
  summary: 'CSP Event: Q1 2024 LTL RFP',
  details: 'Email sent: CSP Event: Q1 2024 LTL RFP',
  metadata: {
    email_activity_id: uuid,
    direction: 'outbound',
    thread_id: 'thread-123'
  }
);

-- CSP-linked customers/carriers get entries too
```

---

## 📬 Receiving Emails (Inbound Flow)

### Step 1: Gmail Push Notifications
**Gmail Watch API** sends push notifications when new emails arrive.

When user connects Gmail OAuth:
```typescript
// 1. Request Gmail to watch mailbox
const watchResponse = await fetch(
  'https://gmail.googleapis.com/gmail/v1/users/me/watch',
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({
      topicName: 'projects/YOUR_PROJECT/topics/gmail-notifications',
      labelIds: ['INBOX']
    })
  }
);

// 2. Store subscription in database
await supabase.from('gmail_watch_subscriptions').insert({
  user_id: user.id,
  email_address: emailAddress,
  history_id: watchResponse.historyId,
  expiration: watchResponse.expiration,
  is_active: true
});
```

**Gmail Watch expires after 7 days** - needs to be renewed.

### Step 2: Gmail Sends Push Notification
When new email arrives, Gmail sends POST to:
```
https://your-supabase-url.supabase.co/functions/v1/gmail-webhook
```

**Payload:**
```json
{
  "message": {
    "data": "base64-encoded-data",
    "messageId": "google-message-id",
    "publishTime": "2024-01-15T10:30:00Z"
  },
  "subscription": "projects/YOUR_PROJECT/subscriptions/gmail-notifications"
}
```

**Decoded data:**
```json
{
  "emailAddress": "user@company.com",
  "historyId": "12345678"
}
```

### Step 3: Edge Function Processes Webhook
**Edge Function:** `gmail-webhook`

```typescript
// 1. Decode notification
const decodedData = JSON.parse(atob(notification.message.data));
const { emailAddress, historyId } = decodedData;

// 2. Find active subscription
const { data: subscription } = await supabase
  .from('gmail_watch_subscriptions')
  .select('*')
  .eq('email_address', emailAddress)
  .eq('is_active', true)
  .single();

// 3. Get user's OAuth tokens
const { data: userTokens } = await supabase
  .from('user_gmail_tokens')
  .select('access_token, refresh_token')
  .eq('user_id', subscription.user_id)
  .single();

// 4. Fetch new emails since last historyId
const historyResponse = await fetch(
  `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${subscription.history_id}`,
  {
    headers: { 'Authorization': `Bearer ${userTokens.access_token}` }
  }
);

const historyData = await historyResponse.json();

// 5. Process each new message
for (const historyItem of historyData.history) {
  if (historyItem.messagesAdded) {
    for (const messageAdded of historyItem.messagesAdded) {
      await processMessage(
        supabaseClient,
        userTokens.access_token,
        messageAdded.message.id
      );
    }
  }
}

// 6. Update historyId for next sync
await supabase
  .from('gmail_watch_subscriptions')
  .update({ history_id: historyId })
  .eq('id', subscription.id);
```

### Step 4: Process Individual Message
```typescript
async function processMessage(supabase, accessToken, messageId) {
  // 1. Fetch full message from Gmail API
  const messageResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  const message = await messageResponse.json();

  // 2. Extract headers
  const headers = message.payload.headers;
  const subject = headers.find(h => h.name === 'Subject')?.value;
  const from = headers.find(h => h.name === 'From')?.value;
  const to = headers.find(h => h.name === 'To')?.value;
  const cc = headers.find(h => h.name === 'Cc')?.value;
  const trackingCode = headers.find(h => h.name === 'X-CSP-Tracking-Code')?.value;
  const inReplyTo = headers.find(h => h.name === 'In-Reply-To')?.value;

  // 3. Extract body (handles multipart MIME)
  const bodyText = extractBodyText(message.payload);
  const bodyHtml = extractBodyHtml(message.payload);

  // 4. Match to entities via tracking code or email addresses
  let cspEventId, customerId, carrierId;

  if (trackingCode) {
    // Look up original email by tracking code
    const { data: originalEmail } = await supabase
      .from('email_activities')
      .select('csp_event_id, customer_id, carrier_id')
      .eq('tracking_code', trackingCode)
      .maybeSingle();

    cspEventId = originalEmail?.csp_event_id;
    customerId = originalEmail?.customer_id;
    carrierId = originalEmail?.carrier_id;
  } else {
    // Match by sender email address
    const fromEmail = extractEmail(from);

    // Check if sender is a known carrier
    const { data: carrier } = await supabase
      .from('carriers')
      .select('id')
      .or(`carrier_rep_email.eq.${fromEmail},billing_contact_email.eq.${fromEmail}`)
      .maybeSingle();

    if (carrier) {
      carrierId = carrier.id;
    }

    // Check if sender is a known customer
    // (Customer emails are usually in notes field)
    const { data: customers } = await supabase
      .from('customers')
      .select('id, notes')
      .ilike('notes', `%${fromEmail}%`);

    if (customers && customers.length > 0) {
      customerId = customers[0].id;
    }
  }

  // 5. Find thread ID (if part of existing thread)
  let threadId = message.threadId;

  if (inReplyTo) {
    const { data: parentEmail } = await supabase
      .from('email_activities')
      .select('thread_id')
      .eq('message_id', inReplyTo)
      .maybeSingle();

    if (parentEmail) {
      threadId = parentEmail.thread_id;
    }
  }

  // 6. Insert into email_activities
  const { error } = await supabase
    .from('email_activities')
    .insert({
      tracking_code: trackingCode || generateTrackingCode(),
      message_id: messageId,
      thread_id: threadId,
      in_reply_to_message_id: inReplyTo || null,
      csp_event_id: cspEventId || null,
      customer_id: customerId || null,
      carrier_id: carrierId || null,
      subject: subject,
      from_email: extractEmail(from),
      from_name: extractName(from),
      to_emails: parseEmailArray(to),
      cc_emails: parseEmailArray(cc),
      body_text: bodyText,
      body_html: bodyHtml,
      direction: 'inbound',
      sent_at: new Date(parseInt(message.internalDate)),
      created_at: new Date().toISOString(),
      created_by: null  // null for inbound
    });

  // 7. Trigger automatically logs to interactions table
}
```

### Step 5: Activity Timeline Trigger (Again)
Same `sync_email_to_interactions()` trigger runs, creating timeline entries for customer/carrier/CSP.

---

## 🔗 Email Threading & Conversation Tracking

### Thread Management
```typescript
// When sending first email in thread
thread_id = generateThreadId(subject);  // Creates unique thread ID
is_thread_starter = true;

// When replying to existing email
thread_id = originalEmail.thread_id;  // Uses same thread ID
in_reply_to_message_id = originalEmail.message_id;
is_thread_starter = false;

// Gmail's In-Reply-To and References headers maintain threading
```

### Viewing Email Threads
**Component:** `EmailTimeline.jsx`

Emails are grouped by `thread_id` and displayed chronologically:
```javascript
// Fetch all emails for entity
const { data: emails } = await supabase
  .from('email_activities')
  .select('*')
  .eq('customer_id', customerId)
  .order('sent_at', { ascending: true });

// Group by thread_id
const threads = groupBy(emails, 'thread_id');

// Render each thread with expand/collapse
threads.map(thread => (
  <ThreadGroup>
    <ThreadStarter email={thread[0]} />
    {thread.slice(1).map(reply => (
      <ThreadReply email={reply} indent={true} />
    ))}
  </ThreadGroup>
));
```

---

## 📊 Timeline Integration

### How Emails Appear in Timelines

Every email creates an entry in the `interactions` table via the trigger:

**Customer Timeline:**
```
📧 Email: "CSP Event: Q1 2024 LTL RFP"
   Sent to carrier@example.com
   2 hours ago
```

**Carrier Timeline:**
```
📧 Email: "CSP Event: Q1 2024 LTL RFP"
   From user@company.com
   2 hours ago
```

**CSP Event Timeline:**
Emails propagate to both customer AND all assigned carriers.

### Timeline Query
```javascript
// Fetch all activities for customer (including emails)
const { data: activities } = await supabase
  .from('interactions')
  .select('*')
  .eq('entity_type', 'customer')
  .eq('entity_id', customerId)
  .order('created_date', { ascending: false });

// Filter by type if needed
const emailActivities = activities.filter(a => a.interaction_type === 'email');
```

---

## 🔐 Security & Permissions

### OAuth Flow Security
- **Tokens stored encrypted** in database
- **Refresh tokens** used to get new access tokens
- **Access tokens expire** after 1 hour
- **Automatic refresh** before sending emails

### RLS Policies
```sql
-- Users can view all email activities in their organization
CREATE POLICY "Authenticated users can view email activities"
  ON email_activities FOR SELECT
  TO authenticated
  USING (true);

-- Users can create email activities (when sending)
CREATE POLICY "Authenticated users can create email activities"
  ON email_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can only update their own sent emails
CREATE POLICY "Users can update their own email activities"
  ON email_activities FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());
```

---

## 🎯 Use Cases

### 1. Sending CSP Event Email to Carrier
```
User clicks "Email" on Carrier detail page
→ Dialog opens with carrier email pre-filled
→ User selects "CSP RFP Request" template
→ Template populates subject + body with CSP details
→ User clicks Send
→ Edge function sends via Gmail API
→ Email recorded in email_activities
→ Trigger creates interaction entries
→ Email appears in Customer, Carrier, and CSP timelines
```

### 2. Carrier Replies to CSP Email
```
Carrier replies to email
→ Gmail receives reply
→ Gmail sends push notification to webhook
→ Webhook processes new message
→ Extracts tracking code from original email
→ Links reply to original CSP/Customer/Carrier
→ Records in email_activities with direction='inbound'
→ Trigger creates interaction entries
→ Reply appears in all relevant timelines
→ Thread is maintained via thread_id
```

### 3. User Views Email History
```
User navigates to Customer detail page
→ Opens Activity Timeline tab
→ Timeline queries interactions table
→ Shows all emails (sent + received)
→ Emails grouped by thread
→ Click to expand thread and see all replies
→ Click email to view full body
```

---

## 🛠️ Configuration Required

### For OAuth Flow:
1. Create Google Cloud Project
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Store client_id and client_secret in `system_settings` table
5. Users connect Gmail via Settings → Integrations

### For App Password Flow:
1. User enables 2FA on Gmail
2. User generates App Password in Gmail settings
3. User enters email + app password in app Settings
4. Stored in `user_gmail_credentials` table

### For Push Notifications:
1. Set up Google Cloud Pub/Sub topic
2. Configure Gmail webhook URL in Google Cloud Console
3. Ensure webhook edge function is publicly accessible
4. Watches automatically renewed every 6 days

---

## 📈 Data Flow Summary

```
OUTBOUND EMAIL:
User composes → Edge function sends via Gmail/SMTP → Records in email_activities → Trigger logs to interactions → Appears in timelines

INBOUND EMAIL:
Gmail receives → Push notification → Webhook edge function → Fetches from Gmail API → Records in email_activities → Trigger logs to interactions → Appears in timelines

TIMELINE DISPLAY:
User views timeline → Queries interactions table → Groups by thread_id → Displays emails with full context
```

---

## 🎨 Key Features

✅ **Automatic Tracking** - Every email logged automatically
✅ **Thread Management** - Replies grouped with original emails
✅ **Entity Linking** - Emails linked to customers, carriers, and CSPs
✅ **Timeline Integration** - All emails appear in relevant timelines
✅ **Bidirectional** - Tracks both sent and received emails
✅ **Template Support** - Pre-written templates with variable replacement
✅ **Reply Detection** - Automatically detects and links replies
✅ **Push Notifications** - Real-time inbound email detection
✅ **OAuth + App Password** - Two authentication methods supported
✅ **Secure** - Encrypted tokens, RLS policies, proper permissions

This system provides complete visibility into all customer and carrier communications!
