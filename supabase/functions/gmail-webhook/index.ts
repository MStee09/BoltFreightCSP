import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GmailNotification {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body: { data?: string } }>;
  };
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const notification: GmailNotification = await req.json();
    const decodedData = JSON.parse(
      atob(notification.message.data)
    );

    const { emailAddress, historyId } = decodedData;

    const { data: subscription } = await supabaseClient
      .from('gmail_watch_subscriptions')
      .select('*')
      .eq('email_address', emailAddress)
      .eq('is_active', true)
      .single();

    if (!subscription) {
      console.log('No active subscription found for:', emailAddress);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userTokens } = await supabaseClient
      .from('user_gmail_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', subscription.user_id)
      .single();

    if (!userTokens) {
      console.error('No Gmail tokens found for user');
      return new Response(JSON.stringify({ error: 'No tokens' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const historyResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/history?startHistoryId=${subscription.history_id}`,
      {
        headers: {
          'Authorization': `Bearer ${userTokens.access_token}`,
        },
      }
    );

    if (!historyResponse.ok) {
      throw new Error('Failed to fetch Gmail history');
    }

    const historyData = await historyResponse.json();

    if (historyData.history) {
      for (const historyItem of historyData.history) {
        if (historyItem.messagesAdded) {
          for (const messageAdded of historyItem.messagesAdded) {
            await processMessage(
              supabaseClient,
              userTokens.access_token,
              messageAdded.message.id
            );
          }
        }
      }
    }

    await supabaseClient
      .from('gmail_watch_subscriptions')
      .update({ history_id: historyId, updated_at: new Date().toISOString() })
      .eq('id', subscription.id);

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
    console.error('Error processing webhook:', error);
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

async function processMessage(
  supabaseClient: any,
  accessToken: string,
  messageId: string
) {
  try {
    const { data: existing } = await supabaseClient
      .from('email_activities')
      .select('id')
      .eq('message_id', messageId)
      .single();

    if (existing) {
      console.log('Message already processed:', messageId);
      return;
    }

    const messageResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!messageResponse.ok) {
      throw new Error('Failed to fetch message');
    }

    const message: GmailMessage = await messageResponse.json();
    const parsed = parseMessage(message);

    if (!parsed.trackingCode) {
      console.log('No tracking code found in message:', messageId);
      return;
    }

    const { data: existingActivity } = await supabaseClient
      .from('email_activities')
      .select('customer_id, carrier_id, csp_event_id')
      .eq('tracking_code', parsed.trackingCode)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!existingActivity) {
      console.log('No existing activity found for tracking code:', parsed.trackingCode);
      return;
    }

    await supabaseClient.from('email_activities').insert({
      tracking_code: parsed.trackingCode,
      csp_event_id: existingActivity.csp_event_id,
      customer_id: existingActivity.customer_id,
      carrier_id: existingActivity.carrier_id,
      thread_id: parsed.threadId,
      message_id: parsed.messageId,
      subject: parsed.subject,
      from_email: parsed.fromEmail,
      from_name: parsed.fromName,
      to_emails: parsed.to,
      cc_emails: parsed.cc,
      body_text: parsed.body,
      direction: 'inbound',
      sent_at: parsed.date,
    });

    console.log('Processed inbound email:', messageId);
  } catch (error) {
    console.error('Error processing message:', messageId, error);
  }
}

function parseMessage(message: GmailMessage) {
  const headers = message.payload.headers;
  const getHeader = (name: string) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  const subject = getHeader('Subject');
  const from = getHeader('From');
  const to = getHeader('To');
  const cc = getHeader('Cc');
  const date = getHeader('Date');

  // Look for tracking code in custom header first, then fall back to subject line
  let trackingCode = getHeader('X-CSP-Tracking-Code');

  // Also check In-Reply-To and References headers for thread tracking
  const inReplyTo = getHeader('In-Reply-To');
  const references = getHeader('References');

  // If no custom header, try to extract from subject line (legacy support)
  if (!trackingCode) {
    const trackingCodeMatch = subject.match(/\[?(CSP-[A-Z0-9-]+)\]?/i);
    trackingCode = trackingCodeMatch ? trackingCodeMatch[1] : null;
  }

  const fromMatch = from.match(/<(.+?)>/);
  const fromEmail = fromMatch ? fromMatch[1] : from.trim();
  const fromName = from.replace(/<.+?>/, '').trim();

  let body = '';
  if (message.payload.body?.data) {
    body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  } else if (message.payload.parts) {
    const textPart = message.payload.parts.find(
      part => part.mimeType === 'text/plain'
    );
    if (textPart?.body.data) {
      body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
  }

  return {
    messageId: message.id,
    threadId: message.threadId,
    subject,
    fromEmail,
    fromName,
    to: to.split(',').map(e => e.trim()).filter(Boolean),
    cc: cc.split(',').map(e => e.trim()).filter(Boolean),
    body,
    date: new Date(date).toISOString(),
    trackingCode,
  };
}
