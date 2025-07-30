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
    const resumeUrl = formData.get('resumeUrl') as string
    const file = formData.get('file') as File
    
    if (!resumeUrl || !file) {
      throw new Error('Missing resumeUrl or file')
    }
    
    console.log(`Uploading file to n8n at: ${resumeUrl}`)
    console.log(`File details: ${file.name}, ${file.size} bytes`)
    
    // Create new FormData for the n8n request
    const n8nFormData = new FormData()
    n8nFormData.append('file', file)
    n8nFormData.append('action', 'process_invoice')
    
    const response = await fetch(resumeUrl, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'Supabase-Edge-Function/1.0'
      },
      body: n8nFormData,
    })

    console.log(`Response status: ${response.status}`)
    console.log(`Response headers:`, Object.fromEntries(response.headers))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`Error response body: ${errorText}`)
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
    }

    const responseText = await response.text()
    console.log(`Raw response body: ${responseText}`)
    
    let data
    try {
      data = JSON.parse(responseText)
      console.log(`Parsed response data:`, JSON.stringify(data, null, 2))
    } catch (parseError) {
      console.log(`Failed to parse JSON response: ${parseError.message}`)
      data = { message: responseText }
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
    console.error('Error in upload-to-n8n:', error)
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