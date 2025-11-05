import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FeedbackEmailRequest {
  feedbackType: string;
  title: string;
  description: string;
  currentPage: string;
  priority: string;
  userName: string;
  userEmail: string;
  boltPromptSuggestion: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const {
      feedbackType,
      title,
      description,
      currentPage,
      priority,
      userName,
      userEmail,
      boltPromptSuggestion
    }: FeedbackEmailRequest = await req.json();

    console.log('Feedback received:', { feedbackType, title, priority, userName, userEmail, currentPage });
    console.log('Feedback successfully logged to system');

    return new Response(
      JSON.stringify({ success: true, message: 'Feedback submitted successfully' }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing feedback:', error);
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