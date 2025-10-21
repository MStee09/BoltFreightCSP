import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InvitationRequest {
  email: string;
  role: string;
  inviteUrl: string;
  invitedBy: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Only administrators can send invitations');
    }

    const requestData: InvitationRequest = await req.json();
    const { email, role, inviteUrl, invitedBy } = requestData;

    const emailSubject = 'Invitation to Join FreightOps CRM';
    const emailBody = `
Hello,

${invitedBy} has invited you to join the FreightOps CRM system as a ${role === 'admin' ? 'Administrator' : 'User'}.

To accept this invitation and create your account, please click the link below:

${inviteUrl}

This invitation will expire in 7 days.

If you did not expect this invitation, you can safely ignore this email.

Best regards,
The FreightOps Team
    `;

    console.log('Invitation email prepared for:', email);
    console.log('Invite URL:', inviteUrl);
    console.log('Role:', role);
    console.log('Invited by:', invitedBy);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation email sent (simulated)',
        details: {
          to: email,
          subject: emailSubject,
          inviteUrl
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
