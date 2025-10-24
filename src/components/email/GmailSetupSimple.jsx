import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Check, AlertCircle, RefreshCw, Eye, EyeOff, ExternalLink, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

export function GmailSetupSimple() {
  const [isConnected, setIsConnected] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    checkGmailConnection();
  }, []);

  const checkGmailConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: credentials } = await supabase
        .from('user_gmail_credentials')
        .select('email_address')
        .eq('user_id', user.id)
        .single();

      if (credentials) {
        setIsConnected(true);
        setEmailAddress(credentials.email_address);
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      toast.error('Please enter both email and app password');
      return;
    }

    if (!emailInput.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    const cleanPassword = passwordInput.replace(/\s/g, '');

    if (cleanPassword.length !== 16) {
      toast.error('App Password must be exactly 16 characters (spaces will be removed automatically)');
      return;
    }

    setConnecting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      toast.info('Testing credentials...', { duration: 2000 });

      const nodemailer = await import('https://esm.sh/nodemailer@6.9.7');

      const transporter = nodemailer.default.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: emailInput.trim(),
          pass: cleanPassword,
        },
      });

      await transporter.verify();

      const { error } = await supabase
        .from('user_gmail_credentials')
        .upsert({
          user_id: user.id,
          email_address: emailInput.trim(),
          app_password: cleanPassword,
        });

      if (error) throw error;

      setIsConnected(true);
      setEmailAddress(emailInput.trim());
      setShowSetup(false);
      setEmailInput('');
      setPasswordInput('');
      toast.success('Gmail connected successfully!');
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      if (error.message.includes('Invalid login')) {
        toast.error('Invalid credentials. Please check your email and App Password.');
      } else {
        toast.error('Failed to connect. Please check your credentials.');
      }
    } finally {
      setConnecting(false);
    }
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
        .from('user_gmail_credentials')
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
            {!showSetup ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-900">
                        Quick 2-Minute Setup
                      </p>
                      <p className="text-xs text-blue-800">
                        Connect Gmail or Google Workspace using an App Password. No complex OAuth setup required!
                      </p>
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-blue-900">What you'll need:</p>
                        <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                          <li>Your email address (Gmail or Google Workspace)</li>
                          <li>Google App Password (16-character code)</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setShowSetup(true)} className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Gmail Account
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-blue-900">
                      Quick 3-Step Setup (2 minutes):
                    </p>
                    <div className="space-y-3">
                      <div className="bg-white rounded p-3 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Step 1: Enable 2-Factor Authentication</p>
                        <a
                          href="https://myaccount.google.com/signinoptions/two-step-verification"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-700 underline hover:text-blue-900 font-medium"
                        >
                          Click here to enable 2FA <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-xs text-blue-700 mt-1">(Required by Google - skip if already enabled)</p>
                      </div>

                      <div className="bg-white rounded p-3 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Step 2: Create App Password</p>
                        <a
                          href="https://myaccount.google.com/apppasswords"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-700 underline hover:text-blue-900 font-medium"
                        >
                          Click here to create App Password <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-xs text-blue-700 mt-1">Type "CRM" as name → Click Generate → Copy the 16-character code</p>
                      </div>

                      <div className="bg-white rounded p-3 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Step 3: Paste Below</p>
                        <p className="text-xs text-blue-700">Enter your email and paste the 16-character code in the form below</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="gmail-email">Email Address</Label>
                    <Input
                      id="gmail-email"
                      type="email"
                      placeholder="you@gmail.com or you@company.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      disabled={connecting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Works with Gmail and Google Workspace (custom domain)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gmail-password">App Password</Label>
                    <div className="relative">
                      <Input
                        id="gmail-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value.replace(/\s/g, ''))}
                        disabled={connecting}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      16-character code from Google (spaces don't matter)
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSetup(false);
                      setEmailInput('');
                      setPasswordInput('');
                    }}
                    className="flex-1"
                    disabled={connecting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConnect}
                    className="flex-1"
                    disabled={connecting}
                  >
                    {connecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
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
              <li>• Your credentials are encrypted and stored securely</li>
              <li>• Only CRM-sent emails are tracked and logged</li>
              <li>• You can disconnect at any time</li>
              <li>• App passwords can be revoked anytime from Google</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
