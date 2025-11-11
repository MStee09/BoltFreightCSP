import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IncomingEmail {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
  date: string;
}

function extractTrackingCode(subject: string): string | null {
  const match = subject.match(/\[(FO-[A-Z0-9]{8})\]/);
  return match ? match[1] : null;
}

function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<(.+?)>/);
  return match ? match[1] : emailString.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      ? (await import('jsr:@supabase/supabase-js@2')).createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
      : null;

    if (!supabaseClient) {
      throw new Error('Supabase client not configured');
    }

    const emailData: IncomingEmail = await req.json();
    const {
      from,
      to,
      cc,
      subject,
      body,
      messageId,
      inReplyTo,
      date,
    } = emailData;

    console.log('📧 Received email:', { from, subject, messageId });

    // Extract tracking code from subject
    const trackingCode = extractTrackingCode(subject);

    if (!trackingCode) {
      console.log('⚠️ No tracking code found in subject');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No tracking code found',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('🎯 Found tracking code:', trackingCode);

    // Find the thread token
    const { data: threadToken, error: tokenError } = await supabaseClient
      .from('freightops_thread_tokens')
      .select('*')
      .eq('token', trackingCode)
      .maybeSingle();

    if (tokenError || !threadToken) {
      console.error('❌ Thread token not found:', tokenError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Thread token not found',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('✅ Found thread:', threadToken);

    // Find original email to get the thread_id
    const { data: originalEmail } = await supabaseClient
      .from('email_activities')
      .select('*')
      .eq('tracking_code', trackingCode)
      .eq('is_thread_starter', true)
      .maybeSingle();

    const fromEmail = extractEmailAddress(from);

    // Insert the reply into email_activities
    const { data: insertedEmail, error: insertError } = await supabaseClient
      .from('email_activities')
      .insert({
        tracking_code: trackingCode,
        message_id: messageId,
        thread_id: originalEmail?.thread_id || threadToken.thread_id,
        in_reply_to_message_id: inReplyTo || originalEmail?.message_id,
        csp_event_id: threadToken.csp_event_id,
        customer_id: threadToken.customer_id,
        carrier_id: threadToken.carrier_id,
        subject: subject,
        from_email: fromEmail,
        from_name: from.replace(/<.*>/, '').trim() || fromEmail,
        to_emails: to.map(extractEmailAddress),
        cc_emails: cc ? cc.map(extractEmailAddress) : [],
        body_text: body,
        direction: 'inbound',
        sent_at: date || new Date().toISOString(),
        is_thread_starter: false,
        freightops_thread_token: trackingCode,
        metadata: {
          freightops_thread_token: trackingCode,
          auto_captured: true,
          received_via_bcc: true,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to insert email:', insertError);
      throw new Error('Failed to save email activity');
    }

    console.log('✅ Email saved successfully');

    // Auto-close any follow-up tasks for this thread
    if (threadToken.thread_id) {
      const { error: closeError } = await supabaseClient
        .from('email_follow_up_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: `Auto-closed: Reply received from ${fromEmail}`,
        })
        .eq('thread_id', threadToken.thread_id)
        .eq('auto_close_on_reply', true)
        .eq('status', 'pending');

      if (closeError) {
        console.error('⚠️ Failed to close follow-up tasks:', closeError);
      } else {
        console.log('✅ Auto-closed follow-up tasks');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email received and processed',
        emailId: insertedEmail.id,
        trackingCode: trackingCode,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ Error processing email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process email',
      }),
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
