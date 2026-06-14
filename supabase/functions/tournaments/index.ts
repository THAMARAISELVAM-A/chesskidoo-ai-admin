import { checkRateLimit } from './rate_limit.js'

Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const { getCorsHeaders, isOriginAllowed, corsResponse } = await import('../cors.ts');

  const origin = req.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const corsHeaders = getCorsHeaders(origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return corsResponse(JSON.stringify({ error: 'Server configuration error' }), 500, origin);
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // --- Rate Limiting ---
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const rateLimitResult = await checkRateLimit(ip, 'default')

  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // --- Authentication ---
  const { validateAuth } = await import('./rate_limit.js')
  const auth = await validateAuth(req, supabase)
  if (!auth.allowed) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // --- Input Validation ---
  function sanitize(str: unknown, maxLen = 1000): string {
    if (typeof str !== 'string') return ''
    return str.slice(0, maxLen).replace(/[<>"'`;]/g, '').trim()
  }

  function transformTournament(t: Record<string, unknown>) {
    return {
      id: t.id,
      title: t.title || '',
      start_date: t.start_date || '',
      location: t.location || '',
      city: t.city || 'chennai',
      entry_fee: parseFloat(String(t.entry_fee || 0)),
      rating_required: t.rating_required || 'Open',
      elo_limit: parseInt(String(t.elo_limit || 9999)),
      registration_url: t.registration_url || '',
      organizer: t.organizer || 'FIDE',
      description: t.description || '',
      created_at: t.created_at,
      updated_at: t.updated_at
    }
  }

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const method = req.method

    // GET — List upcoming tournaments
    if (method === 'GET') {
      const cityFilter = sanitize(url.searchParams.get('city') || '', 50)
      const showAll = url.searchParams.get('all') === 'true'

      let query = supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true })

      // Standard query: only return upcoming tournaments (date >= today)
      if (!showAll) {
        const todayStr = new Date().toISOString().split('T')[0]
        query = query.gte('start_date', todayStr)
      }

      if (cityFilter) {
        query = query.eq('city', cityFilter)
      }

      const { data, error } = await query

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        data: (data || []).map(transformTournament)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST — Create tournament
    if (method === 'POST') {
      let body: Record<string, unknown> = {}
      try { body = await req.json() } catch (_e) {}

      const title = sanitize(body.title, 200)
      const start_date = sanitize(body.start_date || body.date, 10)

      if (!title || !start_date) {
        return new Response(JSON.stringify({ error: 'Title and Date are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const newTournament = {
        id: crypto.randomUUID(),
        title,
        start_date,
        location: sanitize(body.location, 500),
        city: sanitize(body.city || 'chennai', 50).toLowerCase(),
        entry_fee: parseFloat(String(body.entry_fee || body.fee || 0)) || 0,
        rating_required: sanitize(body.rating_required || body.category, 100) || 'Open',
        elo_limit: parseInt(String(body.elo_limit || body.eloLimit || 9999)) || 9999,
        registration_url: sanitize(body.registration_url || body.regLink, 500),
        organizer: sanitize(body.organizer || body.federation, 100) || 'FIDE',
        description: sanitize(body.description, 2000),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert(newTournament)
        .select()
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(transformTournament(data)), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PUT — Edit tournament
    if (method === 'PUT') {
      if (!id) {
        return new Response(JSON.stringify({ error: 'Tournament ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      let body: Record<string, unknown> = {}
      try { body = await req.json() } catch (_e) {}

      const updateData: Record<string, unknown> = {}

      if (body.title !== undefined) updateData.title = sanitize(body.title, 200)
      if (body.start_date !== undefined) updateData.start_date = sanitize(body.start_date, 10)
      if (body.location !== undefined) updateData.location = sanitize(body.location, 500)
      if (body.city !== undefined) updateData.city = sanitize(body.city, 50).toLowerCase()
      if (body.entry_fee !== undefined) updateData.entry_fee = parseFloat(String(body.entry_fee)) || 0
      if (body.rating_required !== undefined) updateData.rating_required = sanitize(body.rating_required, 100)
      if (body.elo_limit !== undefined) updateData.elo_limit = parseInt(String(body.elo_limit)) || 9999
      if (body.registration_url !== undefined) updateData.registration_url = sanitize(body.registration_url, 500)
      if (body.organizer !== undefined) updateData.organizer = sanitize(body.organizer, 100)
      if (body.description !== undefined) updateData.description = sanitize(body.description, 2000)

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(transformTournament(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // DELETE — Delete tournament
    if (method === 'DELETE') {
      if (!id) {
        return new Response(JSON.stringify({ error: 'Tournament ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id)

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ success: true, id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
