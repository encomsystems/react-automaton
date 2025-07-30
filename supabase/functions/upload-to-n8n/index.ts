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
    const formData = await req.formData()
    const webhookUrl = formData.get('webhookUrl') as string
    const file = formData.get('file') as File
    
    if (!webhookUrl || !file) {
      throw new Error('Missing webhookUrl or file')
    }

    // Forward the form data to n8n
    const n8nFormData = new FormData()
    n8nFormData.append('file', file)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: n8nFormData
    })

    const data = await response.json()
    
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