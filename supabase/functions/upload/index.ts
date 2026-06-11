Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const { corsResponse } = await import('../cors.ts')

  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return corsResponse({}, 200, origin)
  }

  try {
    const { image } = await req.json()
    if (!image) throw new Error('No image data provided')

    const IMGBB_API_KEY = Deno.env.get('IMGBB_API_KEY')
    if (!IMGBB_API_KEY) throw new Error('Server key configuration missing')

    const params = new URLSearchParams()
    params.append('image', image)

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: params
    })

    const data = await res.json()
    return corsResponse(data, res.status, origin)

  } catch (error) {
    return corsResponse({ error: error.message }, 400, origin)
  }
})