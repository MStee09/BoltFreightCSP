import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Briefcase, Building2, FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { getUserGmailEmail } from '@/utils/gmailHelpers';

export function UserProfile() {
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    title: '',
    company: 'Rocketshipping'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [hasGmailConnected, setHasGmailConnected] = useState(false);
  const queryClient = useQueryClient();

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const input = e.target.value;
    const formatted = formatPhoneNumber(input);
    setFormData({ ...formData, phone: formatted });
  };

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user_profile', isImpersonating, impersonatedUser?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const effectiveUserId = isImpersonating ? impersonatedUser.id : user.id;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', effectiveUserId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      // Get Gmail email using helper (checks both OAuth and app password)
      const gmailEmail = await getUserGmailEmail(effectiveUserId);
      if (gmailEmail) {
        setEmail(gmailEmail);
        setHasGmailConnected(true);
      } else if (data?.email) {
        // Fallback to profile email if no Gmail connected
        setEmail(data.email);
        setHasGmailConnected(false);
      } else {
        setEmail('');
        setHasGmailConnected(false);
      }

      return data;
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: formatPhoneNumber(profile.phone || ''),
        title: profile.title || '',
        company: profile.company || 'Rocketshipping'
      });
    }
  }, [profile]);

  const generateSignaturePreview = () => {
    const parts = [];

    if (formData.first_name || formData.last_name) {
      parts.push(`${formData.first_name} ${formData.last_name}`.trim());
    }

    if (formData.title) {
      parts.push(formData.title);
    }

    if (formData.company) {
      parts.push(formData.company);
    }

    if (email) {
      parts.push(email);
    }

    if (formData.phone) {
      parts.push(formData.phone);
    }

    return parts.join('\n');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const effectiveUserId = isImpersonating ? impersonatedUser.id : user.id;

      const signature = generateSignaturePreview();

      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          title: formData.title,
          company: formData.company,
          email_signature: signature,
          updated_at: new Date().toISOString()
        })
        .eq('id', effectiveUserId);

      if (error) throw error;

      toast.success('Profile updated successfully');
      queryClient.invalidateQueries(['user_profile']);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Loading your profile...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          User Profile
        </CardTitle>
        <CardDescription>
          Manage your contact information and email signature for professional communications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            Your profile information will be used in email templates and signatures to provide professional,
            consistent communication with carriers and customers.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              First Name
            </Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="John"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Last Name
            </Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="email"
            value={email || 'No email set'}
            disabled
            className="bg-muted"
          />
          {hasGmailConnected ? (
            <p className="text-xs text-muted-foreground">
              Connected via Gmail integration - can send and receive emails
            </p>
          ) : email ? (
            <p className="text-xs text-amber-600">
              Email on file, but Gmail not connected. Go to Integrations tab to connect Gmail for sending/receiving emails.
            </p>
          ) : (
            <p className="text-xs text-amber-600">
              No email set. Go to Integrations tab to connect Gmail.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Number
          </Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={handlePhoneChange}
            placeholder="(555) 123-4567"
            maxLength={14}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Job Title
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Customer Pricing Manager"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company
            </Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Rocketshipping"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Email Signature Preview
          </Label>
          <div className="border rounded-md p-4 bg-muted/50">
            <pre className="text-sm whitespace-pre-wrap font-sans">
              {generateSignaturePreview() || 'Fill in your profile information to see signature preview'}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">
            This signature will automatically be appended to all emails sent from the Rocketshipping CSP Tool,
            helping recipients distinguish between app emails and your personal Gmail.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
