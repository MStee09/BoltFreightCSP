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
  'https://www.googleapis.com/auth/gmail.settings.basic',
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
    if (!GMAIL_CLIENT_ID) {
      toast.error(
        'Gmail Client ID not configured. Please add VITE_GMAIL_CLIENT_ID to your .env file.',
        { duration: 5000 }
      );
      return;
    }

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
              Send and track emails directly from the CRM using tracking@csp-crm.app
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
            {!GMAIL_CLIENT_ID && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-amber-900">
                      Gmail Client ID Not Configured
                    </p>
                    <p className="text-xs text-amber-800">
                      To connect Gmail, you need to add <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_GMAIL_CLIENT_ID</code> to your .env file.
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-amber-900">Setup Steps:</p>
                      <ol className="text-xs text-amber-800 space-y-1 ml-4 list-decimal">
                        <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                        <li>Create OAuth 2.0 Client ID</li>
                        <li>Add to .env: <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_GMAIL_CLIENT_ID=your-id</code></li>
                        <li>Restart dev server</li>
                      </ol>
                    </div>
                    <p className="text-xs text-amber-700 mt-2">
                      See <code className="bg-amber-100 px-1 py-0.5 rounded">QUICK_EMAIL_TEST.md</code> for detailed instructions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Connect your Gmail account to send tracked emails and automatically capture
                replies in customer and carrier timelines.
              </p>
            </div>
            <Button
              onClick={handleConnectGmail}
              className="w-full"
              disabled={!GMAIL_CLIENT_ID}
            >
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

        <div className="pt-4 border-t space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">How Email Tracking Works:</h4>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-medium text-blue-900 mb-1">1. Send Tracked Email</p>
                <p className="text-blue-800">
                  When you compose an email from a CSP Event or Customer page, the system automatically:
                </p>
                <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-blue-700">
                  <li>Generates unique tracking code (e.g., CSP-M7K2L1-AB3D)</li>
                  <li>Subject uses your CSP Event title naturally</li>
                  <li>Tracking code hidden in email headers (invisible to recipients)</li>
                  <li>CCs tracking@csp-crm.app to capture all replies</li>
                  <li>Sends via your connected Gmail account</li>
                  <li>Logs the email to database with full context</li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="font-medium text-purple-900 mb-1">2. Monitor Inbox (When Enabled)</p>
                <p className="text-purple-800">
                  Gmail Push Notifications watch your inbox and instantly notify our system when:
                </p>
                <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-purple-700">
                  <li>Any new email arrives in your inbox</li>
                  <li>The system checks for tracking codes in the subject</li>
                  <li>If found, it links the reply to the original conversation</li>
                  <li>Works even if recipients remove you from CC or forget Reply All</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-medium text-green-900 mb-1">3. Auto-Capture Replies</p>
                <p className="text-green-800">
                  The webhook automatically:
                </p>
                <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-green-700">
                  <li>Extracts sender, subject, body, and all recipients</li>
                  <li>Links to the correct CSP Event, Customer, or Carrier</li>
                  <li>Shows up in the Email Timeline tab</li>
                  <li>Creates interaction records for complete history</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="font-medium text-amber-900 mb-1">4. Complete Visibility</p>
                <p className="text-amber-800">
                  Every email thread is captured:
                </p>
                <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-amber-700">
                  <li>Outbound: Your sent emails with context</li>
                  <li>Inbound: All replies, even side conversations</li>
                  <li>Timeline: Chronological view of all communications</li>
                  <li>Search: Find emails by tracking code or contact</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 border border-slate-300 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-700 mb-2">About tracking@csp-crm.app</p>
            <p className="text-xs text-slate-600 mb-2">
              This is a special email address monitored by the CRM system. When CC'd on emails, it:
            </p>
            <ul className="text-xs text-slate-600 space-y-1 ml-2">
              <li>• Captures all email threads and replies automatically</li>
              <li>• Links conversations to CSP Events, Customers, and Carriers</li>
              <li>• Works even if recipients remove you from the thread</li>
              <li>• Only processes emails with valid tracking codes</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-300 rounded-lg p-3">
            <p className="text-xs font-semibold text-green-800 mb-2">Privacy & Security</p>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• Your Gmail credentials are encrypted and stored securely</li>
              <li>• Only tracked business emails are processed</li>
              <li>• Personal emails are never accessed or logged</li>
              <li>• You can disconnect at any time</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
