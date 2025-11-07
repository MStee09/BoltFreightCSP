import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Check, X } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export default function GmailCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Connecting to Gmail...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    // Check if we're in a popup window
    const isPopup = window.opener && !window.opener.closed;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        throw new Error('Gmail authorization was denied');
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      setMessage('Loading OAuth credentials...');

      // Try to get credentials from localStorage first (for popup scenario)
      const tempCreds = localStorage.getItem('gmail_oauth_temp');
      let client_id, client_secret;

      if (tempCreds) {
        const creds = JSON.parse(tempCreds);
        client_id = creds.client_id;
        client_secret = creds.client_secret;
        // Clean up temporary storage
        localStorage.removeItem('gmail_oauth_temp');
      } else {
        // Fallback to database (for non-popup scenario)
        const { data: credData, error: credError } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'gmail_oauth_credentials')
          .maybeSingle();

        if (credError) throw credError;

        if (!credData?.setting_value?.client_id || !credData?.setting_value?.client_secret) {
          throw new Error('OAuth credentials not configured');
        }

        client_id = credData.setting_value.client_id;
        client_secret = credData.setting_value.client_secret;
      }

      if (!client_id || !client_secret) {
        throw new Error('OAuth credentials not configured');
      }

      setMessage('Exchanging authorization code...');

      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectUri = `${appUrl}/gmail-callback`;
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id,
          client_secret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Token exchange error:', errorData);
        throw new Error(errorData.error_description || 'Failed to exchange authorization code');
      }

      const tokens = await tokenResponse.json();

      setMessage('Fetching Gmail profile...');

      const profileResponse = await fetch(
        'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
          },
        }
      );

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch Gmail profile');
      }

      const profile = await profileResponse.json();

      setMessage('Saving credentials...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

      const { error: dbError } = await supabase
        .from('user_gmail_tokens')
        .upsert({
          user_id: user.id,
          email_address: profile.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        throw new Error('Failed to save Gmail credentials');
      }

      setStatus('success');
      setMessage('Gmail connected successfully!');

      // If in popup, close it and notify parent
      if (isPopup) {
        try {
          window.opener.postMessage({ type: 'GMAIL_AUTH_SUCCESS', email: profile.email }, '*');
        } catch (e) {
          console.error('Failed to notify parent:', e);
        }
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        toast.success('Gmail account connected');
        setTimeout(() => {
          navigate('/settings');
        }, 2000);
      }
    } catch (error) {
      console.error('Gmail callback error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to connect Gmail');

      // If in popup, close it and notify parent
      if (isPopup) {
        try {
          window.opener.postMessage({ type: 'GMAIL_AUTH_ERROR', error: error.message }, '*');
        } catch (e) {
          console.error('Failed to notify parent:', e);
        }
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        toast.error('Failed to connect Gmail');
        setTimeout(() => {
          navigate('/settings');
        }, 3000);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            {status === 'processing' && (
              <>
                <RefreshCw className="h-12 w-12 animate-spin text-primary" />
                <h2 className="text-xl font-semibold">Connecting Gmail</h2>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="rounded-full bg-green-100 p-3">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-green-600">Connected!</h2>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">Redirecting...</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="rounded-full bg-red-100 p-3">
                  <X className="h-12 w-12 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-red-600">Connection Failed</h2>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">Redirecting...</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
