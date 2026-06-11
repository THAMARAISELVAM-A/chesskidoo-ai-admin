Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const { corsResponse } = await import('../cors.ts')

  const origin = req.headers.get('origin')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return corsResponse({ error: 'Server config error' }, 500, origin)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  if (req.method === 'OPTIONS') {
    return corsResponse({}, 200, origin)
  }

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (req.method === 'GET') {
      const { data } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('active', true)
        .order('login_at', { ascending: false })

      return corsResponse(data || [], 200, origin)
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))

      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          id: body.id || crypto.randomUUID(),
          user_name: body.user_name,
          role: body.role,
          student_id: body.student_id,
          login_at: new Date().toISOString(),
          active: true
        })
        .select()
        .single()

      if (error) throw error

      return corsResponse(data, 201, origin)
    }

    if (req.method === 'PUT') {
      const { data, error } = await supabase
        .from('user_sessions')
        .update({
          active: false,
          logout_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return corsResponse(data, 200, origin)
    }

    return corsResponse({ error: 'Method not allowed' }, 405, origin)
  } catch (error) {
    return corsResponse({ error: error.message }, 400, origin)
  }
})