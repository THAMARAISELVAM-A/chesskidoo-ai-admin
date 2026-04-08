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
          const { data: student, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return student 
            ? response.status(200).json(student)
            : response.status(404).json({ error: 'Student not found' });
        }
        const { data: students, error } = await supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return response.status(200).json(students || []);

      case 'POST':
        const newStudent = { 
          id: 's' + Date.now(), 
          ...request.body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: insertedStudent, error: insertError } = await supabase
          .from('students')
          .insert(newStudent)
          .select()
          .single();
        
        if (insertError) throw insertError;
        return response.status(201).json(insertedStudent);

      case 'PUT':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        
        const updateData = { ...request.body, updated_at: new Date().toISOString() };
        const { data: updatedStudent, error: updateError } = await supabase
          .from('students')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        return response.status(200).json({ message: 'Updated', data: updatedStudent });

      case 'DELETE':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        
        const { error: deleteError } = await supabase
          .from('students')
          .delete()
          .eq('id', id);
        
        if (deleteError) throw deleteError;
        return response.status(200).json({ message: 'Deleted' });

      default:
        return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
