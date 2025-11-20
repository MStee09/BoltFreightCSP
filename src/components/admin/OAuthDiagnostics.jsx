import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

export function OAuthDiagnostics() {
  const [running, setRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);

  const runDiagnostics = async () => {
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/diagnose-oauth`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Diagnostic failed');
      }

      const result = await response.json();
      setDiagnostics(result);
      toast.success('Diagnostic complete');
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast.error(error.message || 'Failed to run diagnostics');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          OAuth Diagnostics
        </CardTitle>
        <CardDescription>
          Run comprehensive diagnostics on your Gmail OAuth configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={running}>
          {running ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Stethoscope className="h-4 w-4 mr-2" />
              Run Diagnostics
            </>
          )}
        </Button>

        {diagnostics && (
          <div className="space-y-4">
            {/* Potential Issues */}
            {diagnostics.potentialIssues && diagnostics.potentialIssues.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Issues Detected:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {diagnostics.potentialIssues.map((issue, idx) => (
                      <li key={idx} className="whitespace-pre-wrap">{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Refresh Token Test */}
            {diagnostics.refreshTokenTest && (
              <Alert variant={diagnostics.refreshTokenTest.success ? "default" : "destructive"}>
                {diagnostics.refreshTokenTest.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="font-semibold mb-2">Token Refresh Test:</div>
                  <div className="text-sm space-y-1">
                    <div>{diagnostics.refreshTokenTest.message}</div>
                    {!diagnostics.refreshTokenTest.success && (
                      <>
                        <div className="text-xs mt-2">
                          <strong>Error:</strong> {diagnostics.refreshTokenTest.error}
                        </div>
                        {diagnostics.refreshTokenTest.errorDescription && (
                          <div className="text-xs">
                            <strong>Details:</strong> {diagnostics.refreshTokenTest.errorDescription}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* OAuth Credentials Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="font-semibold text-sm">OAuth Configuration:</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-600">Client ID:</div>
                  <div className="font-mono text-xs break-all">{diagnostics.oauthCredentials?.clientId || 'Not set'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Client Secret Length:</div>
                  <div>{diagnostics.oauthCredentials?.clientSecretLength || 0} chars</div>
                </div>
                <div>
                  <div className="text-gray-600">Last Modified:</div>
                  <div>{diagnostics.oauthCredentials?.lastModified ?
                    new Date(diagnostics.oauthCredentials.lastModified).toLocaleString() :
                    'Never'
                  }</div>
                </div>
                <div>
                  <div className="text-gray-600">Status:</div>
                  <Badge variant={diagnostics.oauthCredentials?.exists ? "default" : "destructive"}>
                    {diagnostics.oauthCredentials?.exists ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* User Tokens Info */}
            {diagnostics.userTokens?.exists && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <div className="font-semibold text-sm">Your Gmail Tokens:</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-gray-600">Email:</div>
                    <div>{diagnostics.userTokens.emailAddress}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Token Age:</div>
                    <div>{diagnostics.userTokens.tokenAge}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Refresh Token Length:</div>
                    <div>{diagnostics.userTokens.refreshTokenLength} chars</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Last Updated:</div>
                    <div>{diagnostics.userTokens.updatedAt ?
                      new Date(diagnostics.userTokens.updatedAt).toLocaleString() :
                      'Never'
                    }</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Errors */}
            {diagnostics.recentErrors && diagnostics.recentErrors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 space-y-3">
                <div className="font-semibold text-sm">Recent Errors ({diagnostics.recentErrors.length}):</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {diagnostics.recentErrors.slice(0, 5).map((error, idx) => (
                    <div key={idx} className="text-xs bg-white rounded p-2">
                      <div className="font-semibold">{error.type}</div>
                      <div className="text-gray-600">{error.message}</div>
                      <div className="text-gray-400 text-[10px] mt-1">
                        {new Date(error.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Diagnostics (collapsed) */}
            <details className="bg-gray-100 rounded-lg p-4">
              <summary className="cursor-pointer font-semibold text-sm">
                View Raw Diagnostic Data
              </summary>
              <pre className="mt-2 text-xs overflow-auto max-h-96 bg-white p-2 rounded">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
