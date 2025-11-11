import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertCircle, Mail, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';

export function EmailPollingSettings() {
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [hasGmail, setHasGmail] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [emailAddress, setEmailAddress] = useState('');

  useEffect(() => {
    checkPollingStatus();

    const interval = setInterval(() => {
      if (pollingEnabled) {
        checkForReplies();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [pollingEnabled]);

  const checkPollingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokens } = await supabase
        .from('user_gmail_tokens')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (tokens) {
        setHasGmail(true);
        setPollingEnabled(tokens.polling_enabled);
        setLastChecked(tokens.last_checked_at);
        setEmailAddress(tokens.email_address);
      }
    } catch (error) {
      console.error('Error checking polling status:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePollingForAllUsers = async () => {
    if (!isAdmin) {
      toast.error('Admin access required');
      return;
    }

    try {
      const newState = !pollingEnabled;

      const { error } = await supabase
        .from('user_gmail_tokens')
        .update({ polling_enabled: newState });

      if (error) throw error;

      setPollingEnabled(newState);
      toast.success(newState ? 'Email polling enabled for all users' : 'Email polling disabled for all users');

      if (newState) {
        checkForReplies();
      }
    } catch (error) {
      console.error('Error toggling polling:', error);
      toast.error('Failed to update polling settings');
    }
  };

  const checkForReplies = async () => {
    setPolling(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${supabaseUrl}/functions/v1/poll-gmail-replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': anonKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check for replies');
      }

      const result = await response.json();
      setLastChecked(result.lastChecked);

      if (result.newMessages > 0) {
        toast.success(`Found ${result.newMessages} new email${result.newMessages > 1 ? 's' : ''}`);
      } else {
        toast.info('No new emails found');
      }

      await checkPollingStatus();
    } catch (error) {
      console.error('Error checking for replies:', error);
      toast.error(`Failed to check for replies: ${error.message}`);
    } finally {
      setPolling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (!hasGmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Email Reply Tracking (Admin)
          </CardTitle>
          <CardDescription>
            System-wide setting - Automatically enabled for all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Email polling is automatically enabled for all users who connect their Gmail accounts.
              No additional configuration needed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Email Reply Tracking (Admin)
            </CardTitle>
            <CardDescription>
              System-wide control - Automatically checks for replies every 5 minutes
            </CardDescription>
          </div>
          {pollingEnabled && (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Active for All Users
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Admin Control:</strong> This setting applies to all users system-wide.
            Email polling is currently <strong>{pollingEnabled ? 'enabled' : 'disabled'}</strong> for everyone.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="polling-enabled" className="text-sm font-medium">
                Enable Automatic Reply Tracking (All Users)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, all users with connected Gmail accounts will have their replies tracked automatically
            </p>
          </div>
          <Switch
            id="polling-enabled"
            checked={pollingEnabled}
            onCheckedChange={togglePollingForAllUsers}
          />
        </div>

        {pollingEnabled && (
          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-2">
                <p className="font-medium">How it works for all users:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc">
                  <li>Each user's Gmail is checked every 5 minutes automatically</li>
                  <li>Replies are matched to CSP Events, Customers, and Carriers</li>
                  <li>Shows up instantly in the Email Timeline for the relevant user</li>
                  <li>Only tracks replies to emails sent from this app</li>
                  <li>No user configuration needed - works automatically</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {lastChecked && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Last checked {formatDistanceToNow(new Date(lastChecked), { addSuffix: true })}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={checkForReplies}
            disabled={polling || !pollingEnabled}
            className="flex-1"
          >
            {polling ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Now
              </>
            )}
          </Button>
        </div>

        <div className="pt-4 border-t space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-2">What Gets Tracked:</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="font-medium text-slate-900 mb-1">Replies to Your Emails</p>
                <p>
                  When someone replies to an email you sent from a CSP Event, Customer, or Carrier,
                  it's automatically captured and linked.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="font-medium text-slate-900 mb-1">Thread Tracking</p>
                <p>
                  All emails in a conversation are grouped together, making it easy to see the
                  complete communication history.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="font-medium text-slate-900 mb-1">Smart Matching</p>
                <p>
                  Uses email headers, tracking codes, and sender information to automatically
                  link replies to the right records.
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Note:</strong> Polling checks your inbox every 5 minutes when enabled.
              If you need instant notifications, consider upgrading to webhook-based tracking
              (requires Google Cloud Pub/Sub setup).
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
