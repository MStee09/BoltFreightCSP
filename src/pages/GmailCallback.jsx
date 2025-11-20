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
      const errorDescription = urlParams.get('error_description');

      console.log('Callback started:', {
        code: code?.substring(0, 10),
        error,
        errorDescription,
        fullUrl: window.location.href,
        isPopup
      });

      if (error) {
        console.error('OAuth Error:', error, errorDescription);
        throw new Error(`Gmail authorization failed: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
      }

      if (!code) {
        console.error('No code in URL. Full URL:', window.location.href);
        throw new Error('No authorization code received');
      }

      setMessage('Loading OAuth credentials...');

      // Try to get credentials from localStorage first (for popup scenario)
      const tempCreds = localStorage.getItem('gmail_oauth_temp');
      console.log('localStorage check:', {
        tempCreds: tempCreds ? 'FOUND' : 'NOT FOUND',
        length: tempCreds?.length
      });

      let client_id, client_secret;

      if (tempCreds) {
        console.log('Using credentials from localStorage');
        const creds = JSON.parse(tempCreds);
        client_id = creds.client_id;
        client_secret = creds.client_secret;
        // Clean up temporary storage
        localStorage.removeItem('gmail_oauth_temp');
      } else {
        console.log('Credentials not in localStorage, trying to restore session...');

        // Try to restore the session from localStorage
        const sessionData = localStorage.getItem('gmail_auth_session');
        if (sessionData) {
          console.log('Restoring session from localStorage...');
          const session = JSON.parse(sessionData);
          const { data: sessionResult, error: sessionError } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          });

          if (sessionError) {
            console.error('Failed to restore session:', sessionError);
          } else {
            console.log('Session restored successfully:', {
              userId: sessionResult.user?.id,
              email: sessionResult.user?.email
            });
          }

          localStorage.removeItem('gmail_auth_session');
        } else {
          console.warn('No session data found in localStorage - user may not be authenticated');
        }

        // Fallback to database (for non-popup scenario)
        const { data: credData, error: credError } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'gmail_oauth_credentials')
          .maybeSingle();

        console.log('Database query result:', {
          hasData: !!credData,
          error: credError?.message
        });

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

      console.log('Credentials loaded successfully');

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

      console.log('Token exchange successful:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresIn: tokens.expires_in
      });

      if (!tokens.refresh_token) {
        console.error('❌ No refresh token received from Google');
        console.error('This usually means:');
        console.error('1. User has already authorized this app');
        console.error('2. Google OAuth consent screen needs to force re-authorization');
        console.error('');
        console.error('To fix: Go to https://myaccount.google.com/permissions');
        console.error('Find "CSP Freight CRM" and click "Remove Access"');
        console.error('Then reconnect from Settings → Integrations');

        throw new Error('Google did not provide a refresh token. This app may have been previously authorized. Please go to https://myaccount.google.com/permissions, remove "CSP Freight CRM" access, then reconnect.');
      }

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

      const { data: { user }, error: getUserError } = await supabase.auth.getUser();

      console.log('Current auth state:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        error: getUserError?.message
      });

      if (!user) {
        console.error('User not authenticated when trying to save Gmail tokens');
        console.error('This usually means the session was not properly restored');
        throw new Error('Authentication session lost. Please close this window and try connecting again from the Settings page.');
      }

      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

      console.log('Attempting to save tokens for user:', user.id);

      const { data: insertedData, error: dbError } = await supabase
        .from('user_gmail_tokens')
        .upsert({
          user_id: user.id,
          email_address: profile.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select();

      console.log('Token save result:', { insertedData, dbError });

      if (dbError) {
        console.error('Database error saving tokens:', dbError);
        throw new Error(`Failed to save Gmail credentials: ${dbError.message}`);
      }

      if (!insertedData || insertedData.length === 0) {
        console.error('No data returned from upsert - RLS may have blocked the operation');
        throw new Error('Failed to save Gmail credentials - permission denied');
      }

      console.log('Gmail tokens saved successfully:', {
        userId: insertedData[0].user_id,
        email: insertedData[0].email_address
      });

      // Verify the data was actually saved by reading it back
      const { data: verifyData, error: verifyError } = await supabase
        .from('user_gmail_tokens')
        .select('email_address')
        .eq('user_id', user.id)
        .maybeSingle();

      if (verifyError || !verifyData) {
        console.error('Verification failed - data not found after save:', verifyError);
        throw new Error('Failed to verify Gmail credentials were saved');
      }

      console.log('Verification passed - Gmail credentials confirmed in database');

      setStatus('success');
      setMessage('Gmail connected successfully!');

      // Get return path or default to settings
      const returnPath = localStorage.getItem('gmail_oauth_return_path') || '/settings';
      localStorage.removeItem('gmail_oauth_return_path');

      // If in popup, close it and notify parent
      if (isPopup) {
        try {
          window.opener.postMessage({ type: 'GMAIL_AUTH_SUCCESS', email: profile.email }, '*');
        } catch (e) {
          console.error('Failed to notify parent:', e);
        }
        setTimeout(() => {
          window.close();
        }, 2500);
      } else {
        toast.success('Gmail account connected');
        setTimeout(() => {
          navigate(returnPath);
        }, 1500);
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
        // Don't close immediately on error - let user see what happened
        setTimeout(() => {
          window.close();
        }, 5000);
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
