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
          const { data: payment, error } = await supabase
            .from('payments')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return payment ? response.status(200).json(payment) : response.status(404).json({ error: 'Payment not found' });
        }
        const { data: payments, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return response.status(200).json(payments || []);

      case 'POST':
        const newPayment = { 
          id: 'p' + Date.now(), 
          ...request.body,
          created_at: new Date().toISOString()
        };
        
        const { data: insertedPayment, error: insertError } = await supabase
          .from('payments')
          .insert(newPayment)
          .select()
          .single();
        
        if (insertError) throw insertError;
        return response.status(201).json(insertedPayment);

      case 'PUT':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        
        const updateData = { ...request.body };
        const { data: updatedPayment, error: updateError } = await supabase
          .from('payments')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        return response.status(200).json({ message: 'Updated', data: updatedPayment });

      case 'DELETE':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        
        const { error: deleteError } = await supabase
          .from('payments')
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
