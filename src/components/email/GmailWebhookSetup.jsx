import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, RefreshCw, AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { gmailService } from '@/api/gmailService';

export function GmailWebhookSetup() {
  const [loading, setLoading] = useState(true);
  const [watchActive, setWatchActive] = useState(false);
  const [watchDetails, setWatchDetails] = useState(null);
  const [topicName, setTopicName] = useState('');
  const [settingUpWatch, setSettingUpWatch] = useState(false);
  const [hasTokens, setHasTokens] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://siujmppdeumvwwvyqcsq.supabase.co';
  const webhookUrl = `${supabaseUrl}/functions/v1/gmail-webhook`;

  useEffect(() => {
    checkWatchStatus();
  }, []);

  const checkWatchStatus = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokens } = await supabase
        .from('user_gmail_tokens')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setHasTokens(!!tokens);

      if (!tokens) {
        setLoading(false);
        return;
      }

      const { data: watch } = await supabase
        .from('gmail_watch_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (watch) {
        setWatchActive(true);
        setWatchDetails(watch);

        const expirationDate = new Date(watch.expiration);
        if (expirationDate < new Date()) {
          toast.warning('Gmail watch subscription has expired. Please renew it.');
        }
      }
    } catch (error) {
      console.error('Error checking watch status:', error);
      toast.error('Failed to check webhook status');
    } finally {
      setLoading(false);
    }
  };

  const setupWatch = async () => {
    if (!topicName.trim()) {
      toast.error('Please enter your Pub/Sub topic name');
      return;
    }

    setSettingUpWatch(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: tokens } = await supabase
        .from('user_gmail_tokens')
        .select('access_token')
        .eq('user_id', user.id)
        .single();

      if (!tokens) {
        throw new Error('Gmail not connected. Please connect Gmail first.');
      }

      const watchResponse = await gmailService.setupWatch({
        accessToken: tokens.access_token,
        topicName: topicName.trim(),
      });

      const expirationTimestamp = parseInt(watchResponse.expiration);
      const expirationDate = new Date(expirationTimestamp);

      const { error: dbError } = await supabase
        .from('gmail_watch_subscriptions')
        .upsert({
          user_id: user.id,
          email_address: tokens.email_address,
          history_id: watchResponse.historyId,
          expiration: expirationDate.toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (dbError) throw dbError;

      toast.success('Gmail webhook configured successfully!');
      await checkWatchStatus();
    } catch (error) {
      console.error('Error setting up watch:', error);
      toast.error(error.message || 'Failed to setup webhook');
    } finally {
      setSettingUpWatch(false);
    }
  };

  const stopWatch = async () => {
    setSettingUpWatch(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: tokens } = await supabase
        .from('user_gmail_tokens')
        .select('access_token')
        .eq('user_id', user.id)
        .single();

      if (!tokens) {
        throw new Error('Gmail not connected');
      }

      await gmailService.stopWatch({
        accessToken: tokens.access_token,
      });

      await supabase
        .from('gmail_watch_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      toast.success('Gmail webhook stopped');
      setWatchActive(false);
      setWatchDetails(null);
    } catch (error) {
      console.error('Error stopping watch:', error);
      toast.error('Failed to stop webhook');
    } finally {
      setSettingUpWatch(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Gmail Webhook Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasTokens) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Gmail Webhook Setup
          </CardTitle>
          <CardDescription>
            Automatically track email replies in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your Gmail account first to enable webhook notifications.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {watchActive ? (
            <Bell className="h-5 w-5 text-green-500" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          Gmail Webhook Setup
        </CardTitle>
        <CardDescription>
          Automatically track email replies and new messages in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {watchActive && watchDetails ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-medium mb-1">Webhook Active</div>
                <div className="text-sm space-y-1">
                  <div>Email: {watchDetails.email_address}</div>
                  <div>
                    Expires:{' '}
                    {new Date(watchDetails.expiration).toLocaleString()}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={checkWatchStatus}
                variant="outline"
                disabled={settingUpWatch}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
              <Button
                onClick={stopWatch}
                variant="destructive"
                disabled={settingUpWatch}
              >
                <BellOff className="h-4 w-4 mr-2" />
                Stop Webhook
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                To receive real-time notifications when emails arrive, you need to configure Gmail push notifications.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <div>
                <h4 className="font-medium mb-2">Setup Instructions:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    Create a{' '}
                    <a
                      href="https://console.cloud.google.com/cloudpubsub/topic/list"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Pub/Sub Topic
                      <ExternalLink className="h-3 w-3" />
                    </a>{' '}
                    in Google Cloud Console
                  </li>
                  <li>
                    Add <code className="text-xs bg-muted px-1 py-0.5 rounded">gmail-api-push@system.gserviceaccount.com</code> as a Publisher
                  </li>
                  <li>
                    Create a Push Subscription pointing to:
                    <div className="mt-1 flex items-center gap-2">
                      <code className="text-xs bg-background px-2 py-1 rounded border flex-1 overflow-x-auto">
                        {webhookUrl}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(webhookUrl)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                  <li>Copy your Pub/Sub topic name and enter it below</li>
                </ol>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topicName">Pub/Sub Topic Name</Label>
              <div className="flex gap-2">
                <Input
                  id="topicName"
                  placeholder="projects/your-project/topics/gmail-notifications"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  disabled={settingUpWatch}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Format: projects/YOUR_PROJECT_ID/topics/YOUR_TOPIC_NAME
              </p>
            </div>

            <Button
              onClick={setupWatch}
              disabled={!topicName.trim() || settingUpWatch}
              className="w-full"
            >
              {settingUpWatch ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Webhook
                </>
              )}
            </Button>
          </div>
        )}

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Note:</strong> Gmail watch subscriptions expire after 7 days and need to be renewed.
            We'll remind you before expiration.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
