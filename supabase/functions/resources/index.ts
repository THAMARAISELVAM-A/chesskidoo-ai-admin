import { checkRateLimit } from './rate_limit.js'

Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const { getCorsHeaders, isOriginAllowed, corsResponse } = await import('../cors.ts');

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return corsResponse({ error: 'Server configuration error' }, 500, origin);
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // --- Rate Limiting ---
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const rateLimitResult = await checkRateLimit(ip, 'resources')

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
  
  function transformResource(r: Record<string, unknown>) {
    return {
      id: r.id,
      title: r.title || '',
      description: r.description || '',
      type: r.type || 'document',
      url: r.url || '#',
      level_requirement: r.level_requirement || 'Beginner',
      created_at: r.created_at || new Date().toISOString()
    }
  }
  
  try {
    const url = new URL(req.url)
    const method = req.method
    
    // GET - List resources
    if (method === 'GET') {
      const { data: resources, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error

      return corsResponse((resources || []).map(transformResource), 200, origin);
    }

    return corsResponse({ error: 'Method not allowed' }, 405, origin);
  } catch (error) {
    return corsResponse({ error: error.message }, 500, origin);
  }
})