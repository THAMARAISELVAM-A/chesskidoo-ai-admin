import { checkRateLimit } from './rate_limit.js'

Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const { getCorsHeaders, isOriginAllowed, corsResponse, handleOptions } = await import('../cors.ts');

  const origin = req.headers.get('origin');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return corsResponse({ error: 'Server configuration error' }, 500, origin);
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  if (req.method === 'OPTIONS') {
    return corsResponse({}, 200, origin);
  }

  // --- Rate Limiting ---
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const rateLimitResult = await checkRateLimit(ip, 'sessions')

  if (!rateLimitResult.allowed) {
    return corsResponse({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    }, 429, origin)
  }

  try {
    const url = new URL(req.url)
    const method = req.method
    const studentId = url.searchParams.get('student_id')

    // GET - Get sessions for a student
    if (method === 'GET' && studentId) {
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('login_at', { ascending: false })

      if (error) throw error

      return corsResponse(sessions || [], 200, origin);
    }

    return corsResponse({ error: 'Method not allowed or missing parameters' }, 400, origin);
  } catch (error) {
    return corsResponse({ error: error.message }, 500, origin);
  }
})
