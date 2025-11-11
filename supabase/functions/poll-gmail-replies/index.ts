import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: gmailTokens } = await supabaseClient
      .from('user_gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('polling_enabled', true)
      .maybeSingle();

    if (!gmailTokens) {
      return new Response(
        JSON.stringify({ message: 'Gmail not connected or polling disabled' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let accessToken = gmailTokens.access_token;

    if (new Date(gmailTokens.token_expiry) < new Date()) {
      accessToken = await refreshAccessToken(
        supabaseClient,
        gmailTokens.id,
        gmailTokens.refresh_token
      );
    }

    let historyResponse;
    let useFullSync = false;

    if (gmailTokens.last_history_id) {
      historyResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/history?startHistoryId=${gmailTokens.last_history_id}&historyTypes=messageAdded`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (historyResponse.status === 404) {
        console.log('History ID expired, falling back to full sync');
        useFullSync = true;
      } else if (!historyResponse.ok) {
        throw new Error('Failed to fetch Gmail history');
      }
    } else {
      useFullSync = true;
    }

    let newMessagesCount = 0;

    if (useFullSync) {
      const profileResponse = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch Gmail profile');
      }

      const profileData = await profileResponse.json();

      const messagesResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=in:inbox -from:me newer_than:7d`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!messagesResponse.ok) {
        throw new Error('Failed to fetch messages');
      }

      const messagesData = await messagesResponse.json();

      if (messagesData.messages) {
        for (const message of messagesData.messages) {
          const processed = await processMessage(
            supabaseClient,
            accessToken,
            message.id,
            gmailTokens.email_address
          );
          if (processed) newMessagesCount++;
        }
      }

      await supabaseClient
        .from('user_gmail_tokens')
        .update({
          last_history_id: profileData.historyId,
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', gmailTokens.id);
    } else {
      const historyData = await historyResponse.json();

      if (historyData.history) {
        for (const historyItem of historyData.history) {
          if (historyItem.messagesAdded) {
            for (const messageAdded of historyItem.messagesAdded) {
              const processed = await processMessage(
                supabaseClient,
                accessToken,
                messageAdded.message.id,
                gmailTokens.email_address
              );
              if (processed) newMessagesCount++;
            }
          }
        }
      }

      await supabaseClient
        .from('user_gmail_tokens')
        .update({
          last_history_id: historyData.historyId,
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', gmailTokens.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        newMessages: newMessagesCount,
        lastChecked: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error polling Gmail:', error);
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

async function refreshAccessToken(
  supabaseClient: any,
  tokenId: string,
  refreshToken: string
): Promise<string> {
  const { data: credentials } = await supabaseClient
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'gmail_oauth_credentials')
    .maybeSingle();

  if (!credentials?.setting_value) {
    throw new Error('OAuth credentials not configured');
  }

  const { client_id, client_secret } = credentials.setting_value;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id,
      client_secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();

  await supabaseClient
    .from('user_gmail_tokens')
    .update({
      access_token: data.access_token,
      token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenId);

  return data.access_token;
}

async function processMessage(
  supabaseClient: any,
  accessToken: string,
  messageId: string,
  userEmail: string
): Promise<boolean> {
  try {
    const { data: existing } = await supabaseClient
      .from('email_activities')
      .select('id')
      .eq('message_id', messageId)
      .maybeSingle();

    if (existing) {
      return false;
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

    if (parsed.fromEmail.toLowerCase() === userEmail.toLowerCase()) {
      console.log('Skipping email from self:', messageId);
      return false;
    }

    const { data: matchedEntities } = await supabaseClient.rpc(
      'match_inbound_email_to_entities',
      {
        p_subject: parsed.subject,
        p_from_email: parsed.fromEmail,
        p_to_emails: parsed.to,
        p_thread_id: parsed.threadId,
        p_in_reply_to: parsed.inReplyTo
      }
    );

    let cspEventId = matchedEntities?.[0]?.csp_event_id;
    let customerId = matchedEntities?.[0]?.customer_id;
    let carrierId = matchedEntities?.[0]?.carrier_id;
    let matchedThreadId = matchedEntities?.[0]?.matched_thread_id || parsed.threadId;
    let foToken = matchedEntities?.[0]?.fo_token;

    if (!cspEventId && !customerId && !carrierId) {
      console.log('No matching entities found for:', parsed.subject);
      return false;
    }

    const trackingCode = parsed.trackingCode || `INBOUND-${Date.now().toString(36).toUpperCase()}`;

    let ownerId = null;
    if (matchedThreadId) {
      const { data: threadOwner } = await supabaseClient
        .from('email_activities')
        .select('owner_id')
        .eq('thread_id', matchedThreadId)
        .eq('is_thread_starter', true)
        .maybeSingle();

      ownerId = threadOwner?.owner_id;
    }

    await supabaseClient.from('email_activities').insert({
      tracking_code: trackingCode,
      csp_event_id: cspEventId,
      customer_id: customerId,
      carrier_id: carrierId,
      thread_id: matchedThreadId,
      message_id: parsed.messageId,
      in_reply_to_message_id: parsed.inReplyTo,
      subject: parsed.subject,
      from_email: parsed.fromEmail,
      from_name: parsed.fromName,
      to_emails: parsed.to,
      cc_emails: parsed.cc,
      body_text: parsed.body,
      direction: 'inbound',
      sent_at: parsed.date,
      freightops_thread_token: foToken,
      owner_id: ownerId,
      is_thread_starter: false,
      visible_to_team: true,
    });

    return true;
  } catch (error) {
    console.error('Error processing message:', messageId, error);
    return false;
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

  let trackingCode = getHeader('X-CSP-Tracking-Code');
  const foToken = getHeader('X-FreightOps-Token');

  const inReplyTo = getHeader('In-Reply-To');
  const references = getHeader('References');

  const foTokenMatch = subject.match(/\[?(FO-[A-Z0-9\-]+)\]?/i);
  const extractedFoToken = foTokenMatch ? foTokenMatch[1] : null;

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
    foToken: extractedFoToken || foToken,
    inReplyTo,
  };
}
