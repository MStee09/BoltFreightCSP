import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Target,
  Search,
  Plus,
  Upload,
  Mail,
  ClipboardCheck,
  BarChart3,
  Award,
  FileText,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Calendar,
  Users,
  Truck,
  Kanban,
  AlertTriangle,
  Clock,
  BookOpen,
  Zap,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const WorkflowStep = ({ number, title, description, icon: Icon, actions, goal }) => (
  <div className="relative">
    <div className="flex gap-4 p-6 border rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex-shrink-0">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <Badge className="font-mono text-sm bg-blue-600">{number}</Badge>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <p className="text-slate-700 mb-4 leading-relaxed">{description}</p>
        {actions && actions.length > 0 && (
          <div className="space-y-2 mb-4 bg-slate-50 p-4 rounded-lg border">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Steps:</p>
            {actions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        )}
        {goal && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800">
              <span className="font-semibold">Goal:</span> {goal}
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const HabitCard = ({ habit, why }) => (
  <div className="flex items-start gap-3 p-4 border rounded-lg bg-white">
    <Zap className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
    <div className="flex-1">
      <p className="font-semibold text-slate-900 mb-1">{habit}</p>
      <p className="text-sm text-slate-600">{why}</p>
    </div>
  </div>
);

const SupportingTool = ({ tool, purpose, icon: Icon }) => (
  <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
    <div className="p-2 bg-blue-100 rounded-lg">
      <Icon className="w-5 h-5 text-blue-600" />
    </div>
    <div className="flex-1">
      <p className="font-semibold text-slate-900 mb-1">{tool}</p>
      <p className="text-sm text-slate-600">{purpose}</p>
    </div>
  </div>
);

export default function Help() {
  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">FreightOps Ultimate Guide</h1>
            <p className="text-lg text-slate-600 mt-1">The CSP Management Process</p>
          </div>
        </div>
        <Alert className="bg-blue-50 border-blue-200">
          <Target className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-slate-700">
            <span className="font-semibold">The Mission:</span> FreightOps exists to create, manage, and track Carrier Service Procurement (CSP) events — from identifying a customer who needs freight rebid, all the way through awarding, publishing, and renewing their tariffs.
          </AlertDescription>
        </Alert>
      </div>

      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflow">CSP Workflow</TabsTrigger>
          <TabsTrigger value="habits">Power User Habits</TabsTrigger>
          <TabsTrigger value="tools">Supporting Tools</TabsTrigger>
          <TabsTrigger value="sequence">Golden Sequence</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-6 mt-6">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle className="text-2xl">The Core Loop</CardTitle>
              <CardDescription className="text-base">
                CSP → Tariff → SOP → Renewal. Everything else in the app supports this loop.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            <WorkflowStep
              number="1"
              title="Identify the Opportunity"
              description="Before anything else, figure out which customer needs a CSP. You might be renewing an existing tariff that's expiring soon, launching a new customer bid, or adding new lanes or changing coverage."
              icon={Search}
              actions={[
                'Go to Customers page',
                'Search for the customer or create one if missing (Name, Ownership, Assigned Owner, Contact Info)',
                'Review their Tariffs tab — check if an active tariff is expiring or if there\'s an opportunity for improvement'
              ]}
              goal="Identify which customer's lanes you want to bid out."
            />

            <WorkflowStep
              number="2"
              title="Create a New CSP Event"
              description="Everything starts here. This is your workspace. Every carrier email, data file, SOP, and tariff version will live here."
              icon={Plus}
              actions={[
                'Go to Pipeline → + New CSP Event',
                'Fill in: Name (e.g., "2025 Contract Renewal – LTL"), Customer, Priority, Assigned Owner',
                'Select Service Type (LTL or Home Delivery LTL) and Ownership (Rocket CSP or Customer Direct)',
                'Add short context in the Description/Notes explaining why you\'re rebidding'
              ]}
              goal="Create your centralized workspace for this entire CSP process."
            />

            <WorkflowStep
              number="3"
              title="Upload Data for Strategy"
              description="Prep your data room so the pricing process is fast and clean. This includes shipment/lane data files, historical rate performance, and special service notes."
              icon={Upload}
              actions={[
                'Inside your CSP Event → navigate to Documents or Data Room section',
                'Upload: Shipment or lane data file (Excel, CSV), Historical rate performance (if available), Accessorials or special service notes',
                'Add a quick note summarizing what\'s included (e.g., "2024 historical volume with 3-month lane averages")'
              ]}
              goal="Have a ready-to-go bid package to share with carriers."
            />

            <WorkflowStep
              number="4"
              title="Choose Carriers and Send Invitations"
              description="Open the bid to your selected carrier list. The system logs each carrier invite in both the Carrier's Activity Feed and the CSP Event timeline."
              icon={Mail}
              actions={[
                'In the CSP Event → click Invite Carriers or Manage Carriers',
                'Select your desired carrier list (existing or new)',
                'Add any SOP documents or bid rules they need',
                'Use standardized subject lines: "Rocketshipping | Invitation to Participate – [Customer Name] CSP Bid"'
              ]}
              goal="All invited carriers are logged and tracked within the CSP Event."
            />

            <WorkflowStep
              number="5"
              title="Manage Email Chains Within FreightOps"
              description="FreightOps replaces scattered Outlook threads with centralized, traceable email threads. All communication should happen inside the CSP Event's email thread."
              icon={Mail}
              actions={[
                'Compose emails to carriers or customers directly in the CSP Event',
                'Use standardized subject lines for consistency',
                'Attach relevant data or instructions',
                'The system automatically saves every email to the Activity Timeline'
              ]}
              goal="Never lose track of who you emailed or when — every conversation lives in the event history."
            />

            <WorkflowStep
              number="6"
              title="Collect Carrier Submissions (QA Stage)"
              description="As carriers send back bids, upload their rate sheets and validate the data."
              icon={ClipboardCheck}
              actions={[
                'Upload carrier rate sheets into the same CSP Event',
                'Record validation notes (missing lanes, incorrect FSC, etc.)',
                'Use notes for internal discussion; use emails for clarifications with carriers',
                'Log submission results in the event timeline',
                'Move the CSP card to "Carrier Submissions / QA Round" → "Round 2 / Optimization"'
              ]}
              goal="All bids stored, validated, and ready for analysis."
            />

            <WorkflowStep
              number="7"
              title="Optimize and Select Winners"
              description="Review all bids and make the strategic decision on which carriers to award."
              icon={BarChart3}
              actions={[
                'Review bids manually or through an export',
                'Document your analysis in the Activity Timeline',
                'Select winning carriers per region, lane, or mode',
                'Move the CSP card to "Award & Tariff Finalization"',
                'System will prompt you to create a Proposed Tariff Version linked to the CSP Event'
              ]}
              goal="Lock in winning carriers and generate a proposed tariff file."
            />

            <WorkflowStep
              number="8"
              title="Award the Tariff"
              description="This is where the CSP becomes a live, trackable contract. FreightOps automatically closes the CSP Event, updates the Tariff Family, and creates audit entries."
              icon={Award}
              actions={[
                'Review the Proposed Tariff Version under Tariffs → Rocket CSP',
                'Upload: Awarded rate table, Finalized carrier list, Effective/expiry dates',
                'Mark as Finalized / Published → Active',
                'System automatically closes the CSP Event and creates audit entries'
              ]}
              goal="Tariff is now active, linked to both Customer and Carrier."
            />

            <WorkflowStep
              number="9"
              title="Upload Supporting SOPs"
              description="Every good tariff has a rulebook. Add documentation and procedures directly to the tariff."
              icon={FileText}
              actions={[
                'Open the Tariff → SOP tab',
                'Add SOP Notes (internal guidance or special handling rules) or upload SOP Documents (carrier procedures, weekend delivery guides, PDFs)',
                'Tag as Internal (for your team) or Shared (carrier viewable)',
                'Version control is automatic — all changes are tracked'
              ]}
              goal="Anyone looking at this tariff later instantly sees how it operates."
            />

            <WorkflowStep
              number="10"
              title="Implementation & Validation"
              description="After the tariff is published, FreightOps automatically schedules a 30-day validation check."
              icon={CheckCircle}
              actions={[
                'Verify billing accuracy with carriers/customers',
                'Confirm rates loaded correctly in TMS',
                'Log validation completion in Activity Timeline',
                'Move CSP Event to "Validation & Monitoring" stage'
              ]}
              goal="Confirm the new tariff works in practice, not just on paper."
            />

            <WorkflowStep
              number="11"
              title="Renewal Watch and Alerts"
              description="Once a tariff is live, FreightOps keeps watch for you with automated alerts."
              icon={RefreshCw}
              actions={[
                'System alerts you in Dashboard & Tariffs tab when Expiring < 90 Days',
                'Review SOP tab to confirm or update procedures',
                'Check for Stale CSP Events (30+ days idle) flagged for review',
                'Monitor Task Due notifications in Dashboard and email',
                'Find all alerts under Dashboard → Alerts or Calendar View'
              ]}
              goal="Never miss an expiry or renewal window."
            />

            <WorkflowStep
              number="12"
              title="Continuous Improvement Loop"
              description="Every time you finish a CSP → Tariff → Renewal cycle, take time to improve the process."
              icon={TrendingUp}
              actions={[
                'Review performance metrics (on-time awards, average savings, carrier response rate)',
                'Update SOPs based on lessons learned',
                'Keep communication threads clean for fast reuse in the next cycle',
                'Document insights in the Activity Timeline'
              ]}
              goal="Each cycle gets faster, cleaner, and more effective."
            />
          </div>
        </TabsContent>

        <TabsContent value="habits" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-600" />
                Key Habits of a FreightOps Power User
              </CardTitle>
              <CardDescription>
                Master these habits to operate at peak efficiency
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4">
            <HabitCard
              habit="Start every project in Pipeline"
              why="Keeps process structured and ensures nothing falls through the cracks."
            />
            <HabitCard
              habit="Keep communication inside the CSP Event"
              why="Ensures transparency and traceability — no more hunting through Outlook."
            />
            <HabitCard
              habit="Move cards weekly"
              why="Prevents stale events and keeps the pipeline flowing."
            />
            <HabitCard
              habit="Log everything in Activity Timeline"
              why="Your future self will thank you when reviewing decisions months later."
            />
            <HabitCard
              habit="Check 'Expiring < 90d' every Monday"
              why="Stay ahead of renewals instead of scrambling at the last minute."
            />
            <HabitCard
              habit="Update SOPs quarterly"
              why="Ensures operational accuracy and catches changes in carrier procedures."
            />
            <HabitCard
              habit="Always finalize tariffs via Award Stage"
              why="Keeps your family/version logic clean and audit trail complete."
            />
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">The Supporting Tools</CardTitle>
              <CardDescription>
                Your assistants that support the core CSP workflow
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4">
            <SupportingTool
              tool="Pipeline Board"
              purpose="Manage and visualize all active CSPs with drag-and-drop stages."
              icon={Kanban}
            />
            <SupportingTool
              tool="Tariffs Tab"
              purpose="See every live or expiring contract, organized by ownership type and family."
              icon={FileText}
            />
            <SupportingTool
              tool="Customers / Carriers Tabs"
              purpose="Relationship context and history — see all interactions, tariffs, and documents."
              icon={Users}
            />
            <SupportingTool
              tool="Activity Timelines"
              purpose="Audit and collaboration trail for every customer, carrier, tariff, and CSP event."
              icon={Clock}
            />
            <SupportingTool
              tool="SOP Module"
              purpose="Centralized operational documentation — notes and file uploads with version control."
              icon={BookOpen}
            />
            <SupportingTool
              tool="Alerts & Calendar"
              purpose="Smart reminders for expirations, reviews, and overdue tasks."
              icon={AlertTriangle}
            />
            <SupportingTool
              tool="Reports"
              purpose="Analyze performance, bid success, carrier response metrics, and user productivity."
              icon={BarChart3}
            />
          </div>
        </TabsContent>

        <TabsContent value="sequence" className="space-y-6 mt-6">
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                The FreightOps Golden Sequence
              </CardTitle>
              <CardDescription className="text-base">
                Follow this exact order for every CSP to ensure speed, consistency, and total visibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  'Identify customer & verify they\'re in the system',
                  'Create new CSP Event',
                  'Upload all data for bid prep',
                  'Invite and communicate with carriers in-app',
                  'Receive and QA bids',
                  'Optimize & select winners',
                  'Award tariff → upload + finalize',
                  'Add SOPs (notes and documents)',
                  'Validate live billing',
                  'Monitor alerts & start renewals early'
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm">
                      {idx + 1}
                    </div>
                    <p className="text-slate-700 pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-block p-4 bg-blue-600 rounded-full">
                  <Target className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  FreightOps Flow at a Glance
                </h3>
                <div className="max-w-3xl mx-auto">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-slate-700">
                    {[
                      'Customer Identified',
                      'Create CSP',
                      'Upload Data',
                      'Invite Carriers',
                      'Receive Bids',
                      'Analyze & Award',
                      'Upload Tariff',
                      'Attach SOPs',
                      'Validate',
                      'Renew'
                    ].map((step, idx, arr) => (
                      <React.Fragment key={idx}>
                        <span className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg">
                          {step}
                        </span>
                        {idx < arr.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-blue-600" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <p className="text-slate-600 italic pt-4">
                  This is the single source of truth for CSP management — defining not just how to use the app,
                  but the right order and rhythm to get speed, consistency, and total visibility.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
