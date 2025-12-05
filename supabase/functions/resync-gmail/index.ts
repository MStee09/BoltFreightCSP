import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🔄 === RESYNC GMAIL FUNCTION STARTED ===');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    console.log('✅ User authenticated:', user.id);

    const body = await req.json().catch(() => ({}));
    const { daysBack = 14 } = body;

    const { data: gmailTokens, error: tokensError } = await supabaseServiceClient
      .from('user_gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokensError || !gmailTokens) throw new Error('Gmail not connected');

    console.log('✅ Gmail tokens found');

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      throw new Error('OAuth credentials not configured');
    }

    let accessToken = gmailTokens.access_token;

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: gmailTokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token;
        console.log('✅ Token refreshed');
      }
    } catch (error) {
      console.warn('⚠️ Token refresh error, using existing token');
    }

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

    console.log(`🔍 Searching for emails from last ${daysBack} days`);

    const query = `after:${afterTimestamp}`;
    const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`;

    const searchResponse = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!searchResponse.ok) throw new Error('Failed to search Gmail messages');

    const searchData = await searchResponse.json();
    console.log(`📧 Found ${searchData.messages?.length || 0} messages`);

    let newEmailsCount = 0;
    let skippedCount = 0;

    if (searchData.messages) {
      for (const message of searchData.messages) {
        try {
          const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`;
          const messageResponse = await fetch(messageUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });

          if (!messageResponse.ok) continue;

          const messageData = await messageResponse.json();
          const headers = messageData.payload.headers;
          const getHeader = (name: string) =>
            headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          const messageIdHeader = getHeader('Message-ID');
          if (!messageIdHeader) continue;

          const { data: existing } = await supabaseClient
            .from('email_activities')
            .select('id')
            .eq('message_id', messageIdHeader)
            .maybeSingle();

          if (existing) {
            skippedCount++;
            continue;
          }

          const subject = getHeader('Subject');
          const fromHeader = getHeader('From');
          const toHeader = getHeader('To');
          const ccHeader = getHeader('Cc');
          const dateHeader = getHeader('Date');
          const inReplyToHeader = getHeader('In-Reply-To');

          const fromEmail = fromHeader.match(/<(.+?)>/)?.[1] || fromHeader;
          const fromName = fromHeader.replace(/<.+?>/, '').trim().replace(/^"|\"$/g, '');

          const toEmails = toHeader ? toHeader.split(',').map((e: string) => {
            const match = e.match(/<(.+?)>/);
            return match ? match[1] : e.trim();
          }) : [];

          const ccEmails = ccHeader ? ccHeader.split(',').map((e: string) => {
            const match = e.match(/<(.+?)>/);
            return match ? match[1] : e.trim();
          }) : [];

          const getBodyFromPart = (part: any): string => {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
            if (part.mimeType === 'text/html' && part.body?.data) {
              return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
            if (part.parts) {
              for (const subPart of part.parts) {
                const text = getBodyFromPart(subPart);
                if (text) return text;
              }
            }
            return '';
          };

          const bodyText = getBodyFromPart(messageData.payload);
          const isOutbound = fromEmail.toLowerCase() === gmailTokens.email_address.toLowerCase();

          console.log(`📧 Processing ${isOutbound ? 'OUTBOUND' : 'INBOUND'}: ${subject}`);

          let cspEventId = null;
          let customerId = null;
          let carrierId = null;

          const { data: customers } = await supabaseClient
            .from('customers')
            .select('id, name');

          if (customers) {
            for (const customer of customers) {
              const customerWords = customer.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
              const subjectLower = subject.toLowerCase();
              const hasMatch = customerWords.some((word: string) => subjectLower.includes(word));

              if (hasMatch) {
                console.log(`✅ Found customer match: ${customer.name}`);
                customerId = customer.id;

                const { data: activeCsp } = await supabaseClient
                  .from('csp_events')
                  .select('id')
                  .eq('customer_id', customer.id)
                  .in('stage', ['carrier_invites_sent', 'bids_due_soon', 'bids_received', 'selection', 'awarded'])
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (activeCsp) {
                  console.log(`✅ Found active CSP event: ${activeCsp.id}`);
                  cspEventId = activeCsp.id;
                }
                break;
              }
            }
          }

          if (!carrierId && !isOutbound) {
            const { data: carrier } = await supabaseClient
              .from('carriers')
              .select('id')
              .or(`primary_contact_email.eq.${fromEmail},contacts.cs.{${fromEmail}}`)
              .maybeSingle();

            if (carrier) {
              console.log(`✅ Matched carrier by email: ${carrier.id}`);
              carrierId = carrier.id;
            }
          }

          const trackingCode = `${isOutbound ? 'OUTBOUND' : 'INBOUND'}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

          const insertData: any = {
            tracking_code: trackingCode,
            csp_event_id: cspEventId,
            customer_id: customerId,
            carrier_id: carrierId,
            thread_id: messageData.threadId,
            gmail_thread_id: messageData.threadId,
            message_id: messageIdHeader,
            in_reply_to_message_id: inReplyToHeader,
            subject: subject,
            from_email: fromEmail,
            from_name: fromName,
            to_emails: toEmails,
            cc_emails: ccEmails,
            body_text: bodyText.substring(0, 10000),
            direction: isOutbound ? 'outbound' : 'inbound',
            sent_at: new Date(dateHeader).toISOString(),
            is_thread_starter: !inReplyToHeader,
            visible_to_team: true,
          };

          if (isOutbound) {
            insertData.created_by = user.id;
          }

          const { error: insertError } = await supabaseClient
            .from('email_activities')
            .insert(insertData);

          if (insertError) {
            console.error('❌ Error inserting email:', insertError);
            continue;
          }

          console.log(`✅ Saved email: ${subject.substring(0, 50)}`);
          newEmailsCount++;

        } catch (error) {
          console.error('Error processing message:', error);
        }
      }
    }

    console.log('🎉 Re-sync complete!');
    console.log(`✅ New emails saved: ${newEmailsCount}`);
    console.log(`⏭️ Already existed: ${skippedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalMessages: searchData.messages?.length || 0,
        newEmails: newEmailsCount,
        alreadyExisted: skippedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
