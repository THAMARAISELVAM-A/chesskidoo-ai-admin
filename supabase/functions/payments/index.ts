Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://vseombfkrvpffnpgbsnk.supabase.co';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZW9tYmZrcnZwZmZucGdic25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzNzQyMCwiZXhwIjoyMDg5NTEzNDIwfQ.SUkFrfUnzbm_IZveqVfGvS31wFZR7fggEVo8RVPiNj8';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  async function getStudentName(studentId) {
    if (!studentId) return '';
    const { data } = await supabase.from('students').select('name').eq('id', studentId).single();
    return data?.name || '';
  }

  async function transformPayment(p) {
    const studentName = p.student_id ? await getStudentName(p.student_id) : '';
    return {
      id: p.id,
      student_id: p.student_id,
      student_name: studentName,
      amount: p.amount || 0,
      currency: p.currency || 'INR',
      status: p.status || 'pending',
      payment_method: p.payment_method || '',
      transaction_id: p.transaction_id || '',
      description: p.description || '',
      payment_date: p.payment_date || '',
      created_at: p.created_at
    };
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {};

    if (req.method === 'GET') {
      if (id) {
        const { data: payment, error } = await supabase
          .from('payments')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        const transformed = await transformPayment(payment);
        return new Response(JSON.stringify(transformed), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      const transformedList = await Promise.all((payments || []).map(transformPayment));
      return new Response(JSON.stringify(transformedList), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (req.method === 'POST') {
      const { student_id, amount, provider, ...rest } = body;
      const newPayment = { 
        id: 'p' + Date.now(), 
        student_id: student_id || null,
        amount: amount || 0,
        currency: 'INR',
        status: 'completed',
        payment_method: provider || body.payment_method || '',
        transaction_id: 'txn_' + Date.now(),
        description: body.description || 'Tuition payment',
        payment_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };
      
      const { data: insertedPayment, error: insertError } = await supabase
        .from('payments')
        .insert(newPayment)
        .select()
        .single();
      
      if (insertError) throw insertError;
      const transformed = await transformPayment(insertedPayment);
      return new Response(JSON.stringify(transformed), {
        status: 201,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (req.method === 'DELETE') {
      if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      return new Response(JSON.stringify({ success: true, message: 'Deleted', id }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
