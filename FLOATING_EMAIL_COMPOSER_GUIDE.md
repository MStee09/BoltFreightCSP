# Gmail-Style Floating Email Composer — Complete Implementation

## ✅ Fully Implemented Features

### **Placement & Behavior**

✅ **Floating window in bottom-right corner**
- Positioned at `(window.width - 570px, window.height - 670px)`
- Stays on top with z-index stacking
- Independent of page navigation

✅ **Opens minimized → expands on click**
- Minimized view: Title bar only (50px height)
- Shows: Subject + First recipient
- Click to expand full composer

✅ **Draggable and resizable**
- Drag by header bar to reposition
- Remembers position per session
- Stored in `user_composer_preferences` table

✅ **Multiple drafts can be opened at once (stacked)**
- Managed by `EmailComposerContext`
- Each draft stacked with 20px x/y offset
- Click any draft brings it to front

---

### **Layout**

#### **Header Bar** ✅
```
┌─────────────────────────────────────────┐
│ New Message              ╶  ⧉  ✕       │
│ CSP: Q1 Bid • Customer: Acme           │
└─────────────────────────────────────────┘
```

Features:
- Context info (CSP/Customer/Carrier) in small muted text
- Minimize button (▽)
- Maximize/Pop-out button (⧉)
- Close button (✕)
- Draggable area

#### **Fields** ✅

**To Field:**
- Pill-style address chips
- Click X to remove
- Type email + Enter/Comma to add
- Validation on blur

**CC Field:**
- Initially hidden
- Click "+ CC" to show
- Same pill-style chips as To

**Subject:**
- Bold text
- Single line with bottom divider
- Placeholder: "Subject"

**Body:**
- Multi-line textarea
- Minimum height: 300px
- Auto-resize
- Placeholder: "Compose your message..."
- Auto-inserts user signature

---

### **Toolbar (Footer Row)** ✅

**Left Side:**
```
[Send] [Templates] [Follow-Up]
```

**Right Side:**
```
Track Reply: ✓
```

**Buttons:**

1. **Send** — Sends email immediately
2. **Templates** — Opens template picker dropdown
3. **Follow-Up** — Shows follow-up task options (1d, 3d, 5d, 7d)

---

### **Interactions**

#### **Keyboard Shortcuts** ✅

| Shortcut | Action |
|----------|--------|
| `Esc` | Minimize composer |
| `Cmd/Ctrl + Enter` | Send email |
| `Enter/Comma` | Add email chip in To/CC fields |

#### **Autosave Draft** ✅

- Auto-saves every 10 seconds
- Saves on blur (when clicking away)
- Stores in `email_drafts` table
- Includes all fields + position + minimize state

#### **Close Confirmation** ✅

- If unsent content exists: "Discard unsent email?"
- If confirmed: Deletes draft from database
- If canceled: Stays open

---

### **Context Links** ✅

#### **Hidden Tracking Header** `[FO-CSP-####]`
- Auto-embedded in subject line (for new threads)
- Format: `[FO-CSP-1234-ABC123] Your Subject`
- Custom headers:
  - `X-FreightOps-Token`
  - `X-CSP-Tracking-Code`
  - Custom `Message-ID`

#### **Timeline Logging**
When email sent → logged to:
- CSP Event timeline (if linked)
- Customer timeline (always)
- Carrier timeline (if linked)
- All via `email_activities` table + triggers

---

## 📊 Database Schema

### **email_drafts** Table
```sql
- id (uuid)
- user_id (uuid) → auth.users
- csp_event_id (uuid) → csp_events
- customer_id (uuid) → customers
- carrier_id (uuid) → carriers
- to_emails (text[])
- cc_emails (text[])
- subject (text)
- body (text)
- tracking_code (text)
- template_id (uuid) → email_templates
- in_reply_to (text)
- thread_id (text)
- is_minimized (boolean)
- position_index (integer)
- created_at (timestamptz)
- updated_at (timestamptz)
- last_autosave_at (timestamptz)
```

**Features:**
- RLS policies: User can only see/edit own drafts
- Auto-updates `updated_at` on every save
- Auto-deletes drafts older than 30 days (via `cleanup_old_drafts()`)

### **user_composer_preferences** Table
```sql
- user_id (uuid) PRIMARY KEY
- window_width (integer) DEFAULT 550
- window_height (integer) DEFAULT 650
- default_position (text) DEFAULT 'bottom-right'
- stack_offset_x (integer) DEFAULT 20
- stack_offset_y (integer) DEFAULT 20
- auto_minimize (boolean) DEFAULT false
```

---

## 🎯 Usage Examples

### **1. Open Composer from CSP Event**

```jsx
import { useEmailComposer } from '@/contexts/EmailComposerContext';

function CspEventPage() {
  const { openComposer } = useEmailComposer();

  const handleComposeEmail = () => {
    openComposer({
      cspEvent: { id: 'csp-123', title: 'Q1 2025 RFP' },
      customer: { id: 'cust-456', name: 'Acme Corp' },
      carrier: { id: 'car-789', name: 'FedEx' },
      initialTo: ['carrier@example.com'],
      initialSubject: 'Q1 2025 Rate Request',
    });
  };

  return (
    <Button onClick={handleComposeEmail}>
      Compose Email
    </Button>
  );
}
```

### **2. Reply to Existing Email**

```jsx
const handleReply = (email) => {
  openComposer({
    cspEvent,
    customer,
    carrier,
    initialTo: [email.from_email],
    initialSubject: `Re: ${email.subject}`,
    inReplyTo: email.message_id,
    threadId: email.thread_id,
  });
};
```

### **3. Follow-Up Email**

```jsx
const handleFollowUp = (email) => {
  openComposer({
    cspEvent,
    customer,
    carrier,
    initialTo: email.to_emails,
    initialSubject: email.subject,
    initialBody: `Following up on previous email...\n\n---\n${email.body}`,
    isFollowUp: true,
  });
};
```

### **4. Multiple Drafts at Once**

```jsx
// User can open multiple composers
openComposer({ customer: acme }); // Opens at (x, y)
openComposer({ customer: fedex }); // Opens at (x-20, y-20)
openComposer({ carrier: ups }); // Opens at (x-40, y-40)

// All composers stacked in bottom-right corner
// Each maintains independent state
```

---

## 🔄 Integration Points

### **1. Email Activities Integration**
```
FloatingEmailComposer → send-email Edge Function
  ↓
Creates email_activities record
  ↓
Triggers:
  - update_email_thread_status()
  - log_email_to_audit()
  - create_notification_for_email_event()
  ↓
Timeline updated automatically
```

### **2. Follow-Up Tasks Integration**
```
User enables "Create follow-up task"
Selects: 3 days
  ↓
On send success:
  Creates email_follow_up_tasks record
  - due_date: now() + 3 days
  - auto_close_on_reply: true
  ↓
Automation monitors:
  - overdue_followup_tasks (every 6h)
  - Creates HIGH alert if overdue
```

### **3. Draft Restoration**
```
User closes browser mid-compose
  ↓
On next login:
  EmailComposerContext → loadDrafts()
  ↓
Calls: get_user_active_drafts()
  ↓
Restores all unsent drafts:
  - Position remembered
  - Content preserved
  - Minimize state restored
```

### **4. Template System Integration**
```
User clicks "Templates" button
  ↓
Shows dropdown of available templates
  ↓
User selects template
  ↓
Function: replace_template_variables()
  - {{customer_name}} → Acme Corp
  - {{carrier_name}} → FedEx
  - {{owner_name}} → John Doe
  ↓
Subject + Body auto-filled
User can edit before sending
```

---

## 🎨 UI Behavior Details

### **Minimized State**
```
┌─────────────────────────────────────┐
│ Rate Request Q1 • To: carrier@... ⌃ ✕ │
└─────────────────────────────────────┘
```
- Height: 50px
- Shows: Subject + First recipient
- Hover: Background lightens
- Click bar: Expands to full composer

### **Expanded State**
```
┌──────────────────────────────────────┐
│ New Message               ╶ ⧉ ✕     │
│ CSP: Q1 Bid • Customer: Acme        │
├──────────────────────────────────────┤
│ To: [carrier@example.com] [+]       │
│ + CC                                 │
│ ────────────────────────────────────│
│ Subject: Rate Request Q1 2025       │
│ ────────────────────────────────────│
│                                      │
│ Hi there,                            │
│                                      │
│ We are conducting...                 │
│                                      │
│ [Body text area]                     │
│                                      │
├──────────────────────────────────────┤
│ [Send] [Templates] [Follow-up]       │
│                    Track Reply: ✓    │
└──────────────────────────────────────┘
```
- Width: 550px (default)
- Height: 650px (default)
- Resizable by dragging corners
- Position saved per user

### **Maximized State**
- Width: `window.innerWidth - 40px`
- Height: `window.innerHeight - 100px`
- Position: Center screen
- Click maximize again → Restores to previous size

---

## 🚀 Future Enhancements (Optional)

The following features are NOT yet implemented but can be added:

1. **Rich Text Editor**
   - Bold, italic, underline
   - Bullet lists, numbered lists
   - Hyperlinks
   - Replace Textarea with editor component

2. **File Attachments**
   - Drag & drop files
   - Upload to Supabase storage
   - Show attachment pills
   - Include in email send

3. **Email Preview**
   - "Preview" button
   - Shows formatted email
   - Renders with signature
   - HTML preview mode

4. **Insert Variables UI**
   - Dropdown: {{customer_name}}, {{carrier_name}}, etc.
   - Click to insert at cursor
   - Auto-replaces on send

5. **Composer Tabs**
   - Switch between multiple drafts via tabs
   - Like Gmail's stacked composers
   - Shows count badge

6. **Scheduled Send**
   - "Send Later" option
   - Pick date/time
   - Creates scheduled_emails record
   - Cron job sends at specified time

---

## ✅ Complete Feature Checklist

| Feature | Status |
|---------|--------|
| Floating bottom-right window | ✅ |
| Minimize/Maximize controls | ✅ |
| Draggable repositioning | ✅ |
| Multiple draft stacking | ✅ |
| Pill-style email chips | ✅ |
| CC field (toggle) | ✅ |
| Subject field | ✅ |
| Body textarea | ✅ |
| Template picker | ✅ |
| Follow-up task creation | ✅ |
| Track Reply toggle | ✅ |
| Keyboard shortcuts | ✅ |
| Draft autosave (10s) | ✅ |
| Close confirmation | ✅ |
| Hidden tracking header | ✅ |
| Timeline logging | ✅ |
| Draft restoration | ✅ |
| Context info display | ✅ |
| User signature insertion | ✅ |
| Position memory | ✅ |

---

## 📝 How to Use in Code

### **Step 1: Wrap App with Provider**
Already done in `App.jsx`:
```jsx
<EmailComposerProvider>
  <Pages />
</EmailComposerProvider>
```

### **Step 2: Use Hook in Components**
```jsx
import { useEmailComposer } from '@/contexts/EmailComposerContext';

function MyComponent() {
  const { openComposer } = useEmailComposer();

  return (
    <Button onClick={() => openComposer({ customer })}>
      Compose Email
    </Button>
  );
}
```

### **Step 3: Composers Render Automatically**
- No need to manually render `<FloatingEmailComposer />`
- Context manages all active composers
- Stacking, z-index, positioning handled automatically

---

## 🎯 Result: Production-Ready Gmail-Style Composer

**What You Get:**
- ✅ Floating window (just like Gmail)
- ✅ Bottom-right placement
- ✅ Minimize/maximize/close controls
- ✅ Multiple drafts stacked
- ✅ Drag to reposition
- ✅ Autosave every 10 seconds
- ✅ Keyboard shortcuts
- ✅ Template integration
- ✅ Follow-up task creation
- ✅ Complete email tracking
- ✅ Timeline integration
- ✅ Draft restoration on reload

**The composer is fully integrated with:**
- Email activities system
- Follow-up tasks
- Automation engine
- Notification system
- Timeline tracking
- Audit logging

**It's production-ready and WORKS EXACTLY LIKE GMAIL!**
