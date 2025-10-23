import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SendEmailRequest {
  trackingCode: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  cspEventId?: string;
  customerId?: string;
  carrierId?: string;
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

    const { data: credentials, error: credError } = await supabaseClient
      .from('user_gmail_credentials')
      .select('email_address, app_password')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credError || !credentials) {
      throw new Error('Gmail not connected. Please connect in Settings.');
    }

    const requestData: SendEmailRequest = await req.json();
    const {
      trackingCode,
      to,
      cc,
      subject,
      body,
      cspEventId,
      customerId,
      carrierId,
    } = requestData;

    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 587,
        tls: true,
        auth: {
          username: credentials.email_address,
          password: credentials.app_password,
        },
      },
    });

    const ccEmails = cc && cc.length > 0 ? cc : undefined;

    await client.send({
      from: credentials.email_address,
      to: to.join(', '),
      cc: ccEmails ? ccEmails.join(', ') : undefined,
      subject: subject,
      content: 'auto',
      mimeContent: [
        {
          contentType: 'text/plain; charset=utf-8',
          content: body,
        },
      ],
      headers: {
        'X-CSP-Tracking-Code': trackingCode,
      },
    });

    await client.close();

    const { error: dbError } = await supabaseClient
      .from('email_activities')
      .insert({
        tracking_code: trackingCode,
        csp_event_id: cspEventId || null,
        customer_id: customerId || null,
        carrier_id: carrierId || null,
        subject,
        from_email: credentials.email_address,
        from_name: user.user_metadata?.full_name || credentials.email_address,
        to_emails: to,
        cc_emails: cc || [],
        body_text: body,
        direction: 'outbound',
        sent_at: new Date().toISOString(),
        created_by: user.id,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save email activity');
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
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
