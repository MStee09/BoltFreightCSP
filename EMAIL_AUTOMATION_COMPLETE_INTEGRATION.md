# Email System — COMPLETE Automation Integration

## ✅ YES - Nothing Falls Through The Cracks!

Every email is now **fully integrated** into the automation, notification, and AI systems. Here's the complete flow:

---

## 🔄 Automation Flow: How It All Connects

### **1. Outbound Email Sent**
```
User sends email → EmailComposeDialog
  ↓
send-email Edge Function
  ↓
Creates email_activities record
  - owner_id: set
  - thread_status: 'awaiting_reply'
  - last_activity_at: now()
  - freightops_thread_token: [FO-CSP-####]
  ↓
Triggers:
  ✓ create_alert_for_stalled_email (monitors for 7 days)
  ✓ log_email_to_audit (complete audit trail)
  ↓
Optional: Creates follow-up task
  - due_date: user selected (1, 3, 5, 7 days)
  - auto_close_on_reply: true
  ↓
Automation System monitors both:
  → Email thread status
  → Follow-up task due date
```

---

### **2. No Reply After 3 Days — First Alert**
```
Automation: unanswered_email_reminder
  Runs: Daily (via run-automations)
  ↓
Checks: email_activities WHERE
  - thread_status = 'awaiting_reply'
  - last_activity_at < 3 days ago
  - stalled_notification_sent = false
  ↓
Actions:
  ✓ Creates notification for thread owner
  ✓ Marks stalled_notification_sent = true
  ✓ Shows in NotificationBell component
  ✓ Appears in dashboard widget
```

**User sees:**
- 🔔 Notification: "No Reply Yet - No response after 3 days: [Subject]"
- Click → Takes to CSP/Customer/Carrier page

---

### **3. No Reply After 7 Days — Escalated**
```
Automation: stalled_email_detection
  Runs: Daily (via run-automations)
  ↓
Function: mark_stalled_threads()
  - Updates thread_status → 'stalled'
  ↓
Trigger: create_alert_for_stalled_email()
  - Auto-creates MEDIUM severity alert
  - Assigned to: owner_id
  - Entity: email_thread
  ↓
Trigger: create_notification_for_email_event()
  - Creates notification
  ↓
Shows in:
  ✓ Dashboard AlertsPanel (🟡 Yellow badge)
  ✓ NotificationBell (red dot)
  ✓ Daily digest email
```

**User sees:**
- 🚨 Alert: "Email thread needs follow-up: [Subject]"
- Days stalled: 7+
- Severity: Medium
- Action button → Opens email thread

---

### **4. Follow-Up Task Overdue — HIGH Priority**
```
User created follow-up task (e.g., 3 days)
  ↓
3 days pass, no reply received
  ↓
Automation: overdue_followup_tasks
  Runs: Every 6 hours (via run-automations)
  ↓
Checks: email_follow_up_tasks WHERE
  - status = 'pending'
  - due_date < now()
  ↓
Trigger: create_alert_for_overdue_followup()
  - Auto-creates HIGH severity alert
  - Assigned to: task owner
  - Entity: followup_task
  ↓
Shows in:
  ✓ Dashboard AlertsPanel (🔴 Red badge)
  ✓ NotificationBell (urgent)
  ✓ Daily digest (highlighted)
```

**User sees:**
- 🔴 **HIGH PRIORITY** Alert: "Overdue email follow-up: [Task Title]"
- Days overdue: X
- Direct link to email thread
- Cannot be ignored

---

### **5. Reply Received — Auto-Resolution**
```
Inbound email detected by gmail-webhook
  ↓
Creates email_activities record
  - direction: 'inbound'
  - thread_id: matched
  ↓
Triggers (automatic):
  ✓ update_email_thread_status()
      → Changes status to 'active'
  ✓ auto_complete_followup_tasks()
      → Marks follow-up task: 'auto_completed'
  ✓ auto_resolve_email_alerts()
      → Resolves stalled email alert
  ✓ auto_resolve_task_alerts()
      → Resolves overdue task alert
  ✓ create_notification_for_email_event()
      → Notifies owner: "New Email Reply"
  ↓
User notification:
  🔔 "New Email Reply from [Sender]"
  ✓ All related alerts auto-resolved
  ✓ All related tasks auto-completed
  ✓ Timeline updated
```

**Result:** ZERO manual cleanup needed!

---

## 📊 Daily Digest Integration

### **Morning Email Digest**
```
Automation: daily_digest (runs 6am)
  ↓
Function: get_email_metrics_for_digest(user_id)
  ↓
Calculates:
  - awaiting_replies: Count of threads awaiting reply
  - stalled_threads: Count of threads stalled > 7 days
  - overdue_followups: Count of overdue tasks
  - due_today: Count of tasks due today
  - received_today: Count of new inbound emails
  ↓
Stores in: daily_digests table
  - email_metrics: jsonb
  ↓
Email sent to user with:
  ✓ "You have 5 emails awaiting replies"
  ✓ "3 follow-up tasks due today"
  ✓ "2 threads stalled (need attention)"
  ✓ Direct links to each
```

---

## 🎯 Dashboard Integration

### **Dashboard Widgets Show:**

**1. My Open Threads Widget**
```sql
SELECT * FROM email_activities
WHERE owner_id = current_user
  AND thread_status IN ('awaiting_reply', 'active')
  AND is_thread_starter = true
ORDER BY last_activity_at DESC
```

Shows:
- Subject line
- Days since last activity
- Status badge (Awaiting/Active/Stalled)
- Click → Opens thread

**2. Overdue Follow-Ups Widget**
```sql
SELECT * FROM get_due_followups(current_user)
WHERE due_date < now()
ORDER BY days_overdue DESC
```

Shows:
- Task title
- Days overdue (red if > 3)
- Customer/Carrier context
- Click → Opens email thread

**3. AlertsPanel Component**
Automatically includes:
- Stalled email alerts (🟡 Medium)
- Overdue task alerts (🔴 High)
- Grouped by severity
- Dismissible with reason tracking

---

## 🤖 AI Chatbot Integration

### **Dashboard Chatbot Knows Everything**
```
User: "What emails need my attention?"
  ↓
Chatbot queries:
  - email_activities (stalled threads)
  - email_follow_up_tasks (overdue tasks)
  - alerts (email-related alerts)
  ↓
Responds with:
  "You have 3 emails that need attention:
   1. [Subject] - Stalled for 8 days (Acme Logistics)
   2. [Subject] - Follow-up overdue by 2 days (FedEx)
   3. [Subject] - Awaiting reply for 4 days (UPS)

   Would you like me to draft follow-up emails?"
```

**AI can:**
- List all pending email tasks
- Summarize stalled threads
- Suggest follow-up actions
- Draft follow-up emails using templates

---

## 🔔 Notification System Integration

### **Real-Time Notifications**

**Inbound Email:**
```
Trigger: create_notification_for_email_event()
  ↓
Creates notification:
  - type: 'email_received'
  - title: "New Email Reply"
  - message: "From: [sender] - Subject: [subject]"
  - action_url: /pipeline/[csp_id] or /customers/[id]
  ↓
NotificationBell component:
  ✓ Red dot appears
  ✓ Toast notification (optional)
  ✓ Click notification → Opens thread
```

**Stalled Email:**
```
Trigger: create_alert_for_stalled_email()
  ↓
Creates both:
  1. Alert (in AlertsPanel)
  2. Notification (in NotificationBell)
  ↓
User sees:
  - Dashboard alert badge
  - Notification bell red dot
  - Toast: "Email needs attention"
```

---

## 🎛️ Automation Rules Dashboard

### **Settings → Automation Management**

Users can view/configure:

**1. stalled_email_detection**
- Status: ✅ Enabled
- Runs: Daily at 3am
- Action: Marks threads stalled after 7 days
- Last run: 2 hours ago
- Success: 3 threads marked

**2. overdue_followup_tasks**
- Status: ✅ Enabled
- Runs: Every 6 hours
- Action: Creates HIGH alerts for overdue tasks
- Last run: 45 minutes ago
- Success: 2 alerts created

**3. unanswered_email_reminder**
- Status: ✅ Enabled
- Runs: Daily at 9am
- Action: Notifies after 3 days no reply
- Last run: 3 hours ago
- Success: 5 notifications sent

---

## 📈 Complete Audit Trail

### **Every Action Logged**

**1. email_audit_log**
```sql
- Every send/receive event
- Timestamp, sender, recipients
- Message IDs, tracking codes
- Entity context (CSP/Customer/Carrier)
```

**2. automation_logs**
```sql
- Every automation run
- Success/failure status
- Execution time
- Results (threads processed, alerts created)
```

**3. Queryable History**
```sql
-- What automations ran today?
SELECT * FROM automation_logs
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- What emails were auto-escalated?
SELECT * FROM email_activities
WHERE thread_status = 'stalled'
  AND updated_at >= CURRENT_DATE;

-- What tasks auto-completed from replies?
SELECT * FROM email_follow_up_tasks
WHERE status = 'auto_completed'
  AND completed_at >= CURRENT_DATE;
```

---

## ⚙️ How To Schedule Automation

### **Production Setup (Supabase Cron)**

Add to Supabase Dashboard → Database → Cron Jobs:

```sql
-- Run all email automations every hour
SELECT cron.schedule(
  'run-email-automations',
  '0 * * * *',  -- Every hour
  $$
  SELECT net.http_post(
    url:='https://[PROJECT].supabase.co/functions/v1/run-automations',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
    body:='{"ruleType": "all"}'::jsonb
  );
  $$
);

-- Or run specific automations at different intervals:

-- Overdue tasks every 6 hours
SELECT cron.schedule(
  'overdue-followup-tasks',
  '0 */6 * * *',
  $$ ... body:='{"ruleType": "overdue_followup_tasks"}' ... $$
);

-- Stalled emails once daily
SELECT cron.schedule(
  'stalled-email-detection',
  '0 3 * * *',
  $$ ... body:='{"ruleType": "stalled_email_detection"}' ... $$
);

-- Unanswered reminders daily at 9am
SELECT cron.schedule(
  'unanswered-email-reminder',
  '0 9 * * *',
  $$ ... body:='{"ruleType": "unanswered_email_reminder"}' ... $$
);
```

---

## ✅ Nothing Falls Through The Cracks — Guaranteed

### **Safety Net #1: Time-Based Triggers**
- 3 days → Notification
- 7 days → Alert + Status change
- Follow-up due → HIGH priority alert

### **Safety Net #2: Multiple Touchpoints**
- Dashboard widgets
- Notification bell
- Email digest
- Alert panel
- AI chatbot

### **Safety Net #3: Auto-Resolution**
- Reply received → Auto-closes everything
- No manual cleanup
- No stale alerts

### **Safety Net #4: Audit Trail**
- Every automation logged
- Every email logged
- Every alert logged
- Full transparency

### **Safety Net #5: Manual Override**
```sql
-- User can manually update status
SELECT update_thread_status_manual(
  'thread-id-123',
  'closed'
);
-- Auto-cancels related tasks and alerts
```

---

## 🎯 Summary: Complete Integration

| System | Integration | Status |
|--------|-------------|---------|
| **Email Activities** | Tracked with status | ✅ |
| **Follow-Up Tasks** | Auto-create, auto-complete | ✅ |
| **Alerts System** | Auto-create, auto-resolve | ✅ |
| **Notifications** | Real-time, actionable | ✅ |
| **Automation Engine** | 3 email-specific rules | ✅ |
| **Daily Digest** | Email metrics included | ✅ |
| **Dashboard Widgets** | Open threads, overdue tasks | ✅ |
| **AI Chatbot** | Context-aware responses | ✅ |
| **Audit Trail** | Complete logging | ✅ |
| **Scheduled Jobs** | Ready for cron setup | ✅ |

---

## 💪 Result: Industrial-Grade Email Management

**Nothing gets missed because:**
1. ✅ Every email tracked with owner
2. ✅ Every follow-up task monitored
3. ✅ Automatic escalation at 3 and 7 days
4. ✅ HIGH priority alerts for overdue tasks
5. ✅ Real-time notifications on replies
6. ✅ Auto-resolution when action taken
7. ✅ Daily digest summary
8. ✅ Dashboard visibility
9. ✅ AI chatbot awareness
10. ✅ Complete audit trail

**The system is RELENTLESS — it will NOT let emails fall through the cracks!**
