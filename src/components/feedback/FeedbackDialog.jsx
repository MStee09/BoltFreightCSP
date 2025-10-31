import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { supabase } from "../../api/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../ui/use-toast";
import { MessageSquarePlus, Send, Sparkles } from "lucide-react";

const PAGE_NAMES = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/carriers': 'Carriers',
  '/tariffs': 'Tariffs',
  '/pipeline': 'Pipeline',
  '/calendar': 'Calendar',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/help': 'Help',
};

const generateBoltPrompt = (feedbackType, title, description, currentPage) => {
  const contextMap = {
    'Dashboard': 'the main dashboard page (src/pages/Dashboard.jsx)',
    'Customers': 'the Customers page (src/pages/Customers.jsx) and customer components',
    'Carriers': 'the Carriers page (src/pages/Carriers.jsx) and carrier components',
    'Tariffs': 'the Tariffs page (src/pages/Tariffs.jsx) and tariff components',
    'Pipeline': 'the Pipeline page (src/pages/Pipeline.jsx) and CSP event components',
    'Calendar': 'the Calendar page (src/pages/CalendarView.jsx)',
    'Reports': 'the Reports page (src/pages/Reports.jsx)',
    'Settings': 'the Settings page (src/pages/Settings.jsx)',
    'Help': 'the Help page (src/pages/Help.jsx)',
  };

  const location = contextMap[currentPage] || 'the application';

  if (feedbackType === 'bug') {
    return `I found a bug in ${location}:

**Issue:** ${title}

**Details:** ${description}

**Location:** ${currentPage} page

Please fix this bug. Check for any console errors, verify the data flow, and ensure proper error handling. Test thoroughly after making changes.`;
  }

  if (feedbackType === 'feature_request') {
    return `I would like to add a new feature to ${location}:

**Feature:** ${title}

**Description:** ${description}

**Location:** ${currentPage} page

Please implement this feature. Consider the existing UI patterns, ensure it follows the app's design system, add proper error handling, and make it accessible to users with the appropriate permissions.`;
  }

  if (feedbackType === 'improvement') {
    return `I have a suggestion to improve ${location}:

**Improvement:** ${title}

**Details:** ${description}

**Location:** ${currentPage} page

Please implement this improvement. Ensure it enhances the user experience, maintains consistency with the rest of the app, and doesn't break existing functionality.`;
  }

  if (feedbackType === 'question') {
    return `I have a question about ${location}:

**Question:** ${title}

**Details:** ${description}

**Location:** ${currentPage} page

Please help me understand this better or add clarification/documentation as needed.`;
  }

  return `Feedback for ${location}:

**Topic:** ${title}

**Details:** ${description}

**Location:** ${currentPage} page

Please review and address this feedback appropriately.`;
};

export default function FeedbackDialog({ open, onOpenChange }) {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const [formData, setFormData] = useState({
    feedbackType: 'improvement',
    title: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getCurrentPage = () => {
    const path = location.pathname;
    return PAGE_NAMES[path] || path.split('/')[1] || 'Dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentPage = getCurrentPage();
      const boltPromptSuggestion = generateBoltPrompt(
        formData.feedbackType,
        formData.title,
        formData.description,
        currentPage
      );

      const { data: feedbackData, error: feedbackError } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          feedback_type: formData.feedbackType,
          title: formData.title,
          description: formData.description,
          current_page: currentPage,
          priority: formData.priority,
          bolt_prompt_suggestion: boltPromptSuggestion,
        })
        .select()
        .single();

      if (feedbackError) throw feedbackError;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-feedback-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedbackType: formData.feedbackType,
          title: formData.title,
          description: formData.description,
          currentPage,
          priority: formData.priority,
          userName: userProfile?.full_name || 'Unknown User',
          userEmail: userProfile?.email || user.email,
          boltPromptSuggestion,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Email sending failed, but feedback was saved');
      }

      toast({
        title: "Feedback submitted!",
        description: "Your feedback has been sent to the development team. Thank you!",
      });

      setFormData({
        feedbackType: 'improvement',
        title: '',
        description: '',
        priority: 'medium',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <MessageSquarePlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Submit Feedback</DialogTitle>
              <DialogDescription className="text-base">
                Help us improve the app by sharing your thoughts
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <strong>Smart Context Detection:</strong> We automatically detect which page you're on
                and generate a ready-to-use prompt for Bolt to implement your suggestion!
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedbackType">What kind of feedback is this?</Label>
            <Select
              value={formData.feedbackType}
              onValueChange={(value) => setFormData({ ...formData, feedbackType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">🐛 Bug Report - Something isn't working</SelectItem>
                <SelectItem value="feature_request">✨ Feature Request - New functionality</SelectItem>
                <SelectItem value="improvement">🚀 Improvement - Make something better</SelectItem>
                <SelectItem value="question">❓ Question - Need help understanding</SelectItem>
                <SelectItem value="other">💬 Other - General feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">How important is this?</Label>
            <RadioGroup
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="cursor-pointer">🟢 Low</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="cursor-pointer">🟡 Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="cursor-pointer">🟠 High</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="critical" id="critical" />
                <Label htmlFor="critical" className="cursor-pointer">🔴 Critical</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Brief Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Add export to Excel button on Reports page"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              placeholder="Please be as specific as possible. Include what you expected to happen, what actually happened, or what you'd like to see added..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              Current location: <strong>{getCurrentPage()}</strong> (automatically detected)
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900">
              <strong>What happens next:</strong> Your feedback will be saved and emailed to the development team
              with a ready-to-use Bolt prompt. This makes it super easy to implement your suggestion!
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title || !formData.description}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
