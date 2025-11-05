import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, Server, Key, CheckCircle2, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export default function EmailSetupGuide() {
  const { toast } = useToast();
  const [copiedSection, setCopiedSection] = useState(null);

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast({
      title: "Copied to clipboard",
      description: "The text has been copied to your clipboard.",
    });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const gmailClientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
  const hasGmailOAuth = gmailClientId && gmailClientId !== 'your-client-id-here.apps.googleusercontent.com';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Email System Setup</h3>
        <p className="text-sm text-slate-600">
          This application uses two email systems. Both need to be configured for full functionality.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* SMTP Email System */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Server className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">SMTP Email</CardTitle>
                  <CardDescription className="text-xs">For system notifications</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                Required
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">Used For:</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  Sending user invitations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  Feedback emails to support
                </li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Setup Steps:</h4>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    1
                  </Badge>
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-slate-900">Get Gmail App Password</p>
                    <p className="text-slate-600 mt-0.5">
                      Google Account → Security → 2-Step Verification → App passwords
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs mt-1"
                      onClick={() => window.open('https://myaccount.google.com/apppasswords', '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Google App Passwords
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    2
                  </Badge>
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-slate-900">Add Secrets to Supabase</p>
                    <p className="text-slate-600 mt-0.5">
                      Project Settings → Edge Functions → Manage secrets
                    </p>
                    <div className="mt-2 space-y-1 font-mono text-xs bg-slate-50 p-2 rounded border">
                      <div className="flex items-center justify-between">
                        <code>EMAIL_USERNAME = your-email@gmail.com</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard('EMAIL_USERNAME', 'username')}
                        >
                          {copiedSection === 'username' ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <code>EMAIL_PASSWORD = abcdefghijklmnop</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard('EMAIL_PASSWORD', 'password')}
                        >
                          {copiedSection === 'password' ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <code>EMAIL_FROM = your-email@gmail.com</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard('EMAIL_FROM', 'from')}
                        >
                          {copiedSection === 'from' ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs mt-1"
                      onClick={() => window.open(`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}/settings/functions`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Supabase Secrets
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    3
                  </Badge>
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-slate-900">Test It</p>
                    <p className="text-slate-600 mt-0.5">
                      Go to User Management → Invite User
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gmail OAuth System */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Mail className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Gmail OAuth</CardTitle>
                  <CardDescription className="text-xs">For personal email integration</CardDescription>
                </div>
              </div>
              {hasGmailOAuth ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  Required
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">Used For:</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  Sending emails from the app
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  Email timeline tracking
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  Direct carrier communication
                </li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Setup Steps:</h4>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    1
                  </Badge>
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-slate-900">Create Google Cloud Project</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs mt-1"
                      onClick={() => window.open('https://console.cloud.google.com', '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Google Cloud Console
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    2
                  </Badge>
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-slate-900">Enable Gmail API</p>
                    <p className="text-slate-600 mt-0.5">
                      APIs & Services → Library → Search "Gmail API" → Enable
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    3
                  </Badge>
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-slate-900">Configure OAuth Consent Screen</p>
                    <p className="text-slate-600 mt-0.5">
                      Add required scopes and test users
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    4
                  </Badge>
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-slate-900">Create OAuth Client ID</p>
                    <p className="text-slate-600 mt-0.5">
                      Credentials → Create OAuth 2.0 Client ID
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs mt-1"
                      onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Credentials Page
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    5
                  </Badge>
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-slate-900">Add to .env file</p>
                    <div className="mt-1 font-mono text-xs bg-slate-50 p-2 rounded border flex items-center justify-between">
                      <code>VITE_GMAIL_CLIENT_ID=your-id.apps.googleusercontent.com</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard('VITE_GMAIL_CLIENT_ID', 'client-id')}
                      >
                        {copiedSection === 'client-id' ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-slate-500 mt-1">Then restart your dev server</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <span className="font-semibold">Security Note:</span> Supabase secrets are only accessible to your edge functions and are never exposed to the client.
          Your Gmail App Password is different from your regular password and has limited scope for additional security.
        </AlertDescription>
      </Alert>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">Need More Help?</h4>
              <p className="text-xs text-slate-600">
                For detailed step-by-step instructions with screenshots, see the complete setup guide:
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => window.open('/EMAIL_SETUP_COMPLETE_GUIDE.md', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                View Complete Setup Guide
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
