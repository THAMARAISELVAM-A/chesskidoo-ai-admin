import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  console.log('\n🎯 Students API called:', request.method);
  console.log('📦 Request body:', JSON.stringify(request.body, null, 2));
  
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
        const { level, join_date, ...studentData } = request.body;
        const newStudent = { 
          id: 's' + Date.now(), 
          ...studentData,
          grade: level || studentData.grade || null,
          enrollment_date: studentData.enrollment_date || join_date || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Request body:', request.body);
        console.log('Student data after destructuring:', studentData);
        console.log('New student to insert:', newStudent);
        console.log('Supabase client:', supabase);
        console.log('Supabase key:', supabase.supabaseKey.substring(0, 30) + '...');
        
        const { data: insertedStudent, error: insertError } = await supabase
          .from('students')
          .insert(newStudent)
          .select()
          .single();
        
        console.log('Insert result:', { data: insertedStudent, error: insertError });
        
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
