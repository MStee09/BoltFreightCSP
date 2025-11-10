import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export function InviteUserDialog({ open, onOpenChange, onInviteSent }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('basic');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        toast.error('A user with this email already exists');
        return;
      }

      const { data: existingInvitation } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvitation) {
        toast.error('An invitation has already been sent to this email');
        return;
      }

      const token = await generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
          token,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        });

      if (inviteError) throw inviteError;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://siujmppdeumvwwvyqcsq.supabase.co';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdWptcHBkZXVtdnd3dnlxY3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTg5NjQsImV4cCI6MjA3NjYzNDk2NH0.MXDB0IkA0TOA-L7rrfakvnRcGVniSXIqqHRyTeG3cV0';
      const { data: { session } } = await supabase.auth.getSession();

      // Ensure HTTPS is used for invitation links
      let origin = window.location.origin;

      // Force HTTPS protocol
      if (!origin.startsWith('https://') && !origin.startsWith('http://')) {
        origin = 'https://' + origin;
      } else if (origin.startsWith('http://')) {
        origin = origin.replace('http://', 'https://');
      }

      const inviteUrl = `${origin}/register?token=${token}`;

      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          role,
          inviteUrl,
          invitedBy: user.email,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}));
        console.error('Email send failed:', emailResponse.status, errorData);

        if (errorData.requiresGmailSetup) {
          toast.error('Gmail not connected', {
            description: 'Please connect your Gmail account in Settings to send invitation emails.',
            duration: 6000,
          });

          await supabase
            .from('user_invitations')
            .update({ status: 'cancelled' })
            .eq('email', email.toLowerCase())
            .eq('token', token);

          return;
        }

        const errorMessage = errorData.error || 'Unknown error';
        console.error('Edge function error:', errorMessage);

        toast.error('Failed to send invitation email', {
          description: errorMessage,
          duration: 8000,
        });

        await supabase
          .from('user_invitations')
          .update({ status: 'cancelled' })
          .eq('email', email.toLowerCase())
          .eq('token', token);

        return;
      } else {
        toast.success('Invitation sent successfully');
      }
      setEmail('');
      setRole('basic');
      onOpenChange(false);
      if (onInviteSent) onInviteSent();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    const { data, error } = await supabase.rpc('generate_invitation_token');
    if (error) throw error;
    return data;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new user to the system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="elite">Elite User</SelectItem>
                <SelectItem value="tariff_master">Tariff Master</SelectItem>
                <SelectItem value="basic">Basic User</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === 'admin' && 'Full system access including user management and all features'}
              {role === 'elite' && 'Advanced access to all business features except deep system administration'}
              {role === 'tariff_master' && 'Specialized role with complete control over tariff management'}
              {role === 'basic' && 'Standard CRM access with ability to create and edit records'}
              {role === 'viewer' && 'Read-only access to all system information'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
