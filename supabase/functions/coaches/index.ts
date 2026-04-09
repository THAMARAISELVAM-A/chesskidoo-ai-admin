Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://vseombfkrvpffnpgbsnk.supabase.co';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZW9tYmZrcnZwZmZucGdic25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzNzQyMCwiZXhwIjoyMDg5NTEzNDIwfQ.SUkFrfUnzbm_IZveqVfGvS31wFZR7fggEVo8RVPiNj8';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  function transformCoach(c) {
    return {
      id: c.id,
      full_name: c.name || c.full_name || '',
      name: c.name || c.full_name || '',
      email: c.email,
      phone: c.phone,
      specialty: c.specialization || c.specialty || '',
      specialization: c.specialization || c.specialty || '',
      experience: c.experience,
      rating: c.rating,
      bio: c.bio,
      status: c.status,
      salary: c.hourly_rate || c.salary || 0,
      hourly_rate: c.hourly_rate || c.salary || 0,
      availability: c.availability,
      photo_url: c.photo_url || '',
      address: c.address || '',
      additional_details: c.bio || '',
      created_at: c.created_at,
      updated_at: c.updated_at
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
        const { data: coach, error } = await supabase
          .from('coaches')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(coach ? transformCoach(coach) : null), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      const { data: coaches, error } = await supabase
        .from('coaches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return new Response(JSON.stringify((coaches || []).map(transformCoach)), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (req.method === 'POST') {
      const { full_name, specialty, phone, address, photo_url, salary, additional_details, ...rest } = body;
      const newCoach = { 
        id: 'c' + Date.now(), 
        name: full_name || body.name || '',
        email: body.email || null,
        phone: phone || body.phone || '',
        specialization: specialty || body.specialization || '',
        experience: body.experience || null,
        rating: body.rating || 0,
        bio: body.bio || additional_details || '',
        status: 'active',
        hourly_rate: salary || body.hourly_rate || 0,
        availability: body.availability || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: insertedCoach, error: insertError } = await supabase
        .from('coaches')
        .insert(newCoach)
        .select()
        .single();
      
      if (insertError) throw insertError;
      return new Response(JSON.stringify(insertedCoach ? transformCoach(insertedCoach) : null), {
        status: 201,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (req.method === 'PUT') {
      if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const { full_name, specialty, phone, address, photo_url, salary, additional_details, ...rest } = body;
      const updateData = { 
        ...rest,
        name: full_name || body.name,
        phone: phone || body.phone,
        specialization: specialty || body.specialization,
        bio: body.bio || additional_details,
        hourly_rate: salary || body.hourly_rate,
        updated_at: new Date().toISOString()
      };
      
      const { data: updatedCoach, error: updateError } = await supabase
        .from('coaches')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      return new Response(JSON.stringify({ message: 'Updated', data: updatedCoach ? transformCoach(updatedCoach) : null }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (req.method === 'DELETE') {
      if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const { error: deleteError } = await supabase
        .from('coaches')
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
