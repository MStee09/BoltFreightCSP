import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, CheckCircle2, AlertCircle, ExternalLink, Zap, Clock } from 'lucide-react';

export default function EmailSetupGuide() {
  const gmailClientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
  const hasGmailOAuth = gmailClientId && gmailClientId !== 'your-client-id-here.apps.googleusercontent.com';

  return (
    <div className="space-y-6">
      {!hasGmailOAuth && (
        <Alert className="bg-blue-50 border-blue-300">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            <span className="font-semibold text-blue-900">5-Minute Setup:</span> Follow the steps below to enable Gmail integration. Click the links to jump straight to each configuration page.
          </AlertDescription>
        </Alert>
      )}

      {hasGmailOAuth && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm">
            <span className="font-semibold text-green-900">All Set!</span> Gmail integration is configured. Scroll down and click "Connect Gmail Account" to link your Google account.
          </AlertDescription>
        </Alert>
      )}

      {!hasGmailOAuth && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Quick Admin Setup</CardTitle>
                <CardDescription>Click the buttons below - takes 5 minutes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-colors">
                <Badge className="mt-1 h-7 w-7 flex items-center justify-center p-0 text-sm bg-blue-600">
                  1
                </Badge>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Create Google Cloud Project</p>
                  <p className="text-xs text-slate-600 mt-1 mb-3">
                    Name it "FreightOps CRM" and select your organization
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.open('https://console.cloud.google.com/projectcreate', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Create Project in Google Cloud
                  </Button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-colors">
                <Badge className="mt-1 h-7 w-7 flex items-center justify-center p-0 text-sm bg-blue-600">
                  2
                </Badge>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Enable Gmail API</p>
                  <p className="text-xs text-slate-600 mt-1 mb-3">
                    Make sure your new project is selected, then click "Enable"
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.open('https://console.cloud.google.com/apis/library/gmail.googleapis.com', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Enable Gmail API
                  </Button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-colors">
                <Badge className="mt-1 h-7 w-7 flex items-center justify-center p-0 text-sm bg-blue-600">
                  3
                </Badge>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Configure OAuth Consent Screen</p>
                  <div className="text-xs text-slate-600 mt-2 mb-3 space-y-1">
                    <p>• User Type: <span className="font-semibold text-slate-900">Internal</span> (restricts to your org)</p>
                    <p>• App name: FreightOps CRM</p>
                    <p>• Add scopes: gmail.send, gmail.readonly, userinfo.email</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.open('https://console.cloud.google.com/apis/credentials/consent', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Configure OAuth Consent
                  </Button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-colors">
                <Badge className="mt-1 h-7 w-7 flex items-center justify-center p-0 text-sm bg-blue-600">
                  4
                </Badge>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Create OAuth Client ID</p>
                  <div className="text-xs text-slate-600 mt-2 mb-3 space-y-1">
                    <p>• Application type: <span className="font-semibold text-slate-900">Web application</span></p>
                    <p>• Add redirect URI:</p>
                    <code className="block bg-slate-100 px-2 py-1 rounded mt-1 text-blue-600">
                      {window.location.origin}/gmail-callback
                    </code>
                    <p className="text-amber-700 font-medium mt-2">📋 Copy the Client ID after creating!</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Create OAuth Client ID
                  </Button>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border-2 border-green-300">
                <Badge className="mt-1 h-7 w-7 flex items-center justify-center p-0 text-sm bg-green-600">
                  5
                </Badge>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Add Client ID to .env File</p>
                  <p className="text-xs text-slate-600 mt-1 mb-3">
                    Paste your Client ID from step 4:
                  </p>
                  <div className="bg-slate-900 text-green-400 p-3 rounded font-mono text-xs mb-3">
                    VITE_GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
                  </div>
                  <p className="text-xs text-slate-600">
                    Then restart: <code className="bg-slate-100 px-2 py-1 rounded">npm run dev</code>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasGmailOAuth && (
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Gmail Integration Ready</CardTitle>
                  <CardDescription>Connect your account below</CardDescription>
                </div>
              </div>
              <Badge className="bg-green-600 text-white">Configured</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">What You Can Do:</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">Send emails from the app</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">Send user invitations</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">Track conversations</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">Email carriers directly</span>
                </div>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Zap className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs">
                <span className="font-semibold">Next Step:</span> Scroll down and click "Connect Gmail Account" to link your Google account. Takes 5 seconds!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <Alert className="border-slate-200 bg-slate-50">
        <AlertCircle className="h-4 w-4 text-slate-600" />
        <AlertDescription className="text-xs">
          <span className="font-semibold text-slate-900">One-Time Setup:</span> The admin configures this once. After that, any user in your organization can connect their Gmail with a single click - no configuration needed!
        </AlertDescription>
      </Alert>
    </div>
  );
}
