import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Check, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

export function GmailSetupSimple() {
  const [isConnected, setIsConnected] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(null);
  const [credentialsLoading, setCredentialsLoading] = useState(true);

  useEffect(() => {
    loadOAuthCredentials();
  }, []);

  useEffect(() => {
    if (googleClientId) {
      checkGmailConnection();
    }
  }, [googleClientId]);

  const loadOAuthCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'gmail_oauth_credentials')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value?.client_id) {
        setGoogleClientId(data.setting_value.client_id);
      }
    } catch (error) {
      console.error('Error loading OAuth credentials:', error);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const checkGmailConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokens } = await supabase
        .from('user_gmail_tokens')
        .select('email_address')
        .eq('user_id', user.id)
        .maybeSingle();

      if (tokens) {
        setIsConnected(true);
        setEmailAddress(tokens.email_address);
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = () => {
    if (!googleClientId) {
      toast.error('OAuth credentials not configured. Please contact your administrator.');
      return;
    }

    const appUrl = import.meta.env.VITE_APP_URL || 'https://freight-csp-tool-p8de.bolt.host';
    const redirectUri = `${appUrl}/gmail-callback`;
    const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';

    console.log('OAuth Debug:', {
      appUrl,
      redirectUri,
      windowOrigin: window.location.origin,
      envVar: import.meta.env.VITE_APP_URL
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${googleClientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    window.location.href = authUrl;
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      const testTrackingCode = `TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const testSubject = 'CRM Email Integration Test';
      const testBody = `Hello!\n\nThis is a test email from your CRM system.\n\nIf you're reading this, your email integration is working perfectly! 🎉\n\nTest Details:\n- Tracking Code: ${testTrackingCode}\n- Sent At: ${new Date().toLocaleString()}\n- From: ${emailAddress}\n\nYou can now send tracked emails from CSP Events, Customers, and Carriers in your CRM.\n\nBest regards,\nYour CRM System`;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          trackingCode: testTrackingCode,
          to: [emailAddress],
          cc: [],
          subject: testSubject,
          body: testBody,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send test email');
      }

      toast.success(`Test email sent to ${emailAddress}! Check your inbox.`, { duration: 5000 });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(`Failed to send test email: ${error.message}`);
    } finally {
      setSendingTest(false);
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

      setIsConnected(false);
      setEmailAddress('');
      toast.success('Gmail disconnected');
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast.error('Failed to disconnect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (credentialsLoading || (loading && !isConnected)) {
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

  if (!googleClientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Integration
          </CardTitle>
          <CardDescription>
            Send tracked emails using Gmail or Google Workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Gmail OAuth credentials have not been configured yet. Please contact your administrator to set up the integration in Settings → Integrations.
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
              Gmail Integration
            </CardTitle>
            <CardDescription>
              Send tracked emails using Gmail or Google Workspace
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-900">
                    One-Click Gmail Setup
                  </p>
                  <p className="text-xs text-blue-800">
                    Connect your Gmail or Google Workspace account securely using Google OAuth.
                    Just click the button below and authorize with your Google account.
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-blue-900">How it works:</p>
                    <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                      <li>Click "Connect Gmail Account"</li>
                      <li>Google login popup appears</li>
                      <li>Sign in with your email account</li>
                      <li>Click "Allow" to grant permission</li>
                      <li>Done! Start sending tracked emails</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={handleConnectGmail} className="w-full" size="lg">
              <Mail className="h-4 w-4 mr-2" />
              Connect Gmail Account
            </Button>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-800 mb-2">What you're authorizing:</p>
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• Send emails on your behalf from the CRM</li>
                <li>• Access to your email address</li>
                <li>• No access to read your existing emails</li>
                <li>• You can revoke access anytime from Google settings</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Connected Email:</span>
                <span className="font-medium">{emailAddress}</span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-900">
                    Ready to Send Emails
                  </p>
                  <p className="text-xs text-green-800">
                    You can now send tracked emails from CSP Events, Customers, and Carriers.
                    All emails will be logged automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handleSendTestEmail}
                className="flex-1"
                disabled={sendingTest}
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={loading || sendingTest}
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-2">How It Works:</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="font-medium text-slate-900 mb-1">1. Send Tracked Emails</p>
                <p>
                  When you compose emails from CSP Events, we automatically add tracking codes,
                  CC monitoring addresses, and log everything to your CRM.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="font-medium text-slate-900 mb-1">2. Clean Subject Lines</p>
                <p>
                  Tracking codes are hidden in email headers. Recipients see natural subject lines
                  like "New Lane Expansion - West Coast" instead of "[CSP-123] Project".
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="font-medium text-slate-900 mb-1">3. Complete Timeline</p>
                <p>
                  All sent emails appear in the Email Timeline tab with full context, recipients,
                  and timestamps for complete communication history.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-green-800 mb-2">Security & Privacy</p>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• OAuth tokens are encrypted and stored securely</li>
              <li>• Only CRM-sent emails are tracked and logged</li>
              <li>• You can disconnect at any time</li>
              <li>• Revoke access anytime from Google account settings</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
