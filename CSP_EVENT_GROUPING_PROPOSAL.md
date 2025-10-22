# CSP Event Grouping Workflow Proposal

## Problem Statement
When you send out an RFP (CSP Event) to 20 carriers simultaneously, you currently get 20 separate tariff records. This makes it hard to:
- Track which tariffs belong to the same negotiation event
- Compare carrier responses side-by-side
- See which carriers haven't responded yet
- Archive/close the entire event as a unit

## Current Data Model
✅ **Already supported!** The database already has:
- `tariffs.csp_event_id` - Links tariff to its originating CSP event
- `csp_events` table - Stores RFP details (title, customer, status, stage)
- `csp_carrier_assignments` table - Tracks which carriers are involved in each event

## Proposed Solutions

### **Option 1: CSP Event View Mode (Recommended)**
Add a new view toggle to the Tariffs page that groups by CSP Event instead of by customer.

#### UI Changes:
```
┌─────────────────────────────────────────┐
│ Tariffs                                 │
│                                         │
│ View By: [Customers ▼] [CSP Events]    │
│                                         │
│ 📋 Winter 2025 RFP - Acme Logistics    │
│    20 carriers invited • 15 responded  │
│    ┌──────────────────────────────────┐ │
│    │ Version  Carrier      Status     │ │
│    │ v2024.1  FedEx        Active     │ │
│    │ v2024.1  UPS          Proposed   │ │
│    │ -        DHL          Pending    │ │ <- No response yet
│    └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Benefits:**
- Minimal code changes (reuse existing table component)
- Shows complete picture of RFP responses
- Easy to identify non-responders
- Can bulk-compare all responses

---

### **Option 2: Linked Tariff Groups**
Allow users to manually "link" tariffs that belong together (even if not from same CSP event).

#### UI Changes:
```
When viewing a tariff:
┌─────────────────────────────────────┐
│ v2024.1 - Swift Transport          │
│                                     │
│ 🔗 Part of: Winter RFP Group (12)  │ <- Clickable
│    View all tariffs in this group  │
└─────────────────────────────────────┘
```

**Benefits:**
- Flexible grouping beyond CSP events
- Can group blanket tariffs by publication date
- Manual control over relationships

**Drawbacks:**
- Requires new table: `tariff_groups`
- More user work to maintain links

---

### **Option 3: Timeline View (Future)**
Add a timeline visualization showing tariff generations over time.

```
2024 ─────●─────●─────●───── 2025
          │     │     │
          │     │     └─ Q1 2025 RFP (20 tariffs)
          │     └─ Summer Update (5 tariffs)
          └─ Annual Renewal (18 tariffs)
```

**Benefits:**
- Visual understanding of negotiation cycles
- See patterns in pricing updates
- Identify coverage gaps

**Drawbacks:**
- Complex visualization
- Best as analytics feature, not daily workflow

---

## Recommended Implementation: **Option 1**

### Phase 1: Add CSP Event Grouping View
1. **Add view toggle** to Tariffs page header
   ```jsx
   <Tabs value={viewMode}>
     <TabsTrigger value="customers">By Customer</TabsTrigger>
     <TabsTrigger value="csp_events">By RFP/Event</TabsTrigger>
   </Tabs>
   ```

2. **Modify grouping logic** to group by `csp_event_id` when in event mode
   ```js
   if (viewMode === 'csp_events') {
     groupKey = tariff.csp_event_id;
     groupName = cspEvent?.title || 'Independent Tariff';
   }
   ```

3. **Show carrier response status**
   - Green checkmark: Tariff received
   - Gray dash: Invited but no response
   - Yellow clock: In negotiation

4. **Add bulk actions**
   - Compare all responses
   - Export event summary
   - Close/archive event

### Phase 2: Enhanced Features (Optional)
- **Auto-link blanket tariffs** with same `effective_date` within 7 days
- **CSP event templates**: "Send RFP to my usual 20 carriers"
- **Response deadline tracking**: Show how many days until RFP closes
- **AI summary**: "FedEx is 15% higher than last year; UPS matched incumbent"

---

## Quick Win: Add CSP Event Badge
Even before full implementation, add a small visual indicator:

```jsx
{tariff.csp_event_id && (
  <Badge variant="outline" className="text-xs">
    <Calendar className="w-3 h-3 mr-1" />
    {cspEvent?.title}
  </Badge>
)}
```

This immediately shows which tariffs are part of a coordinated event!

---

## Database Queries Needed

### Get all tariffs for a CSP event:
```sql
SELECT t.*, c.name as carrier_name
FROM tariffs t
LEFT JOIN carriers c ON c.id = ANY(t.carrier_ids)
WHERE t.csp_event_id = '...'
ORDER BY t.created_at DESC;
```

### Get non-responders:
```sql
SELECT ca.carrier_id, c.name
FROM csp_carrier_assignments ca
LEFT JOIN carriers c ON c.id = ca.carrier_id
LEFT JOIN tariffs t ON t.csp_event_id = ca.csp_event_id
  AND ca.carrier_id = ANY(t.carrier_ids)
WHERE ca.csp_event_id = '...'
  AND t.id IS NULL; -- No tariff submitted
```

---

## User Workflow Examples

### Scenario 1: Annual RFP
1. User creates CSP event: "2025 Annual RFP"
2. Assigns 20 carriers
3. Switches to "By RFP/Event" view
4. Sees responses rolling in over 2 weeks
5. Compares all 20 responses side-by-side
6. Marks event complete → all tariffs archived as a unit

### Scenario 2: Mid-Year Rate Update
1. Carrier publishes updated blanket tariff
2. System auto-detects: 15 customers affected
3. Creates tariff records with same `effective_date`
4. Groups appear together in timeline view
5. User can bulk-notify affected customers

---

## Next Steps
1. **Immediate**: Add CSP event badge to existing tariff rows
2. **Week 1**: Implement view toggle and grouping logic
3. **Week 2**: Add carrier response tracking
4. **Week 3**: Polish with bulk actions and comparison tools

This approach leverages existing database structure while providing immediate value through better organization and visibility.
