import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Truck,
  FileText,
  Kanban,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Upload,
  Calendar,
  Mail
} from 'lucide-react';

const WorkflowStep = ({ number, title, description, icon: Icon, actions }) => (
  <div className="flex gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
    <div className="flex-shrink-0">
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="font-mono">{number}</Badge>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm text-slate-600 mb-3">{description}</p>
      {actions && actions.length > 0 && (
        <div className="space-y-1">
          {actions.map((action, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-500">
              <ArrowRight className="w-3 h-3" />
              <span>{action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const FeatureCard = ({ title, description, icon: Icon, tips }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <ul className="space-y-2">
        {tips.map((tip, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export default function Help() {
  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">FreightOps CSP Help Center</h1>
        <p className="text-slate-600">Complete guide to managing carrier strategy and procurement workflows</p>
      </div>

      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflow">Full Workflow</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="tips">Best Practices</TabsTrigger>
          <TabsTrigger value="glossary">Glossary</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-8 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily User Flow</CardTitle>
              <CardDescription>How a Pricing Analyst or Carrier Strategy Lead uses FreightOps CSP from login to insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WorkflowStep
                number="1"
                title="Command Center (Morning Dashboard)"
                description="Start your day with a complete overview of what needs attention"
                icon={LayoutDashboard}
                actions={[
                  "Review active customers, tariffs, and CSP events at a glance",
                  "Check alerts for expiring tariffs and stalled negotiations",
                  "View pipeline health with stage distribution",
                  "Click alert cards to jump directly to relevant workflows"
                ]}
              />

              <WorkflowStep
                number="2"
                title="Customer Overview"
                description="Manage shipper relationships and track renewal schedules"
                icon={Users}
                actions={[
                  "Sort customers by 'Next CSP Due' or filter by margin trends",
                  "Open customer details to see 30-day margin, review schedule, and notes",
                  "Schedule next review to auto-create calendar events",
                  "View tariff timeline and interaction history"
                ]}
              />

              <WorkflowStep
                number="3"
                title="Tariff Workspace"
                description="Track rate agreements, expirations, and carrier terms"
                icon={FileText}
                actions={[
                  "Filter by 'Expiring in 90 Days' or ownership type",
                  "View tariff details including carriers, rates, and documents",
                  "Upload rate sheets and link to CSP events",
                  "System automatically flags near-expiry tariffs in alerts"
                ]}
              />

              <WorkflowStep
                number="4"
                title="CSP Pipeline (Active Bids & Projects)"
                description="Visual Kanban board for running and tracking carrier bids"
                icon={Kanban}
                actions={[
                  "Drag cards between stages: Discovery → Data Room → RFP Sent → QA → Award",
                  "Cards age with color coding (green → yellow → orange → red)",
                  "Click 'New Event' to start a new RFP or renewal",
                  "View metrics: Active CSPs, Avg Days in Stage, Win Rate",
                  "Click any card to open detailed event view"
                ]}
              />

              <WorkflowStep
                number="5"
                title="CSP Event → Strategy Analysis"
                description="Analyze opportunity before or during a bid"
                icon={BarChart3}
                actions={[
                  "Within a CSP Event, open the Strategy tab",
                  "Upload Transaction Detail file (actual shipment data)",
                  "Upload Lost Opportunity file (missed bids/rejected quotes)",
                  "Run analysis to see top lanes, margin variance, and recommendations",
                  "Results feed into opportunity scores on dashboard"
                ]}
              />

              <WorkflowStep
                number="6"
                title="Award → Tariff Generation"
                description="Close the loop when a CSP is won"
                icon={CheckCircle2}
                actions={[
                  "Move event to 'Awarded' stage",
                  "System auto-creates new tariff record with version",
                  "Tariff is linked back to the CSP Event",
                  "Implementation tasks and review schedules are generated"
                ]}
              />

              <WorkflowStep
                number="7"
                title="Alerts & Calendar"
                description="Stay proactive with continuous monitoring"
                icon={AlertCircle}
                actions={[
                  "Expiring tariffs trigger alerts 90 days in advance",
                  "Stale CSPs (30+ days) appear in alerts panel",
                  "Margin drops create action items",
                  "Calendar shows CSP reviews and bid due dates"
                ]}
              />

              <WorkflowStep
                number="8"
                title="Reporting & KPIs"
                description="End-of-week or QBR insights"
                icon={TrendingUp}
                actions={[
                  "View win rate by mode (LTL vs Home Delivery)",
                  "Track avg days in stage per analyst",
                  "Monitor margin trends by customer segment",
                  "Review tariff aging distribution"
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              title="Dashboard"
              description="Your command center for daily operations"
              icon={LayoutDashboard}
              tips={[
                "Metric cards summarize active customers, carriers, tariffs, and events",
                "Alerts panel shows time-sensitive actions",
                "Pipeline snapshot visualizes stage distribution",
                "Click any element to navigate to detailed view"
              ]}
            />

            <FeatureCard
              title="Pipeline Board"
              description="Visual workflow for CSP lifecycle"
              icon={Kanban}
              tips={[
                "Drag-and-drop cards between stages",
                "Color aging shows event velocity (green to red)",
                "Hover stage headers for definitions",
                "Filter by owner, priority, or customer",
                "Metrics bar shows health at a glance"
              ]}
            />

            <FeatureCard
              title="Strategy Analysis"
              description="Data-driven opportunity identification"
              icon={BarChart3}
              tips={[
                "Event-specific analysis for each bid",
                "Upload transaction and lost opportunity data",
                "Visualize top lanes by spend and savings potential",
                "Get carrier-level performance insights",
                "Recommendations guide next actions"
              ]}
            />

            <FeatureCard
              title="Customer Management"
              description="Complete shipper relationship tracking"
              icon={Users}
              tips={[
                "Track margin trends and review schedules",
                "View tariff timeline and interaction history",
                "Schedule reviews with calendar integration",
                "Segment customers by performance",
                "Link all CSP events to customer record"
              ]}
            />

            <FeatureCard
              title="Tariff Workspace"
              description="Rate agreement lifecycle management"
              icon={FileText}
              tips={[
                "Track effective and expiry dates",
                "Upload and version rate sheets",
                "Link tariffs to CSP events",
                "Auto-alerts for expiring agreements",
                "View carrier terms and contacts"
              ]}
            />

            <FeatureCard
              title="Calendar & Tasks"
              description="Never miss a deadline"
              icon={Calendar}
              tips={[
                "CSP reviews auto-schedule on customer cadence",
                "Bid due dates appear as events",
                "Task lists integrate with pipeline",
                "Overdue items trigger alerts",
                "Team visibility on all deadlines"
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="tips" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Best Practices for Success</CardTitle>
              <CardDescription>Expert tips from seasoned freight pricing analysts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Daily Workflow
                </h3>
                <ul className="space-y-2 ml-7 text-sm text-slate-600">
                  <li>Start every morning on the Dashboard to orient yourself</li>
                  <li>Clear alerts before they age past 3 days</li>
                  <li>Groom the Pipeline board daily - move stale cards</li>
                  <li>Update task status immediately when completed</li>
                  <li>Log all carrier interactions in the timeline</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Kanban className="w-5 h-5 text-green-600" />
                  Pipeline Management
                </h3>
                <ul className="space-y-2 ml-7 text-sm text-slate-600">
                  <li>Keep cards moving - aim for less than 14 days per stage</li>
                  <li>Yellow/orange cards need immediate attention</li>
                  <li>Use priority badges: urgent for expiring contracts</li>
                  <li>Assign owners to every CSP event</li>
                  <li>Link all relevant tariffs and documents</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Strategy Analysis
                </h3>
                <ul className="space-y-2 ml-7 text-sm text-slate-600">
                  <li>Run analysis for every new CSP event before RFP</li>
                  <li>Use 30-90 day data windows for best accuracy</li>
                  <li>Focus on high-volume lanes first</li>
                  <li>Compare lost opportunity vs transaction data</li>
                  <li>Save results to track before/after performance</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-600" />
                  Communication
                </h3>
                <ul className="space-y-2 ml-7 text-sm text-slate-600">
                  <li>Connect Gmail to auto-track carrier emails</li>
                  <li>Use email compose within CSP events for context</li>
                  <li>Log all phone calls in interaction timeline</li>
                  <li>CC team members on critical negotiations</li>
                  <li>Document all rate confirmations</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Alert Management
                </h3>
                <ul className="space-y-2 ml-7 text-sm text-slate-600">
                  <li>Review tariff expirations at 90-day mark</li>
                  <li>Address stale CSPs before they hit 30 days</li>
                  <li>Investigate margin drops immediately</li>
                  <li>Set customer review schedules proactively</li>
                  <li>Don't dismiss alerts - resolve them</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="glossary" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Terminology Guide</CardTitle>
              <CardDescription>Key terms and concepts used in FreightOps CSP</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-slate-900 mb-1">CSP (Carrier Savings Project)</dt>
                  <dd className="text-sm text-slate-600 ml-4">A discrete bid or renewal opportunity representing an RFP cycle with a customer. Each CSP tracks from discovery through implementation.</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">CSP Stage</dt>
                  <dd className="text-sm text-slate-600 ml-4">Pipeline phases: Discovery, Data Room Ready, RFP Sent, QA Round, Round 1+, Final Offers, Awarded, Implementation.</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Days in Stage</dt>
                  <dd className="text-sm text-slate-600 ml-4">Time elapsed since a CSP entered its current stage. Used for velocity tracking and stale deal identification.</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Tariff</dt>
                  <dd className="text-sm text-slate-600 ml-4">A rate agreement between customer and carrier(s). Includes effective dates, pricing terms, and versioning.</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Strategy Analysis</dt>
                  <dd className="text-sm text-slate-600 ml-4">Event-specific opportunity analysis combining transaction data (actual shipments) and lost opportunity data (missed bids) to identify savings potential.</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Transaction Detail</dt>
                  <dd className="text-sm text-slate-600 ml-4">Historical shipment data including loads, carriers, costs, and performance metrics used for analysis.</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Lost Opportunity</dt>
                  <dd className="text-sm text-slate-600 ml-4">Data on rejected quotes or missed bids showing where alternative carriers could have saved money.</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Aging (Card/Deal)</dt>
                  <dd className="text-sm text-slate-600 ml-4">Visual indicator of CSP velocity. Green (0-14 days), Yellow (14-21), Orange (21-30), Red (30+).</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Win Rate</dt>
                  <dd className="text-sm text-slate-600 ml-4">Percentage of CSP events that reach 'Awarded' stage. Tracked overall and by mode/analyst.</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Margin Trend</dt>
                  <dd className="text-sm text-slate-600 ml-4">30-day rolling average of profit margin for a customer. Positive trend ↑ means improving profitability.</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Carrier Ownership</dt>
                  <dd className="text-sm text-slate-600 ml-4">Pricing control designation: 'Customer' (shipper sets rates), 'Carrier' (carrier sets rates), 'Negotiated' (jointly agreed).</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Review Cadence</dt>
                  <dd className="text-sm text-slate-600 ml-4">Schedule for customer check-ins (Monthly, Quarterly, Semi-Annual, Annual). Drives calendar events.</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Mode</dt>
                  <dd className="text-sm text-slate-600 ml-4">Freight type: LTL (Less Than Truckload), FTL (Full Truckload), Parcel, or Specialized (White Glove, Home Delivery).</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-900 mb-1">Stale Deal</dt>
                  <dd className="text-sm text-slate-600 ml-4">A CSP event that has been in the same stage for 30+ days, indicating blocked progress.</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
