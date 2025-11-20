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
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const logError = async (errorType, errorMessage, details = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('oauth_error_logs').insert({
        user_id: user?.id || null,
        user_email: user?.email || details.attemptedEmail || null,
        error_type: errorType,
        error_message: errorMessage,
        error_details: {
          ...details,
          timestamp: new Date().toISOString(),
          url: window.location.href
        },
        oauth_provider: 'gmail',
        callback_url: window.location.href,
        user_agent: navigator.userAgent
      });
    } catch (logError) {
      console.error('Failed to log OAuth error:', logError);
    }
  };

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

      // CRITICAL: Check if we already have a valid Supabase session
      // Supabase automatically restores sessions from localStorage
      console.log('Checking for existing Supabase session...');
      const { data: { session: existingSession }, error: sessionCheckError } = await supabase.auth.getSession();

      console.log('Session check result:', {
        hasSession: !!existingSession,
        userId: existingSession?.user?.id,
        userEmail: existingSession?.user?.email,
        error: sessionCheckError?.message
      });

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

        // Only manually restore if Supabase doesn't already have a session
        if (!existingSession) {
          const sessionData = localStorage.getItem('gmail_auth_session');
          if (sessionData) {
            console.log('No existing session found - manually restoring from localStorage...');
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
            console.error('CRITICAL: No Supabase session and no session data in localStorage!');
            console.error('User will not be able to save Gmail tokens');
          }
        } else {
          console.log('✅ Supabase session already exists, no manual restore needed');
          // Clean up the manual session data since we don't need it
          localStorage.removeItem('gmail_auth_session');
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
      console.log('🔍 DIAGNOSTIC: OAuth client_id being used for token exchange:', client_id.substring(0, 30) + '...');
      console.log('🔍 DIAGNOSTIC: Client secret length:', client_secret.length);

      setMessage('Exchanging authorization code...');

      // CRITICAL: Use explicit production URL if env var is undefined
      const envAppUrl = import.meta.env.VITE_APP_URL;
      const appUrl = envAppUrl || (window.location.hostname === 'freight-csp-tool-p8de.bolt.host'
        ? 'https://freight-csp-tool-p8de.bolt.host'
        : window.location.origin);
      const redirectUri = `${appUrl}/gmail-callback`;

      console.log('Token exchange redirect URI:', {
        envAppUrl,
        windowOrigin: window.location.origin,
        hostname: window.location.hostname,
        computedAppUrl: appUrl,
        redirectUri
      });
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

      console.log('🔍 DIAGNOSTIC: Received tokens from Google:', {
        access_token_length: tokens.access_token?.length,
        refresh_token_length: tokens.refresh_token?.length,
        refresh_token_first_30: tokens.refresh_token?.substring(0, 30) + '...',
        token_type: tokens.token_type,
        scope: tokens.scope
      });

      // CRITICAL: Check if gmail.send scope was granted
      const requestedScopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.settings.basic',
        'https://www.googleapis.com/auth/userinfo.email'
      ];

      const grantedScopes = tokens.scope ? tokens.scope.split(' ') : [];
      const missingScopes = requestedScopes.filter(scope => !grantedScopes.includes(scope));

      if (missingScopes.length > 0) {
        console.error('❌ CRITICAL: Google did NOT grant all requested scopes!');
        console.error('❌ Missing scopes:', missingScopes);
        console.error('');
        console.error('This means your OAuth app needs additional configuration:');
        console.error('1. Go to: https://console.cloud.google.com/apis/credentials/consent');
        console.error('2. Click "EDIT APP" on your OAuth consent screen');
        console.error('3. Scroll to "Scopes" section and click "ADD OR REMOVE SCOPES"');
        console.error('4. Make sure these scopes are checked:');
        missingScopes.forEach(scope => console.error(`   - ${scope}`));
        console.error('5. Click "SAVE AND CONTINUE"');
        console.error('6. If app is in "Testing" mode, make sure your email is listed under "Test users"');
        console.error('');
        console.error('IMPORTANT: Without gmail.send scope, you CANNOT send emails!');

        await logError('missing_oauth_scopes', `Missing required OAuth scopes: ${missingScopes.join(', ')}`, {
          requested: requestedScopes,
          granted: grantedScopes,
          missing: missingScopes
        });

        setErrorDetails({
          title: 'Missing OAuth Permissions',
          message: `Google did not grant all necessary permissions. Missing: ${missingScopes.map(s => s.split('/').pop()).join(', ')}`,
          technicalDetails: `The OAuth app needs to be configured with these scopes in Google Cloud Console: ${missingScopes.join(', ')}`,
          suggestion: 'Go to Google Cloud Console → APIs & Services → OAuth consent screen → Edit App → Scopes → Add the missing scopes. If in Testing mode, add your email as a Test User.'
        });

        throw new Error('Missing required OAuth scopes. Configure the OAuth app in Google Cloud Console.');
      }

      console.log('✅ All required scopes were granted successfully!');

      if (!tokens.refresh_token) {
        console.error('❌ No refresh token received from Google');
        console.error('This usually means:');
        console.error('1. User has already authorized this app');
        console.error('2. Google OAuth consent screen needs to force re-authorization');
        console.error('');
        console.error('To fix: Go to https://myaccount.google.com/permissions');
        console.error('Find "CSP Freight CRM" and click "Remove Access"');
        console.error('Then reconnect from Settings → Integrations');

        await logError('no_refresh_token', 'Google did not issue a refresh token', {
          hasAccessToken: !!tokens.access_token,
          scopes: tokens.scope
        });

        setErrorDetails({
          title: 'Refresh Token Missing',
          message: 'Google did not provide the necessary credentials for long-term access. This happens when you\'ve previously authorized this app.',
          technicalDetails: 'No refresh token in OAuth response',
          suggestion: 'Go to https://myaccount.google.com/permissions, find this app, click "Remove Access", wait 10 seconds, then reconnect.'
        });

        throw new Error('Google did not provide a refresh token. Please revoke existing access first.');
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

      // Wait a bit for Supabase to fully initialize the session
      // This is important because the callback page loads fresh
      console.log('Waiting for Supabase session to be ready...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try multiple times to get the user session
      let user = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (!user && attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts}/${maxAttempts} to get authenticated user...`);

        const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();

        if (getUserError) {
          console.error(`Attempt ${attempts} error:`, getUserError);
        }

        if (currentUser) {
          user = currentUser;
          console.log('✅ User session found:', {
            userId: user.id,
            userEmail: user.email
          });
          break;
        }

        if (attempts < maxAttempts) {
          console.log('No user yet, waiting 300ms before retry...');
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      if (!user) {
        await logError('session_lost', 'User session not found after OAuth redirect', {
          attempts: maxAttempts,
          hasExistingSession: !!existingSession,
          localStorageSessionData: !!localStorage.getItem('gmail_auth_session')
        });

        const friendlyMessage = 'We couldn\'t restore your session after connecting to Google. This can happen if your session expired during the connection process. Please try again, and if the problem persists, try logging out and back in.';

        setErrorDetails({
          title: 'Session Lost',
          message: friendlyMessage,
          technicalDetails: 'Session not found after OAuth redirect',
          suggestion: 'Try logging out and back in, then connect Gmail again'
        });

        throw new Error(friendlyMessage);
      }

      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

      console.log('Attempting to save tokens for user:', user.id);

      // ALWAYS use edge function with service role to save tokens
      // This bypasses any RLS issues completely
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session found');
      }

      console.log('Calling save-gmail-tokens edge function...');

      const saveResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-gmail-tokens`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_address: profile.email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: expiryDate.toISOString(),
          }),
        }
      );

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok) {
        console.error('Edge function failed:', saveResult);
        await logError('token_save_failed', saveResult.error || 'Unknown error', {
          userId: user.id,
          userEmail: user.email,
          statusCode: saveResponse.status,
          details: saveResult.details
        });
        throw new Error(`Failed to save Gmail credentials: ${saveResult.error || 'Unknown error'}`);
      }

      console.log('Gmail tokens saved successfully via edge function:', saveResult);

      if (saveResult.tokenTestResult && !saveResult.tokenTestResult.success) {
        const errorMsg = saveResult.tokenTestResult.error || 'Token validation failed';
        console.error('❌ Token test failed immediately after saving:', errorMsg);

        await logError('token_test_failed_immediate', errorMsg, {
          userId: user.id,
          userEmail: user.email,
          testDetails: saveResult.tokenTestResult
        });

        setErrorDetails({
          title: 'Connection Issue Detected',
          message: 'We successfully connected to Google, but the authorization seems invalid. This usually means your Google OAuth setup needs attention.',
          technicalDetails: errorMsg,
          suggestion: 'The token refresh test failed. This indicates an OAuth client configuration issue or stale permissions.'
        });

        setStatus('error');
        setMessage('Gmail connection test failed');

        await supabase
          .from('user_gmail_tokens')
          .delete()
          .eq('user_id', user.id);

        setTimeout(() => {
          const returnPath = localStorage.getItem('gmail_oauth_return_path') || '/settings';
          localStorage.removeItem('gmail_oauth_return_path');
          navigate(returnPath);
        }, 5000);
        return;
      }

      console.log('✅ Token test passed - connection is healthy');

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

      // Log to database if not already logged (and not a user-friendly error we already logged)
      if (!errorDetails) {
        await logError('callback_error', error.message || 'Unknown error during Gmail OAuth', {
          errorStack: error.stack,
          errorName: error.name
        });

        setErrorDetails({
          title: 'Connection Failed',
          message: error.message || 'An unexpected error occurred while connecting Gmail',
          technicalDetails: error.stack || error.toString(),
          suggestion: 'Please try again. If this keeps happening, contact support.'
        });
      }

      setStatus('error');
      setMessage(errorDetails?.message || error.message || 'Failed to connect Gmail');

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
                <h2 className="text-xl font-semibold text-red-600">
                  {errorDetails?.title || 'Connection Failed'}
                </h2>
                <p className="text-muted-foreground">{message}</p>
                {errorDetails?.suggestion && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-left">
                    <p className="text-sm font-medium text-blue-900 mb-1">What to try:</p>
                    <p className="text-sm text-blue-700">{errorDetails.suggestion}</p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {errorDetails ? 'An error report has been saved. ' : ''}Redirecting...
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
