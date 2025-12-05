import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertCircle, Mail, Clock, Shield, History } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';

export function EmailPollingSettings() {
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [resyncing, setResyncing] = useState(false);
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

      // Read response body once based on content type
      const contentType = response.headers.get('content-type');
      let result;

      try {
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse);
          result = { error: textResponse };
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        result = { error: 'Failed to parse server response' };
      }

      // Check if request was successful
      if (!response.ok) {
        const errorMessage = result.error || 'Failed to check for replies';
        throw new Error(errorMessage);
      }
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

  const resyncGmail = async () => {
    setResyncing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      toast.info('Starting Gmail re-sync. This may take a minute...');

      const response = await fetch(`${supabaseUrl}/functions/v1/resync-gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ daysBack: 14 })
      });

      const contentType = response.headers.get('content-type');
      let result;

      try {
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse);
          result = { error: textResponse };
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        result = { error: 'Failed to parse server response' };
      }

      if (!response.ok) {
        const errorMessage = result.error || 'Failed to re-sync Gmail';
        throw new Error(errorMessage);
      }

      const { newEmails, alreadyExisted, totalMessages } = result;

      if (newEmails > 0) {
        toast.success(`Found ${newEmails} new email${newEmails > 1 ? 's' : ''} from the last 14 days!`);
      } else if (alreadyExisted > 0) {
        toast.info(`All ${alreadyExisted} email${alreadyExisted > 1 ? 's' : ''} from the last 14 days already tracked`);
      } else {
        toast.info('No emails found in the last 14 days');
      }

      await checkPollingStatus();
    } catch (error) {
      console.error('Error re-syncing Gmail:', error);
      toast.error(`Failed to re-sync Gmail: ${error.message}`);
    } finally {
      setResyncing(false);
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
              <Mail className="h-5 w-5" />
              Email Reply Tracking
            </CardTitle>
            <CardDescription>
              Automatically checks for replies every 5 minutes
            </CardDescription>
          </div>
          {pollingEnabled && (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="polling-enabled" className="text-sm font-medium">
                Enable Automatic Reply Tracking
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              System checks Gmail every 5 minutes for new replies
            </p>
          </div>
          <Switch
            id="polling-enabled"
            checked={pollingEnabled}
            onCheckedChange={togglePollingForAllUsers}
          />
        </div>

        {lastChecked && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Last checked {formatDistanceToNow(new Date(lastChecked), { addSuffix: true })}</span>
            </div>
          </div>
        )}

        <Button
          onClick={checkForReplies}
          disabled={polling || !pollingEnabled}
          className="w-full"
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

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-3">
            Re-sync past emails from the last 14 days. Useful for recovering missed emails or after fixing tracking issues.
          </p>
          <Button
            onClick={resyncGmail}
            disabled={resyncing || !pollingEnabled}
            variant="outline"
            className="w-full"
          >
            {resyncing ? (
              <>
                <History className="h-4 w-4 mr-2 animate-spin" />
                Re-syncing...
              </>
            ) : (
              <>
                <History className="h-4 w-4 mr-2" />
                Re-sync Last 14 Days
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
