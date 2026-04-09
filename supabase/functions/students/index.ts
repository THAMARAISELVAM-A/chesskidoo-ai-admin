Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://vseombfkrvpffnpgbsnk.supabase.co';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZW9tYmZrcnZwZmZucGdic25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzNzQyMCwiZXhwIjoyMDg5NTEzNDIwfQ.SUkFrfUnzbm_IZveqVfGvS31wFZR7fggEVo8RVPiNj8';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  function transformStudent(s) {
    return {
      id: s.id,
      full_name: s.name || s.full_name || '',
      name: s.name || s.full_name || '',
      email: s.email,
      phone: s.phone,
      parent_phone: s.parent_phone || s.phone || '',
      gender: s.gender,
      age: s.age,
      grade: s.grade,
      level: s.grade || s.level || 'Beginner',
      join_date: s.enrollment_date || s.join_date || '',
      enrollment_date: s.enrollment_date || s.join_date || '',
      current_rating: s.rating || s.current_rating || 800,
      rating: s.rating || s.current_rating || 800,
      payment_status: s.payment_status || (s.status === 'active' ? 'Paid' : 'Due'),
      status: s.status,
      monthly_fee: s.monthly_fee || 5000,
      batch_type: s.batch_type || 'Evening',
      batch_time: s.batch_time || '17:00',
      coaches: s.coach_id ? { id: s.coach_id, full_name: s.coach_name || '' } : null,
      coach_id: s.coach_id,
      custom_avatar: s.custom_avatar,
      tactics_score: s.tactics_score || 50,
      endgame_score: s.endgame_score || 50,
      openings_score: s.openings_score || 50,
      positional_score: s.positional_score || 50,
      coach_notes: s.coach_notes || '',
      created_at: s.created_at,
      updated_at: s.updated_at
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
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(student ? transformStudent(student) : null), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return new Response(JSON.stringify((students || []).map(transformStudent)), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (req.method === 'POST') {
      const { level, join_date, full_name, parent_phone, current_rating, coaches, payment_status, ...rest } = body;
      const newStudent = { 
        id: 's' + Date.now(), 
        name: full_name || body.name || '',
        email: body.email || null,
        phone: parent_phone || body.phone || '',
        age: body.age || null,
        grade: level || body.grade || null,
        parent_name: body.parent_name || '',
        parent_phone: parent_phone || body.parent_phone || '',
        address: body.address || null,
        enrollment_date: body.enrollment_date || join_date || new Date().toISOString().split('T')[0],
        status: payment_status === 'Paid' ? 'active' : 'pending',
        coach_id: coaches?.id || body.coach_id || null,
        rating: current_rating || body.rating || 800,
        notes: body.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: insertedStudent, error: insertError } = await supabase
        .from('students')
        .insert(newStudent)
        .select()
        .single();
      
      if (insertError) throw insertError;
      return new Response(JSON.stringify(insertedStudent ? transformStudent(insertedStudent) : null), {
        status: 201,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (req.method === 'PUT') {
      if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const updateData = { 
        name: body.full_name || body.name,
        phone: body.parent_phone || body.phone,
        grade: body.level || body.grade,
        enrollment_date: body.join_date || body.enrollment_date,
        rating: body.current_rating || body.rating,
        coach_id: body.coaches?.id || body.coach_id,
        status: body.payment_status === 'Paid' ? 'active' : 'pending',
        updated_at: new Date().toISOString()
      };
      
      const { data: updatedStudent, error: updateError } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      return new Response(JSON.stringify({ message: 'Updated', data: updatedStudent ? transformStudent(updatedStudent) : null }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (req.method === 'DELETE') {
      if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Deleting student with id:', id);
      
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }
      
      console.log('Delete successful for id:', id);
      
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
