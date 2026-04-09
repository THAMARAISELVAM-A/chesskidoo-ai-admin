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
          const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return event ? response.status(200).json(event) : response.status(404).json({ error: 'Event not found' });
        }
        const { data: events, error } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: false });
        
        if (error) throw error;
        return response.status(200).json(events || []);

      case 'POST':
        const newEvent = { 
          id: 'e' + Date.now(), 
          ...request.body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: insertedEvent, error: insertError } = await supabase
          .from('events')
          .insert(newEvent)
          .select()
          .single();
        
        if (insertError) throw insertError;
        return response.status(201).json(insertedEvent);

      case 'PUT':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        
        const updateData = { ...request.body, updated_at: new Date().toISOString() };
        const { data: updatedEvent, error: updateError } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        return response.status(200).json({ message: 'Updated', data: updatedEvent });

      case 'DELETE':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        
        const { error: deleteError } = await supabase
          .from('events')
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
