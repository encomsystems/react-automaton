import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl } = await req.json();
    console.log('Calling n8n webhook at:', resumeUrl);

    if (!resumeUrl) {
      throw new Error('Resume URL is required');
    }

    const response = await fetch(resumeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        finalresponse: 'success'
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response body:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    // Check if response has content before trying to parse JSON
    const responseText = await response.text();
    console.log('=== WEBHOOK RESPONSE DEBUG ===');
    console.log('Raw response body:', responseText);
    console.log('Response length:', responseText.length);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    let responseData;
    if (responseText.trim()) {
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed JSON data:', JSON.stringify(responseData, null, 2));
      } catch (parseError) {
        console.log('Response is not valid JSON, treating as text:', responseText);
        responseData = { message: responseText };
      }
    } else {
      console.log('Empty response body, webhook completed successfully');
      responseData = { success: true, message: 'Webhook completed successfully' };
    }

    console.log('Final webhook response data:', JSON.stringify(responseData, null, 2));
    console.log('=== END WEBHOOK DEBUG ===');

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in call-n8n-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});