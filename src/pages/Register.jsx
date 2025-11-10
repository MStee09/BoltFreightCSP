import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Truck, AlertCircle, CheckCircle, Shield, User } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { supabase } from '../api/supabaseClient';

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      validateInvitation(token);
    } else {
      setLoadingInvitation(false);
    }
  }, [searchParams]);

  const validateInvitation = async (token) => {
    try {
      console.log('Validating invitation token:', token);

      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle();

      console.log('Invitation query result:', { data, error });

      if (error) {
        console.error('Database error:', error);
        setError(`Database error: ${error.message}`);
        setLoadingInvitation(false);
        return;
      }

      if (!data) {
        setError('Invalid or expired invitation link');
        setLoadingInvitation(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoadingInvitation(false);
        return;
      }

      setInvitation(data);
      setEmail(data.email);
      setLoadingInvitation(false);
    } catch (err) {
      console.error('Error validating invitation:', err);
      setError(`Failed to validate invitation: ${err.message}`);
      setLoadingInvitation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);

      if (invitation) {
        console.log('Updating invitation status...');
        const { error: inviteError } = await supabase
          .from('user_invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('id', invitation.id);

        if (inviteError) {
          console.error('Error updating invitation:', inviteError);
        }

        console.log('Getting user profile...');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('Updating user role to:', invitation.role);
          const { error: roleError } = await supabase
            .from('user_profiles')
            .update({ role: invitation.role })
            .eq('id', user.id);

          if (roleError) {
            console.error('Error updating user role:', roleError);
          }
        }
      }

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (loadingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-slate-600">Validating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              {invitation ? 'Complete Your Invitation' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {invitation ? `You've been invited as a ${invitation.role}` : 'Get started with FreightCSP today'}
            </CardDescription>
          </div>
          {invitation && (
            <Badge
              variant={invitation.role === 'admin' ? 'default' : 'secondary'}
              className="gap-1 mx-auto"
            >
              {invitation.role === 'admin' ? (
                <Shield className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              {invitation.role === 'admin' ? 'Administrator' : invitation.role === 'elite' ? 'Elite User' : 'Basic User'}
            </Badge>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Account created! Redirecting...</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || success || invitation}
              />
              {invitation && (
                <p className="text-xs text-muted-foreground">
                  Email is pre-filled from your invitation
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || success}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || success}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || success}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <p className="text-sm text-center text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
