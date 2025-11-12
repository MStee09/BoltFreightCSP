import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Plus, Edit, Trash2, Shield, User, CheckCircle, XCircle, Star, FileText, Eye, Mail, Clock, X, Link2, UserCog } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { InviteUserDialog } from './InviteUserDialog';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Textarea } from '@/components/ui/textarea';

export function UserManagement() {
  const { startImpersonation } = useImpersonation();
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isImpersonateDialogOpen, setIsImpersonateDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToImpersonate, setUserToImpersonate] = useState(null);
  const [impersonationReason, setImpersonationReason] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchInvitations();
    getCurrentUser();

    const profilesChannel = supabase
      .channel('user-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    const invitationsChannel = supabase
      .channel('user-invitations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_invitations',
        },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(invitationsChannel);
    };
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;

      if (!invitationsData || invitationsData.length === 0) {
        setInvitations([]);
        return;
      }

      const inviterIds = [...new Set(invitationsData.map(inv => inv.invited_by).filter(Boolean))];

      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', inviterIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      const enrichedInvitations = invitationsData.map(inv => ({
        ...inv,
        invited_by_profile: profilesMap[inv.invited_by] || null
      }));

      setInvitations(enrichedInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      // Debug: Check current JWT
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current JWT app_metadata:', session?.user?.app_metadata);
      console.log('Current JWT user_metadata:', session?.user?.user_metadata);

      const { data, error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)
        .select();

      if (error) {
        console.error('Error cancelling invitation:', error);
        toast.error(`Failed to cancel invitation: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        toast.error('Failed to cancel invitation: No rows updated. Check permissions.');
        return;
      }

      toast.success('Invitation cancelled');
      fetchInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const handleCopyInviteLink = (invitation) => {
    let origin = window.location.origin;

    // Force HTTPS protocol
    if (!origin.startsWith('https://') && !origin.startsWith('http://')) {
      origin = 'https://' + origin;
    } else if (origin.startsWith('http://')) {
      origin = origin.replace('http://', 'https://');
    }

    const inviteUrl = `${origin}/register?token=${invitation.token}`;

    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast.success('Invitation link copied to clipboard');
    }).catch((err) => {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link');
    });
  };

  const handleResendInvitation = async (invitation) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://siujmppdeumvwwvyqcsq.supabase.co';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdWptcHBkZXVtdnd3dnlxY3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTg5NjQsImV4cCI6MjA3NjYzNDk2NH0.MXDB0IkA0TOA-L7rrfakvnRcGVniSXIqqHRyTeG3cV0';

      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      // Get current user's profile for invitedBy name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const inviterName = profile?.full_name || profile?.email || 'A team member';

      // Ensure HTTPS is used for invitation links
      let origin = window.location.origin;

      // Force HTTPS protocol
      if (!origin.startsWith('https://') && !origin.startsWith('http://')) {
        origin = 'https://' + origin;
      } else if (origin.startsWith('http://')) {
        origin = origin.replace('http://', 'https://');
      }

      const inviteUrl = `${origin}/register?token=${invitation.token}`;

      const functionUrl = `${supabaseUrl}/functions/v1/send-invitation`;
      console.log('Calling edge function:', functionUrl);

      const emailResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          email: invitation.email,
          role: invitation.role,
          inviteUrl,
          invitedBy: inviterName,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}));
        console.error('Email send error response:', {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          data: errorData
        });

        // Check if Gmail setup is required
        if (errorData.requiresGmailSetup) {
          throw new Error('Gmail not connected. Please connect Gmail in Settings → Integrations');
        }

        throw new Error(errorData.error || `Failed to send email (${emailResponse.status})`);
      }

      const result = await emailResponse.json();
      console.log('Invitation resent successfully:', result);

      // Update the sent_at timestamp in the database
      await supabase
        .from('user_invitations')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', invitation.id);

      // Refresh the invitations list
      await fetchInvitations();

      toast.success('Invitation email resent successfully');
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error(`Failed to resend invitation: ${error.message}`);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editingUser.full_name,
          role: editingUser.role,
          is_active: editingUser.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userToDelete.id);

      if (error) throw error;

      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user. Note: User deletion requires service role access.');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_active: !user.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleImpersonate = async () => {
    if (!userToImpersonate) return;

    const result = await startImpersonation(userToImpersonate.id, impersonationReason);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Now viewing as ${userToImpersonate.full_name || userToImpersonate.email}`);
      setIsImpersonateDialogOpen(false);
      setUserToImpersonate(null);
      setImpersonationReason('');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Users className="h-6 w-6 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {invitations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Pending Invitations
                </CardTitle>
                <CardDescription>
                  Users who have been invited but haven't registered yet
                </CardDescription>
              </div>
              <Badge variant="secondary">{invitations.length} Pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const isExpired = new Date(invitation.expires_at) < new Date();
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{invitation.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {invitation.role === 'admin' && <Shield className="h-3 w-3" />}
                            {invitation.role === 'elite' && <Star className="h-3 w-3" />}
                            {invitation.role === 'tariff_master' && <FileText className="h-3 w-3" />}
                            {invitation.role === 'basic' && <User className="h-3 w-3" />}
                            {invitation.role === 'viewer' && <Eye className="h-3 w-3" />}
                            {invitation.role === 'admin' && 'Administrator'}
                            {invitation.role === 'elite' && 'Elite User'}
                            {invitation.role === 'tariff_master' && 'Tariff Master'}
                            {invitation.role === 'basic' && 'Basic User'}
                            {invitation.role === 'viewer' && 'Viewer'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {invitation.invited_by_profile?.full_name || invitation.invited_by_profile?.email || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className={`text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              {isExpired ? 'Expired' : format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyInviteLink(invitation)}
                              title="Copy invitation link"
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvitation(invitation)}
                              title="Resend invitation email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvitation(invitation.id)}
                              title="Cancel invitation"
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{users.length} Users</Badge>
              <Button
                onClick={() => setIsInviteDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Invite User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.full_name || user.email}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="gap-1"
                      >
                        {user.role === 'admin' && <Shield className="h-3 w-3" />}
                        {user.role === 'elite' && <Star className="h-3 w-3" />}
                        {user.role === 'tariff_master' && <FileText className="h-3 w-3" />}
                        {user.role === 'basic' && <User className="h-3 w-3" />}
                        {user.role === 'viewer' && <Eye className="h-3 w-3" />}
                        {user.role === 'admin' && 'Administrator'}
                        {user.role === 'elite' && 'Elite User'}
                        {user.role === 'tariff_master' && 'Tariff Master'}
                        {user.role === 'basic' && 'Basic User'}
                        {user.role === 'viewer' && 'Viewer'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.is_active ? 'default' : 'secondary'}
                        className="gap-1"
                      >
                        {user.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUserToImpersonate(user);
                            setIsImpersonateDialogOpen(true);
                          }}
                          disabled={user.id === currentUserId}
                          title="Impersonate user"
                        >
                          <UserCog className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user)}
                          disabled={user.id === currentUserId}
                        >
                          {user.is_active ? (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(user);
                            setIsDeleteDialogOpen(true);
                          }}
                          disabled={user.id === currentUserId}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={editingUser.full_name || ''}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={editingUser.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, role: value })
                  }
                  disabled={editingUser.id === currentUserId}
                >
                  <SelectTrigger>
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
                {editingUser.id === currentUserId && (
                  <p className="text-xs text-muted-foreground">
                    You cannot change your own role
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for{' '}
              <strong>{userToDelete?.email}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InviteUserDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onInviteSent={fetchUsers}
      />

      <Dialog open={isImpersonateDialogOpen} onOpenChange={setIsImpersonateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-600" />
              Impersonate User
            </DialogTitle>
            <DialogDescription>
              You will temporarily view the application as{' '}
              <strong>{userToImpersonate?.full_name || userToImpersonate?.email}</strong>.
              This helps troubleshoot issues they might be experiencing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Impersonation</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Troubleshooting Gmail connection issue"
                value={impersonationReason}
                onChange={(e) => setImpersonationReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This will be logged for security audit purposes.
              </p>
            </div>
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
              <div className="flex gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">What happens during impersonation:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>You'll see the app exactly as they see it</li>
                    <li>All actions will appear as if they performed them</li>
                    <li>This session is fully audited</li>
                    <li>Click "Exit Impersonation" in the banner to return</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImpersonateDialogOpen(false);
                setUserToImpersonate(null);
                setImpersonationReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImpersonate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserCog className="h-4 w-4 mr-2" />
              Start Impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
