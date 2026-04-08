import { getSupabaseClient } from './supabase.js';

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  try {
    const supabase = getSupabaseClient();
    const { id } = request.query;

    switch (request.method) {
      case 'GET':
        if (id) {
          const { data: game, error } = await supabase
            .from('games')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return game ? response.status(200).json(game) : response.status(404).json({ error: 'Game not found' });
        }
        const { data: games, error } = await supabase
          .from('games')
          .select('*')
          .order('date_played', { ascending: false });
        
        if (error) throw error;
        return response.status(200).json(games || []);

      case 'POST':
        const newGame = { 
          id: 'g' + Date.now(), 
          ...request.body,
          created_at: new Date().toISOString()
        };
        
        const { data: insertedGame, error: insertError } = await supabase
          .from('games')
          .insert(newGame)
          .select()
          .single();
        
        if (insertError) throw insertError;
        return response.status(201).json(insertedGame);

      case 'PUT':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        
        const updateData = { ...request.body };
        const { data: updatedGame, error: updateError } = await supabase
          .from('games')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        return response.status(200).json({ message: 'Updated', data: updatedGame });

      case 'DELETE':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        
        const { error: deleteError } = await supabase
          .from('games')
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
