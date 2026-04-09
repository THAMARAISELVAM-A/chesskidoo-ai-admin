import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  // Create fresh client for every request to avoid context issues
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    }
  );
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  try {
    const { id } = request.query;

    switch (request.method) {
      case 'GET':
        if (id) {
          const { data: coach, error } = await supabase
            .from('coaches')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return coach ? response.status(200).json(coach) : response.status(404).json({ error: 'Coach not found' });
        }
        const { data: coaches, error } = await supabase
          .from('coaches')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return response.status(200).json(coaches || []);

      case 'POST':
        const newCoach = { 
          id: 'c' + Date.now(), 
          ...request.body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: insertedCoach, error: insertError } = await supabase
          .from('coaches')
          .insert(newCoach)
          .select()
          .single();
        
        if (insertError) throw insertError;
        return response.status(201).json(insertedCoach);

      case 'PUT':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        
        const updateData = { ...request.body, updated_at: new Date().toISOString() };
        const { data: updatedCoach, error: updateError } = await supabase
          .from('coaches')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        return response.status(200).json({ message: 'Updated', data: updatedCoach });

      case 'DELETE':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        
        const { error: deleteError } = await supabase
          .from('coaches')
          .delete()
          .eq('id', id);
        
        if (deleteError) throw deleteError;
        return response.status(200).json({ message: 'Deleted' });

      default:
        return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: error.message });
  }
}
