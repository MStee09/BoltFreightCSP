import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Copy, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import EmailForwardingSetup from './EmailForwardingSetup';

export default function EmailTrackingBCC() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [userDomain, setUserDomain] = useState('');

  useEffect(() => {
    loadUserDomain();
  }, []);

  const loadUserDomain = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.email) {
        const domain = profile.email.split('@')[1];
        setUserDomain(domain);
      }

      // Get Supabase URL from the client
      const supabaseUrl = supabase.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || 'https://siujmppdeumvwwvyqcsq.supabase.co';
      setWebhookUrl(`${supabaseUrl}/functions/v1/receive-email`);
    } catch (error) {
      console.error('Error loading user domain:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Reply-To Email Tracking
          </CardTitle>
          <CardDescription>
            Automatically track email replies using unique Reply-To addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm">
              <div className="space-y-2">
                <p className="font-semibold text-green-900">Auto-Enabled!</p>
                <p className="text-green-800">
                  Email tracking is automatically configured. Each email you send will have a unique Reply-To address like:
                </p>
                <div className="bg-white/50 p-2 rounded font-mono text-sm border border-green-300">
                  replies+FO-ABC12345@{userDomain || 'yourdomain.com'}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <div className="space-y-2">
                <p className="font-semibold text-blue-900">How it works</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Each email automatically gets a unique Reply-To address</li>
                  <li>When recipients reply, it goes to that address</li>
                  <li>Set up catch-all forwarding using the wizard below</li>
                  <li>All replies are captured automatically</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {userDomain && webhookUrl && (
        <EmailForwardingSetup domain={userDomain} webhookUrl={webhookUrl} />
      )}
    </div>
  );
}
