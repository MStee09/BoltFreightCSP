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

    const { data: gmailTokens, error: tokenError } = await supabaseClient
      .from('user_gmail_tokens')
      .select('access_token, refresh_token, token_expiry')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !gmailTokens) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Gmail not connected. Please connect your Gmail account in Settings → Integrations to send invitations.',
          requiresGmailSetup: true
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let accessToken = gmailTokens.access_token;
    const tokenExpiry = new Date(gmailTokens.token_expiry);
    const now = new Date();

    if (tokenExpiry <= now) {
      console.log('Access token expired, refreshing...');

      const { data: oauthCreds } = await supabaseClient
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'gmail_oauth_credentials')
        .maybeSingle();

      if (!oauthCreds?.setting_value) {
        throw new Error('OAuth credentials not configured');
      }

      const credentials = oauthCreds.setting_value;
      const clientId = credentials.client_id ?? '';
      const clientSecret = credentials.client_secret ?? '';

      if (!clientId || !clientSecret) {
        throw new Error('Invalid OAuth credentials. Please reconfigure in Settings.');
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: gmailTokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Token refresh failed:', errorData);
        throw new Error('Failed to refresh access token. Please reconnect your Gmail account.');
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      const newExpiry = new Date(Date.now() + tokenData.expires_in * 1000);

      await supabaseClient
        .from('user_gmail_tokens')
        .update({
          access_token: tokenData.access_token,
          token_expiry: newExpiry.toISOString(),
        })
        .eq('user_id', user.id);

      console.log('Token refreshed successfully');
    }

    const { data: userProfileEmail } = await supabaseClient
      .from('user_profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const fromEmail = userProfileEmail?.email || user.email;

    const roleLabel = {
      'admin': 'Administrator',
      'elite': 'Elite User',
      'basic': 'Basic User'
    }[role] || 'User';

    const emailSubject = 'Invitation to Join FreightOps CRM';
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .content p {
      margin: 0 0 15px;
    }
    .role-badge {
      display: inline-block;
      background-color: #dbeafe;
      color: #1e40af;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
      margin: 10px 0;
    }
    .invite-button {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    .invite-button:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%);
    }
    .info-box {
      background-color: #f0f9ff;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚚 FreightOps CRM Invitation</h1>
    </div>

    <div class="content">
      <p>Hello,</p>

      <p><strong>${invitedBy}</strong> has invited you to join the FreightOps CRM system.</p>

      <div class="info-box">
        <p style="margin: 0;"><strong>Your Role:</strong></p>
        <div class="role-badge">${roleLabel}</div>
      </div>

      <p>FreightOps is a comprehensive transportation management system for managing customers, carriers, tariffs, and CSP (Continuous Service Provider) negotiations.</p>

      <div class="button-container">
        <a href="${inviteUrl}" class="invite-button">Accept Invitation & Create Account</a>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>⏰ Important:</strong> This invitation will expire in 7 days.</p>
      </div>

      <p>If the button above doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${inviteUrl}</p>

      <p style="margin-top: 30px;">If you did not expect this invitation, you can safely ignore this email.</p>
    </div>

    <div class="footer">
      <p>This is an automated message from FreightOps CRM</p>
      <p>&copy; ${new Date().getFullYear()} FreightOps. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const gmailApiUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

    const emailContent = [
      `To: ${email}`,
      `From: ${fromEmail}`,
      `Subject: ${emailSubject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      emailBody
    ].join('\r\n');

    const encodedMessage = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(gmailApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gmail API error:', errorText);

      if (response.status === 401) {
        throw new Error('Gmail authentication failed. Please reconnect your Gmail account in Settings.');
      }

      throw new Error(`Failed to send email: ${errorText}`);
    }

    const info = await response.json();

    console.log('Invitation email sent to:', email);
    console.log('Message ID:', info.id);
    console.log('Role:', roleLabel);
    console.log('Invited by:', invitedBy);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully',
        details: {
          to: email,
          role: roleLabel,
          messageId: info.id,
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