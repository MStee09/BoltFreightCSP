import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/api/supabaseClient';
import { Key, Save, ExternalLink, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export function OAuthCredentials() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState({
    client_id: '',
    client_secret: ''
  });
  const [hasCredentials, setHasCredentials] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    setCurrentUrl(appUrl);
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'gmail_oauth_credentials')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const creds = data.setting_value;
        setCredentials({
          client_id: creds.client_id || '',
          client_secret: creds.client_secret ? '••••••••••••••••' : ''
        });
        setHasCredentials(!!(creds.client_id && creds.client_secret));
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!credentials.client_id || !credentials.client_secret) {
      toast({
        title: "Missing credentials",
        description: "Please provide both Client ID and Client Secret",
        variant: "destructive"
      });
      return;
    }

    if (credentials.client_secret === '••••••••••••••••') {
      toast({
        title: "No changes",
        description: "Please enter a new Client Secret or leave unchanged",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'gmail_oauth_credentials',
          setting_value: {
            client_id: credentials.client_id,
            client_secret: credentials.client_secret
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      toast({
        title: "Credentials saved",
        description: "Gmail OAuth credentials have been updated successfully"
      });

      setHasCredentials(true);
      await loadCredentials();
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Error",
        description: "Failed to save credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Gmail OAuth Configuration
            </CardTitle>
            <CardDescription>
              Configure your Google OAuth credentials for Gmail integration
            </CardDescription>
          </div>
          {hasCredentials && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  Google Cloud Console <ExternalLink className="h-3 w-3" />
                </a></li>
                <li>Create or select a project</li>
                <li>Enable the Gmail API</li>
                <li>Create OAuth 2.0 credentials (Web application)</li>
                <li>Add authorized JavaScript origins and redirect URIs (see below)</li>
                <li>Copy your Client ID and Client Secret here</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <Label className="text-sm font-medium">Current App URL</Label>
            <Input
              value={currentUrl}
              readOnly
              className="mt-1 bg-white font-mono text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Authorized JavaScript Origins</Label>
              <div className="mt-1 p-2 bg-white border rounded text-sm font-mono break-all">
                {currentUrl ? new URL(currentUrl).origin : 'Loading...'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Add this to your Google OAuth settings
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Authorized Redirect URIs</Label>
              <div className="mt-1 p-2 bg-white border rounded text-sm font-mono break-all">
                {currentUrl ? `${currentUrl}/gmail-callback` : 'Loading...'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Add this to your Google OAuth settings
              </p>
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Important:</strong> If you change domains or deploy to a new URL, you must:
              <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                <li>Update these origins/redirects in Google Cloud Console</li>
                <li>Update the credentials here by clicking "Update Configuration"</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="client_id">Google Client ID</Label>
            <Input
              id="client_id"
              type="text"
              placeholder="123456789012-abcdefghijklmnop.apps.googleusercontent.com"
              value={credentials.client_id}
              onChange={(e) => handleInputChange('client_id', e.target.value)}
              disabled={loading}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Ends with .apps.googleusercontent.com
            </p>
          </div>

          <div>
            <Label htmlFor="client_secret">Google Client Secret</Label>
            <Input
              id="client_secret"
              type="password"
              placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
              value={credentials.client_secret}
              onChange={(e) => handleInputChange('client_secret', e.target.value)}
              disabled={loading}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Starts with GOCSPX-
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={loading || saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {hasCredentials ? 'Update Configuration' : 'Save Configuration'}
              </>
            )}
          </Button>

          {hasCredentials && (
            <Button
              onClick={loadCredentials}
              variant="outline"
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        {hasCredentials && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              OAuth credentials are configured. Users can now connect their Gmail accounts in the Integrations tab.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
