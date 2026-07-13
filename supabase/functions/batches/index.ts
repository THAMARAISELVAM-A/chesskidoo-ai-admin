import { checkRateLimit } from './rate_limit.js'

Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const { getCorsHeaders, isOriginAllowed, corsResponse, handleOptions } = await import('../cors.ts');

  const origin = req.headers.get('origin');
  
  // Handle OPTIONS preflight FIRST before any other checks
  if (req.method === 'OPTIONS') {
    return handleOptions(origin);
  }
  
  // Origin check for actual requests (after OPTIONS)
  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
  
  const corsHeaders = getCorsHeaders(origin);
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return corsResponse({ error: 'Server configuration error' }, 500, origin);
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  

  // --- Rate Limiting ---
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const rateLimitResult = await checkRateLimit(ip, 'batches')

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
  function sanitize(str: unknown, maxLen = 255): string {
    if (typeof str !== 'string') return ''
    return str.slice(0, maxLen).replace(/[<>"'`;]/g, '').trim()
  }

  function transformBatch(b: Record<string, unknown>) {
    return {
      id: b.id,
      name: b.name || '',
      coach_id: b.coach_id || null,
      level: b.level || 'Beginner',
      days: b.days || '',
      time_slot: b.time_slot || '',
      student_ids: b.student_ids || [],
      max_capacity: b.max_capacity || 10,
      status: b.status || 'active',
      notes: b.notes || '',
      chessable_url: b.chessable_url || '',
      created_at: b.created_at,
      updated_at: b.updated_at
    }
  }

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const method = req.method

    // GET — List all batches
    if (method === 'GET') {
      const statusFilter = sanitize(url.searchParams.get('status') || '', 20)

      let query = supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: true })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        data: (data || []).map(transformBatch)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST — Create batch
    if (method === 'POST') {
      let body: Record<string, unknown> = {}
      try { body = await req.json() } catch (_e) {}

      const name = sanitize(body.name, 100)
      if (!name) {
        return new Response(JSON.stringify({ error: 'Batch name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const validLevels = ['Beginner', 'Intermediate', 'Advanced', 'Elite']
      const level = validLevels.includes(String(body.level)) ? String(body.level) : 'Beginner'

      const newBatch = {
        id: crypto.randomUUID(),
        name,
        coach_id: body.coach_id ? sanitize(String(body.coach_id), 50) : null,
        level,
        days: sanitize(body.days, 200),
        time_slot: sanitize(body.time_slot, 100),
        student_ids: Array.isArray(body.student_ids) ? body.student_ids : [],
        max_capacity: Math.max(1, Math.min(100, parseInt(String(body.max_capacity)) || 10)),
        status: 'active',
        notes: sanitize(body.notes, 500),
        chessable_url: sanitize(body.chessable_url, 500),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('batches')
        .insert(newBatch)
        .select()
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(transformBatch(data)), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PUT — Update batch
    if (method === 'PUT') {
      if (!id) {
        return new Response(JSON.stringify({ error: 'Batch ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      let body: Record<string, unknown> = {}
      try { body = await req.json() } catch (_e) {}

      const updateData: Record<string, unknown> = {}

      if (body.name !== undefined) updateData.name = sanitize(body.name, 100)
      if (body.coach_id !== undefined) updateData.coach_id = body.coach_id ? sanitize(String(body.coach_id), 50) : null
      if (body.level !== undefined) {
        const validLevels = ['Beginner', 'Intermediate', 'Advanced', 'Elite']
        updateData.level = validLevels.includes(String(body.level)) ? String(body.level) : 'Beginner'
      }
      if (body.days !== undefined) updateData.days = sanitize(body.days, 200)
      if (body.time_slot !== undefined) updateData.time_slot = sanitize(body.time_slot, 100)
      if (body.student_ids !== undefined && Array.isArray(body.student_ids)) updateData.student_ids = body.student_ids
      if (body.max_capacity !== undefined) updateData.max_capacity = Math.max(1, Math.min(100, parseInt(String(body.max_capacity)) || 10))
      if (body.status !== undefined) {
        const validStatuses = ['active', 'inactive', 'archived']
        updateData.status = validStatuses.includes(String(body.status)) ? String(body.status) : 'active'
      }
      if (body.notes !== undefined) updateData.notes = sanitize(body.notes, 500)
      if (body.chessable_url !== undefined) updateData.chessable_url = sanitize(body.chessable_url, 500)

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('batches')
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

      return new Response(JSON.stringify(transformBatch(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // DELETE — Delete batch
    if (method === 'DELETE') {
      if (!id) {
        return new Response(JSON.stringify({ error: 'Batch ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { error } = await supabase
        .from('batches')
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


