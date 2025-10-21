import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

const GMAIL_CLIENT_ID = import.meta.env.VITE_GMAIL_CLIENT_ID;
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

export function GmailSetup() {
  const [isConnected, setIsConnected] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [watchActive, setWatchActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGmailConnection();
  }, []);

  const checkGmailConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokens } = await supabase
        .from('user_gmail_tokens')
        .select('email_address, token_expiry')
        .eq('user_id', user.id)
        .single();

      if (tokens) {
        setIsConnected(true);
        setEmailAddress(tokens.email_address);

        const { data: subscription } = await supabase
          .from('gmail_watch_subscriptions')
          .select('is_active, expiration')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (subscription && new Date(subscription.expiration) > new Date()) {
          setWatchActive(true);
        }
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = () => {
    const redirectUri = `${window.location.origin}/gmail-callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GMAIL_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(GMAIL_SCOPES)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    window.location.href = authUrl;
  };

  const handleSetupWatch = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: tokens } = await supabase
        .from('user_gmail_tokens')
        .select('access_token')
        .eq('user_id', user.id)
        .single();

      if (!tokens) throw new Error('No Gmail tokens found');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const topicName = `projects/YOUR_PROJECT_ID/topics/gmail-notifications`;

      const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/watch',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topicName,
            labelIds: ['INBOX'],
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to setup Gmail watch');
      }

      const watchData = await response.json();

      await supabase.from('gmail_watch_subscriptions').insert({
        user_id: user.id,
        email_address: emailAddress,
        history_id: watchData.historyId,
        expiration: new Date(parseInt(watchData.expiration)).toISOString(),
        is_active: true,
      });

      setWatchActive(true);
      toast.success('Gmail monitoring enabled');
    } catch (error) {
      console.error('Error setting up watch:', error);
      toast.error('Failed to enable monitoring. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('user_gmail_tokens')
        .delete()
        .eq('user_id', user.id);

      await supabase
        .from('gmail_watch_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      setIsConnected(false);
      setWatchActive(false);
      setEmailAddress('');
      toast.success('Gmail disconnected');
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast.error('Failed to disconnect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isConnected) {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Integration
            </CardTitle>
            <CardDescription>
              Send and track emails directly from the CRM
            </CardDescription>
          </div>
          {isConnected && (
            <Badge variant="default" className="gap-1">
              <Check className="h-3 w-3" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Connect your Gmail account to send tracked emails and automatically capture
                replies in customer and carrier timelines.
              </p>
            </div>
            <Button onClick={handleConnectGmail} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Connect Gmail Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Connected Email:</span>
                <span className="font-medium">{emailAddress}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Email Monitoring:</span>
                {watchActive ? (
                  <Badge variant="default" className="gap-1">
                    <Check className="h-3 w-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>

            {!watchActive && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Enable monitoring to automatically capture email replies, even when recipients
                    forget to "Reply All".
                  </p>
                </div>
                <Button onClick={handleSetupWatch} className="w-full">
                  Enable Email Monitoring
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="w-full"
              disabled={loading}
            >
              Disconnect Gmail
            </Button>
          </div>
        )}

        <div className="pt-4 border-t space-y-2">
          <h4 className="text-sm font-medium">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>CCs a tracking email to capture all conversation threads</li>
            <li>Monitors your inbox for replies with tracking codes</li>
            <li>Automatically logs all emails to customer/carrier timelines</li>
            <li>Works even if recipients forget to "Reply All"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
