import { checkRateLimit } from './rate_limit.js'
const { getCorsHeaders, isOriginAllowed, corsResponse, handleOptions } = await import('../cors.ts');

// Helper function for input validation - must be defined before use
function sanitizeString(str: unknown, maxLength = 255): string {
  if (typeof str !== 'string') return ''
  return str.slice(0, maxLength).replace(/[<>"'`;]/g, '').trim()
}

Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')

  const origin = req.headers.get('origin');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return corsResponse({ error: 'Server configuration error' }, 500, origin);
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  if (req.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(origin);
    return new Response('ok', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // --- Rate Limiting ---
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const rateLimitResult = await checkRateLimit(ip, 'rating_history')

  if (!rateLimitResult.allowed) {
    return corsResponse({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    }, 429, origin)
  }

  // --- Authentication ---
  const { validateAuth } = await import('./rate_limit.js')
  const auth = await validateAuth(req, supabase)
  if (!auth.allowed) {
    return corsResponse({ error: auth.error }, 401, origin);
  }
  
  function transformRatingHistory(r: Record<string, unknown>) {
    return {
      id: r.id,
      student_id: r.student_id,
      rating: r.rating || 0,
      old_rating: r.old_rating || null,
      change_type: r.change_type || 'manual',
      notes: r.notes || '',
      recorded_at: r.recorded_at || new Date().toISOString()
    }
  }
  
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const method = req.method
    const studentId = url.searchParams.get('student_id')
    
    // GET - List rating history with pagination
    if (method === 'GET') {
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
      const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') || '100')))
      const offset = (page - 1) * limit
      const search = studentId ? `student_id.eq.${studentId}` : undefined
      
      let query = supabase
        .from('rating_history')
        .select('*', { count: 'exact' })
        .order('recorded_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (studentId) {
        query = query.eq('student_id', studentId)
      }
      
      const { data: ratings, error, count } = await query
      
      if (error) {
        return corsResponse({ error: error.message }, 500, origin);
      }

      const transformed = (ratings || []).map(transformRatingHistory)

      return corsResponse({
        data: transformed,
        pagination: {
          page,
          limit,
          total: count || transformed.length,
          total_pages: count ? Math.ceil(count / limit) : 1
        }
      }, 200, origin);
    }

    // POST - Create new rating entry
    if (method === 'POST') {
      let rawBody: Record<string, unknown> = {}
      try { rawBody = await req.json() } catch (_e) {}

      const studentId = String(rawBody.student_id || '').trim()
      if (!studentId) {
        return corsResponse({ error: 'Student ID is required' }, 400, origin);
      }

      const rating = parseInt(String(rawBody.rating || 0))
      if (isNaN(rating) || rating < 0 || rating > 3500) {
        return corsResponse({ error: 'Rating must be between 0 and 3500' }, 400, origin);
      }

      const newRating: Record<string, unknown> = {
        id: crypto.randomUUID(),
        student_id: studentId,
        rating: rating,
        old_rating: rawBody.old_rating ? parseInt(String(rawBody.old_rating)) || null : null,
        change_type: sanitizeString(rawBody.change_type || 'manual', 50),
        notes: sanitizeString(rawBody.notes || '', 2000),
        recorded_at: rawBody.recorded_at ? String(rawBody.recorded_at) : new Date().toISOString()
      }

      const { data: insertedRating, error: insertError } = await supabase
        .from('rating_history')
        .insert(newRating)
        .select()
        .single()

      if (insertError) {
        return corsResponse({ error: insertError.message }, 400, origin);
      }

      return corsResponse(insertedRating ? transformRatingHistory(insertedRating) : { success: true }, 201, origin);
    }

    return corsResponse({ error: 'Method not allowed' }, 405, origin);
  } catch (error) {
    return corsResponse({ error: error.message }, 500, origin);
  }
})
