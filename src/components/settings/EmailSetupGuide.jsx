import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, CheckCircle2, AlertCircle, ExternalLink, Zap } from 'lucide-react';

export default function EmailSetupGuide() {
  const gmailClientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
  const hasGmailOAuth = gmailClientId && gmailClientId !== 'your-client-id-here.apps.googleusercontent.com';

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <Zap className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm">
          <span className="font-semibold text-blue-900">Simplified Email Setup:</span> Just connect your Gmail account once using Google Sign-In. No passwords or app-specific credentials needed!
        </AlertDescription>
      </Alert>

      <Card className="border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Gmail Integration</CardTitle>
                <CardDescription>One-click setup with Google OAuth</CardDescription>
              </div>
            </div>
            {hasGmailOAuth ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                Setup Required
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">What This Enables:</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">Send emails directly from the app</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">Send user invitations</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">Track email conversations</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">Communicate with carriers</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-900">Setup Steps:</h4>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Badge variant="secondary" className="mt-0.5 h-6 w-6 flex items-center justify-center p-0 text-sm">
                  1
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Create Google Cloud Project</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Go to Google Cloud Console and create a new project
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs mt-2"
                    onClick={() => window.open('https://console.cloud.google.com/projectcreate', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Google Cloud Console
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Badge variant="secondary" className="mt-0.5 h-6 w-6 flex items-center justify-center p-0 text-sm">
                  2
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Enable Gmail API</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Navigate to: APIs & Services → Library → Search "Gmail API" → Click Enable
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Badge variant="secondary" className="mt-0.5 h-6 w-6 flex items-center justify-center p-0 text-sm">
                  3
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Configure OAuth Consent Screen</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Go to: APIs & Services → OAuth consent screen → Choose "External"
                  </p>
                  <ul className="text-xs text-slate-600 mt-2 ml-4 space-y-1">
                    <li>• Add app name and support email</li>
                    <li>• Add required scopes (gmail.send, gmail.readonly)</li>
                    <li>• Add test users (your email addresses)</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Badge variant="secondary" className="mt-0.5 h-6 w-6 flex items-center justify-center p-0 text-sm">
                  4
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Create OAuth Client ID</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Go to: APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
                  </p>
                  <ul className="text-xs text-slate-600 mt-2 ml-4 space-y-1">
                    <li>• Application type: Web application</li>
                    <li>• Authorized redirect URIs:</li>
                    <li className="ml-4 font-mono text-blue-600">http://localhost:5173/gmail-callback</li>
                    <li className="ml-4 text-slate-500">(Add production URL later)</li>
                  </ul>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs mt-2"
                    onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Credentials Page
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                <Badge className="mt-0.5 h-6 w-6 flex items-center justify-center p-0 text-sm bg-blue-600">
                  5
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Add Client ID to .env File</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Copy your Client ID and add it to your <code className="bg-slate-200 px-1 rounded">.env</code> file:
                  </p>
                  <div className="mt-2 font-mono text-xs bg-slate-900 text-green-400 p-3 rounded border border-slate-700">
                    VITE_GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
                  </div>
                  <p className="text-xs text-slate-500 mt-2 italic">Then restart your dev server</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Badge variant="secondary" className="mt-0.5 h-6 w-6 flex items-center justify-center p-0 text-sm bg-green-600 text-white">
                  ✓
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Test Your Connection</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Scroll down and click "Connect Gmail Account" → Sign in with Google
                  </p>
                  <p className="text-xs text-green-700 mt-2 font-medium">
                    That's it! No passwords, no app-specific credentials needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-xs">
          <span className="font-semibold text-green-900">Secure by Design:</span> Your Gmail credentials are never stored.
          Google provides secure OAuth tokens that can be revoked anytime from your Google Account settings.
        </AlertDescription>
      </Alert>

      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">Need Help?</h4>
              <p className="text-xs text-slate-600">
                For detailed step-by-step instructions with screenshots, see the complete setup guide.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/EMAIL_SETUP_COMPLETE_GUIDE.md';
                  link.download = 'EMAIL_SETUP_COMPLETE_GUIDE.md';
                  link.click();
                }}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Download Setup Guide
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
