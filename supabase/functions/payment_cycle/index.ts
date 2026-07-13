import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const { getCorsHeaders, isOriginAllowed, corsResponse, handleOptions } = await import('../cors.ts')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return corsResponse({}, 200, origin)
  }

  if (!supabaseUrl || !supabaseKey) {
    return corsResponse({ error: 'Server configuration error' }, 500, origin)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const url = new URL(req.url)
    const year  = parseInt(url.searchParams.get('year')  || String(new Date().getFullYear()))
    const month = parseInt(url.searchParams.get('month') || String(new Date().getMonth() + 1))
    const month2 = parseInt(url.searchParams.get('month2') || String(month))
    const detail = url.searchParams.get('detail') === 'true'

    const { data: summary, error: summaryErr } = await supabase.rpc('get_cycle_summary', {
      p_year: year, p_month1: month, p_month2: month2
    })
    if (summaryErr) throw summaryErr

    let students = null
    if (detail) {
      const { data: studentData, error: studentErr } = await supabase.rpc(
        'get_payment_status_for_cycle',
        { p_year: year, p_month1: month, p_month2: month2 }
      )
      if (studentErr) throw studentErr
      students = studentData
    }

    return corsResponse({
      year, month, month2,
      summary: summary || [],
      students,
      generated_at: new Date().toISOString()
    }, 200, origin)

  } catch (err) {
    return corsResponse({ error: err.message }, 500, origin)
  }
})
