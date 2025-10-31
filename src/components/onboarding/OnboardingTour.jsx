import React, { useState, useEffect } from "react";
import { supabase } from "../../api/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import {
  Users,
  Truck,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  Mail,
  Target,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  X
} from "lucide-react";

const tourSteps = [
  {
    title: "Welcome to Your CSP Management Hub",
    description: "This platform helps you manage carrier relationships, track tariff negotiations, and optimize your continuous service provider strategy. Let's take a quick tour to help you become a power user.",
    icon: Target,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    title: "Dashboard - Your Command Center",
    description: "The dashboard gives you a real-time view of your most important metrics: active customers, managed carriers, active tariffs, and open CSP events. Each card shows trends compared to last week, helping you spot changes quickly.",
    icon: TrendingUp,
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    tips: [
      "Click any metric card to jump to the detailed view",
      "Green arrows indicate growth, red arrows show decline",
      "The alerts panel highlights items needing attention"
    ]
  },
  {
    title: "Customers - Know Your Accounts",
    description: "Manage all your customer accounts in one place. Track their shipping volumes, tariff agreements, and CSP strategy. Each customer profile contains their complete history and documents.",
    icon: Users,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-50",
    tips: [
      "Use filters to find customers by segment or status",
      "Click a customer to see their full profile and tariff timeline",
      "Upload documents directly to customer profiles"
    ]
  },
  {
    title: "Carriers - Your Network",
    description: "Keep track of all carriers you work with. Store contact information, track performance, and manage relationships. This is your carrier rolodex on steroids.",
    icon: Truck,
    iconColor: "text-orange-600",
    bgColor: "bg-orange-50",
    tips: [
      "Add multiple contacts per carrier",
      "Track carrier-specific notes and history",
      "Link carriers to specific CSP events"
    ]
  },
  {
    title: "Tariffs - Track Every Agreement",
    description: "All your tariff agreements in one searchable database. Track effective dates, expiration dates, and which customers and carriers are involved. Never miss a renewal again.",
    icon: FileText,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50",
    tips: [
      "Get alerts before tariffs expire",
      "Upload tariff documents for easy access",
      "Filter by customer, carrier, or status"
    ]
  },
  {
    title: "Pipeline - Manage CSP Events",
    description: "Your CSP event pipeline shows all ongoing negotiations. Track which carriers are participating, what stage each event is in, and when action is needed. Drag and drop to update stages.",
    icon: Target,
    iconColor: "text-indigo-600",
    bgColor: "bg-indigo-50",
    tips: [
      "Move events between stages as they progress",
      "Assign multiple carriers to each event",
      "Set due dates and get reminders"
    ]
  },
  {
    title: "Calendar - Never Miss a Deadline",
    description: "See all your CSP events, tariff expirations, and tasks in a calendar view. Stay on top of important dates and plan your work accordingly.",
    icon: Calendar,
    iconColor: "text-pink-600",
    bgColor: "bg-pink-50",
    tips: [
      "Switch between month, week, and day views",
      "Color-coded events by type",
      "Click any event to see details or take action"
    ]
  },
  {
    title: "Reports - Data-Driven Decisions",
    description: "Generate comprehensive reports on CSP effectiveness, user performance, and more. Use data to optimize your strategy and demonstrate value to stakeholders.",
    icon: BarChart3,
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    tips: [
      "Upload carrier performance reports for analysis",
      "Track savings and improvements over time",
      "Export reports for presentations"
    ]
  },
  {
    title: "Email Integration - Stay Connected",
    description: "Connect your email to track all carrier and customer communications automatically. Never lose track of important conversations or follow-ups.",
    icon: Mail,
    iconColor: "text-red-600",
    bgColor: "bg-red-50",
    tips: [
      "Set up Gmail integration in Settings",
      "All emails sync automatically",
      "View email history on customer and carrier pages"
    ]
  },
  {
    title: "Settings - Customize Your Experience",
    description: "Personalize the app to work the way you do. Set up alerts, email templates, AI assistance, and manage your team members.",
    icon: Settings,
    iconColor: "text-slate-600",
    bgColor: "bg-slate-50",
    tips: [
      "Configure alert preferences for your workflow",
      "Create email templates for common scenarios",
      "Invite team members (admins only)"
    ]
  },
  {
    title: "You're Ready to Go!",
    description: "You now know the key features that will help you manage your CSP strategy like a pro. Start by adding your customers and carriers, then create your first CSP event.",
    icon: CheckCircle2,
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    tips: [
      "Need help? Click the Help button in the sidebar",
      "You can replay this tour anytime from Settings",
      "Keyboard shortcuts work throughout the app"
    ]
  }
];

export default function OnboardingTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_onboarding_state')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { error: insertError } = await supabase
          .from('user_onboarding_state')
          .insert({ user_id: user.id });

        if (insertError) throw insertError;

        setOpen(true);
        setCurrentStep(0);
      } else if (!data.onboarding_completed && !data.skipped) {
        setOpen(true);
        setCurrentStep(data.current_step || 0);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setLoading(false);
    }
  };

  const updateOnboardingState = async (updates) => {
    try {
      const { error } = await supabase
        .from('user_onboarding_state')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating onboarding state:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateOnboardingState({ current_step: nextStep });
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateOnboardingState({ current_step: prevStep });
    }
  };

  const handleSkip = () => {
    updateOnboardingState({
      skipped: true,
      current_step: currentStep
    });
    setOpen(false);
  };

  const handleComplete = () => {
    updateOnboardingState({
      onboarding_completed: true,
      completed_at: new Date().toISOString(),
      current_step: tourSteps.length - 1
    });
    setOpen(false);
  };

  if (loading) return null;

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div className={`${step.bgColor} p-3 rounded-lg`}>
              <Icon className={`w-8 h-8 ${step.iconColor}`} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4 mr-1" />
              Skip Tour
            </Button>
          </div>
          <DialogTitle className="text-2xl">{step.title}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        {step.tips && (
          <div className="mt-4 bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Pro Tips:
            </h4>
            <ul className="space-y-2">
              {step.tips.map((tip, index) => (
                <li key={index} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>Step {currentStep + 1} of {tourSteps.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <DialogFooter className="mt-6 flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          <Button
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {currentStep === tourSteps.length - 1 ? (
              <>
                Get Started
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
