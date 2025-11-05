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
      {!hasGmailOAuth && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <span className="font-semibold text-amber-900">Admin Setup Required:</span> Your Google Workspace administrator needs to configure Gmail integration for your organization. Once setup is complete, you'll be able to connect your Gmail account with a single click.
          </AlertDescription>
        </Alert>
      )}

      {hasGmailOAuth && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm">
            <span className="font-semibold text-green-900">Ready to Connect:</span> Your administrator has configured Gmail integration. Just click "Connect Gmail Account" below to get started!
          </AlertDescription>
        </Alert>
      )}

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
            {!hasGmailOAuth && (
              <>
                <h4 className="text-sm font-semibold text-slate-900">For Administrators:</h4>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs">
                    If you're a Google Workspace administrator, follow the detailed setup guide to configure Gmail integration for your entire organization.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/GOOGLE_WORKSPACE_ADMIN_SETUP.md';
                    link.download = 'GOOGLE_WORKSPACE_ADMIN_SETUP.md';
                    link.click();
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Download Admin Setup Guide
                </Button>
              </>
            )}

            {!hasGmailOAuth && (
              <>
                <Separator />
                <h4 className="text-sm font-semibold text-slate-900">Quick Overview (Admin Only):</h4>
              </>
            )}

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Badge variant="secondary" className="mt-0.5 h-6 w-6 flex items-center justify-center p-0 text-sm">
                  1
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Admin: Create Google Cloud Project</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Workspace admin creates project in Google Cloud Console
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Badge variant="secondary" className="mt-0.5 h-6 w-6 flex items-center justify-center p-0 text-sm">
                  2
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Admin: Enable Gmail API & Configure OAuth</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Set OAuth consent to "Internal" (restricts to organization only)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Badge variant="secondary" className="mt-0.5 h-6 w-6 flex items-center justify-center p-0 text-sm">
                  3
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Admin: Add Client ID to Application</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Configure VITE_GMAIL_CLIENT_ID in environment variables
                  </p>
                </div>
              </div>

              {hasGmailOAuth && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border-2 border-green-200">
                  <Badge className="mt-0.5 h-6 w-6 flex items-center justify-center p-0 text-sm bg-green-600 text-white">
                    ✓
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">You're Ready!</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Click "Connect Gmail Account" below → Sign in with your company Google account → Done!
                    </p>
                    <p className="text-xs text-green-700 mt-2 font-medium">
                      No configuration needed from you - just one click to connect!
                    </p>
                  </div>
                </div>
              )}
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
