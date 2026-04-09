Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://vseombfkrvpffnpgbsnk.supabase.co';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZW9tYmZrcnZwZmZucGdic25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzNzQyMCwiZXhwIjoyMDg5NTEzNDIwfQ.SUkFrfUnzbm_IZveqVfGvS31wFZR7fggEVo8RVPiNj8';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Master credentials
  const MASTER_USER = 'Tom@193';
  const MASTER_PASS = 'Thamaraiselvam@309402$';

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {};

    // Handle login attempt tracking
    if (action === 'login') {
      const { username, password, status, user_type, user_id, user_name } = body;
      
      // Check for recent failed attempts
      const { data: recentAttempts } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('username', username)
        .eq('status', 'failed')
        .gte('attempt_time', new Date(Date.now() - 15 * 60 * 1000).toISOString());
      
      const failedCount = recentAttempts?.length || 0;
      
      // If more than 5 failed attempts in 15 minutes, lock
      if (failedCount >= 5) {
        // Log the locked attempt
        await supabase.from('login_attempts').insert({
          id: 'la_' + Date.now(),
          username,
          status: 'locked',
          ip_address: body.ip_address || 'Unknown',
          device: body.device || 'Unknown',
          lock_expires: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        });
        return Response.json({ 
          success: false, 
          locked: true, 
          message: 'Account locked due to too many failed attempts. Try again in 30 minutes.' 
        });
      }
      
      // Record this attempt
      await supabase.from('login_attempts').insert({
        id: 'la_' + Date.now(),
        username,
        status,
        ip_address: body.ip_address || 'Unknown',
        device: body.device || 'Unknown'
      });
      
      return Response.json({ success: true, failed_attempts: failedCount });
    }

    // Handle operations logging
    if (action === 'log_operation') {
      const newLog = {
        id: 'op_' + Date.now(),
        operation_type: body.operation_type || 'unknown',
        table_name: body.table_name || null,
        user_type: body.user_type || 'system',
        user_id: body.user_id || null,
        user_name: body.user_name || null,
        description: body.description || null,
        old_data: body.old_data || null,
        new_data: body.new_data || null,
        ip_address: body.ip_address || 'Unknown',
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('operations_log').insert(newLog);
      if (error) throw error;
      
      return Response.json({ success: true });
    }

    // Get login attempts (for admin)
    if (action === 'get_attempts') {
      const { data: attempts, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('attempt_time', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return Response.json(attempts || []);
    }

    // Get operations log (for admin)
    if (action === 'get_operations') {
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const { data: logs, error } = await supabase
        .from('operations_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return Response.json(logs || []);
    }

    // Check if master credentials
    if (action === 'verify_master') {
      const { username, password } = body;
      const isMaster = username === MASTER_USER && password === MASTER_PASS;
      return Response.json({ is_master: isMaster });
    }

    return Response.json({ error: 'Invalid action' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
