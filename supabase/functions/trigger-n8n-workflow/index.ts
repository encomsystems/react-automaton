import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { webhookUrl } = await req.json()
    
    console.log(`Triggering n8n workflow at: ${webhookUrl}`)
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'Supabase-Edge-Function/1.0'
      },
      body: JSON.stringify({
        action: 'start_process',
        timestamp: new Date().toISOString()
      }),
    })

    console.log(`Response status: ${response.status}`)
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))
    console.log(`Response URL: ${response.url}`)

    const responseText = await response.text()
    console.log(`Raw response body (first 1000 chars):`, responseText.substring(0, 1000))
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}, response: ${responseText}`)
      throw new Error(`HTTP error! status: ${response.status} - ${responseText.substring(0, 200)}`)
    }
    
    let data
    try {
      data = JSON.parse(responseText)
    } catch (error) {
      console.error('Failed to parse JSON response:', responseText.substring(0, 200))
      // If it's not JSON, return the text response
      data = { message: responseText, success: true }
    }
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in trigger-n8n-workflow:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})