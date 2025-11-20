import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, Mail, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export function GmailReconnectModal({ isOpen, onClose, onReconnected, errorMessage }) {
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const [reconnecting, setReconnecting] = useState(false);
  const [step, setStep] = useState('idle');
  const [googleClientId, setGoogleClientId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadOAuthCredentials();
    }
  }, [isOpen]);

  const loadOAuthCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'gmail_oauth_credentials')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value?.client_id) {
        setGoogleClientId(data.setting_value.client_id);
      }
    } catch (error) {
      console.error('Error loading OAuth credentials:', error);
    }
  };

  const handleReconnect = async () => {
    if (!googleClientId) {
      toast.error('OAuth credentials not configured. Please contact your administrator.');
      return;
    }

    setReconnecting(true);
    setStep('cleaning');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const effectiveUserId = isImpersonating ? impersonatedUser.id : user.id;

      const { data: existingTokens } = await supabase
        .from('user_gmail_tokens')
        .select('access_token, refresh_token')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (existingTokens) {
        const tokensToRevoke = [
          existingTokens.access_token,
          existingTokens.refresh_token
        ].filter(Boolean);

        for (const token of tokensToRevoke) {
          try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            });
          } catch (revokeError) {
            console.warn('Could not revoke token:', revokeError.message);
          }
        }

        await supabase
          .from('user_gmail_tokens')
          .delete()
          .eq('user_id', effectiveUserId);
      }

      setStep('oauth');

      const { data: credData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'gmail_oauth_credentials')
        .maybeSingle();

      if (!credData?.setting_value?.client_secret) {
        throw new Error('OAuth client secret not configured');
      }

      localStorage.setItem('gmail_oauth_temp', JSON.stringify(credData.setting_value));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        localStorage.setItem('gmail_auth_session', JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        }));
      }

      const envAppUrl = import.meta.env.VITE_APP_URL;
      const appUrl = envAppUrl || (window.location.hostname === 'freight-csp-tool-p8de.bolt.host'
        ? 'https://freight-csp-tool-p8de.bolt.host'
        : window.location.origin);
      const redirectUri = `${appUrl}/gmail-callback`;
      const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.settings.basic https://www.googleapis.com/auth/userinfo.email';

      const state = btoa(JSON.stringify({
        timestamp: Date.now(),
        random: Math.random().toString(36),
        reconnect: true
      }));

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(googleClientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(state)}`;

      localStorage.setItem('gmail_oauth_return_path', window.location.pathname);
      localStorage.setItem('gmail_reconnect_modal', 'true');

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error reconnecting Gmail:', error);
      toast.error('Failed to start reconnection. Please try again.');
      setReconnecting(false);
      setStep('idle');
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case 'cleaning':
        return 'Cleaning up old connection...';
      case 'oauth':
        return 'Redirecting to Google...';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Connection Lost
          </DialogTitle>
          <DialogDescription>
            Your Gmail connection needs to be refreshed to continue sending emails.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900">
                  Quick Reconnection
                </p>
                <p className="text-xs text-blue-800">
                  Click the button below to reconnect your Gmail account. You'll be taken to Google to reauthorize, then automatically returned here.
                </p>
              </div>
            </div>
          </div>

          {reconnecting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>{getStepMessage()}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={reconnecting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleReconnect}
            disabled={reconnecting || !googleClientId}
            className="flex-1"
          >
            {reconnecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Reconnect Gmail
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
