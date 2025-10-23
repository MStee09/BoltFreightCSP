import { createClient } from 'jsr:@supabase/supabase-js@2';

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

async function sendEmailViaSMTP(
  from: string,
  username: string,
  password: string,
  to: string[],
  cc: string[],
  subject: string,
  body: string,
  trackingCode: string
): Promise<void> {
  const conn = await Deno.connect({
    hostname: 'smtp.gmail.com',
    port: 587,
  });

  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let buffer = new Uint8Array(4096);

    const readResponse = async () => {
      const n = await conn.read(buffer);
      if (!n) throw new Error('Connection closed');
      return decoder.decode(buffer.subarray(0, n));
    };

    const sendCommand = async (cmd: string) => {
      await conn.write(encoder.encode(cmd + '\r\n'));
    };

    await readResponse();

    await sendCommand('EHLO localhost');
    await readResponse();

    await sendCommand('STARTTLS');
    await readResponse();

    const tlsConn = await Deno.startTls(conn, { hostname: 'smtp.gmail.com' });

    const tlsEncoder = new TextEncoder();
    const tlsDecoder = new TextDecoder();
    let tlsBuffer = new Uint8Array(4096);

    const tlsRead = async () => {
      const n = await tlsConn.read(tlsBuffer);
      if (!n) throw new Error('TLS connection closed');
      return tlsDecoder.decode(tlsBuffer.subarray(0, n));
    };

    const tlsSend = async (cmd: string) => {
      await tlsConn.write(tlsEncoder.encode(cmd + '\r\n'));
    };

    await tlsSend('EHLO localhost');
    await tlsRead();

    await tlsSend('AUTH LOGIN');
    await tlsRead();

    await tlsSend(btoa(username));
    await tlsRead();

    await tlsSend(btoa(password));
    const authResponse = await tlsRead();

    if (!authResponse.includes('235')) {
      throw new Error('Authentication failed');
    }

    await tlsSend(`MAIL FROM:<${from}>`);
    await tlsRead();

    for (const recipient of [...to, ...cc]) {
      await tlsSend(`RCPT TO:<${recipient}>`);
      await tlsRead();
    }

    await tlsSend('DATA');
    await tlsRead();

    const toLine = to.join(', ');
    const ccLine = cc.length > 0 ? cc.join(', ') : '';

    const emailContent = [
      `From: ${from}`,
      `To: ${toLine}`,
      ccLine ? `Cc: ${ccLine}` : '',
      `Subject: ${subject}`,
      `X-CSP-Tracking-Code: ${trackingCode}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
      '.',
    ].filter(line => line !== '').join('\r\n');

    await tlsSend(emailContent);
    await tlsRead();

    await tlsSend('QUIT');
    await tlsRead();

    tlsConn.close();
  } catch (error) {
    conn.close();
    throw error;
  }
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
      .single();

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

    await sendEmailViaSMTP(
      credentials.email_address,
      credentials.email_address,
      credentials.app_password,
      to,
      cc || [],
      subject,
      body,
      trackingCode
    );

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
