import { createClient } from 'jsr:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const { 
      to, 
      cc,
      subject, 
      body, 
      cspEventId, 
      customerId,
      carrierId,
      trackReply = true,
      inReplyTo = null,
      threadId = null,
    } = await req.json();

    if (!to || to.length === 0) {
      throw new Error('Recipient email is required');
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('email, full_name, email_signature')
      .eq('id', user.id)
      .maybeSingle();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const { data: appPasswordCreds, error: credError } = await supabaseClient
      .from('user_gmail_credentials')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credError) {
      console.error('Error fetching Gmail credentials:', credError);
      throw new Error('Failed to fetch Gmail credentials');
    }

    if (!appPasswordCreds) {
      throw new Error('Gmail app password not configured. Please set it up in Settings.');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: appPasswordCreds.email_address,
        pass: appPasswordCreds.app_password,
      },
    });

    const fromEmail = appPasswordCreds.email_address;
    const fromName = userProfile.full_name || fromEmail.split('@')[0];

    let bodyWithSignature = body;
    if (userProfile.email_signature) {
      bodyWithSignature += `\n\n${userProfile.email_signature}`;
    }

    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8);
    let messageId;
    let generatedThreadId;

    if (inReplyTo) {
      const { data: parentEmail } = await supabaseClient
        .from('email_activities')
        .select('message_id, thread_id')
        .eq('message_id', inReplyTo)
        .maybeSingle();

      if (parentEmail) {
        generatedThreadId = parentEmail.thread_id;
        const threadPart = generatedThreadId.split('-').slice(0, 2).join('-');
        messageId = `<${timestamp}.${randomPart}@${fromEmail.split('@')[1]}>`;
      } else {
        const subjectSlug = subject.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
        generatedThreadId = `${subjectSlug}-${timestamp}-${randomPart}`;
        messageId = `<${timestamp}.${randomPart}@${fromEmail.split('@')[1]}>`;
      }
    } else {
      const subjectSlug = subject.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
      generatedThreadId = threadId || `${subjectSlug}-${timestamp}-${randomPart}`;
      messageId = `<${timestamp}.${randomPart}@${fromEmail.split('@')[1]}>`;
    }

    let trackingCode = `FO-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    
    if (inReplyTo) {
      const { data: parentEmail } = await supabaseClient
        .from('email_activities')
        .select('tracking_code')
        .eq('message_id', inReplyTo)
        .maybeSingle();

      if (parentEmail) {
        trackingCode = parentEmail.tracking_code;
      }
    }

    let foToken = null;
    if (trackReply && !inReplyTo) {
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('freightops_thread_tokens')
        .insert({
          token: trackingCode,
          thread_id: generatedThreadId,
          csp_event_id: cspEventId || null,
          customer_id: customerId || null,
          carrier_id: carrierId || null,
          created_by: user.id,
        })
        .select('token')
        .maybeSingle();

      if (!tokenError && tokenData) {
        foToken = tokenData.token;
      }
    } else if (inReplyTo) {
      const { data: parentEmail } = await supabaseClient
        .from('email_activities')
        .select('tracking_code, thread_id, metadata')
        .eq('message_id', inReplyTo)
        .maybeSingle();

      if (parentEmail?.metadata?.freightops_thread_token) {
        foToken = parentEmail.metadata.freightops_thread_token;
      }
    }

    let enhancedSubject = subject;
    if (!inReplyTo && foToken) {
      enhancedSubject = `[${foToken}] ${subject}`;
    }

    const mailOptions: any = {
      from: fromEmail,
      to: to.join(', '),
      subject: enhancedSubject,
      text: bodyWithSignature,
      messageId: messageId,
    };

    if (cc && cc.length > 0) {
      mailOptions.cc = cc.join(', ');
    }

    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.references = inReplyTo;
    }

    mailOptions.headers = {
      'X-CSP-Tracking-Code': trackingCode,
      'X-Entity-Type': cspEventId ? 'csp_event' : (customerId ? 'customer' : 'carrier'),
    };

    if (foToken) {
      mailOptions.headers['X-FreightOps-Token'] = foToken;
    }

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('SMTP Error:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    const { data: insertedEmail, error: insertError } = await supabaseClient
      .from('email_activities')
      .insert({
        tracking_code: trackingCode,
        csp_event_id: cspEventId || null,
        customer_id: customerId || null,
        carrier_id: carrierId || null,
        thread_id: generatedThreadId,
        message_id: messageId,
        in_reply_to_message_id: inReplyTo,
        subject: enhancedSubject,
        from_email: fromEmail,
        from_name: fromName,
        to_emails: to,
        cc_emails: cc || [],
        body_text: bodyWithSignature,
        direction: 'outbound',
        sent_at: new Date().toISOString(),
        freightops_thread_token: foToken,
        owner_id: user.id,
        is_thread_starter: !inReplyTo,
        visible_to_team: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting email activity:', insertError);
      throw new Error('Email sent but failed to save to database');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId,
        trackingCode,
        threadId: generatedThreadId,
        emailActivity: insertedEmail,
      }),
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
