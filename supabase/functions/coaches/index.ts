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
      console.log('POST /coaches body:', JSON.stringify(body));
      
      const newCoach = { 
        id: 'c' + Date.now(), 
        name: body.name || '',
        email: body.email || null,
        phone: body.phone || '',
        specialization: body.specialization || '',
        experience: body.experience || null,
        rating: body.rating || 0,
        bio: body.bio || '',
        status: 'active',
        hourly_rate: body.salary || 0,
        availability: body.availability || '',
        photo_url: body.photo_url || '',
        address: body.address || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('POST newCoach:', JSON.stringify(newCoach));
      
      const { data: insertedCoach, error: insertError } = await supabase
        .from('coaches')
        .insert(newCoach)
        .select()
        .single();
      
      if (insertError) {
        console.error('Insert error:', JSON.stringify(insertError));
        return new Response(JSON.stringify({ error: insertError.message, details: insertError }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
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
      
      console.log('PUT /coaches body:', JSON.stringify(body));
      
      // Build update payload with only known existing columns
      const updateData: Record<string, unknown> = {};
      
      if (body.name) updateData.name = body.name;
      if (body.phone) updateData.phone = body.phone;
      if (body.email) updateData.email = body.email;
      if (body.specialization) updateData.specialization = body.specialization;
      if (body.experience) updateData.experience = body.experience;
      if (body.rating) updateData.rating = body.rating;
      if (body.bio) updateData.bio = body.bio;
      if (body.status) updateData.status = body.status;
      if (body.salary) updateData.hourly_rate = body.salary;
      if (body.availability) updateData.availability = body.availability;
      if (body.address) updateData.address = body.address;
      if (body.photo_url) updateData.photo_url = body.photo_url;
      
      updateData.updated_at = new Date().toISOString();
      
      console.log('PUT updateData:', JSON.stringify(updateData));
      
      const { data: updatedCoach, error: updateError } = await supabase
        .from('coaches')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Update error:', JSON.stringify(updateError));
        return new Response(JSON.stringify({ error: updateError.message, details: updateError }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
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
      
      if (deleteError) {
        console.error('Delete error:', JSON.stringify(deleteError));
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
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
