import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const app = express();
const PORT = 5002;

app.use(cors());
app.use(express.json());

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

app.post('/test', async (req, res) => {
  console.log('Test endpoint hit!');
  console.log('Request body:', req.body);
  
  try {
    const newStudent = { 
      id: 'test_' + Date.now(), 
      name: req.body.name,
      age: req.body.age,
      parent_name: req.body.parent_name,
      parent_phone: req.body.parent_phone,
      enrollment_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Inserting student:', newStudent);
    
    const { data: insertedStudent, error: insertError } = await supabase
      .from('students')
      .insert(newStudent)
      .select()
      .single();
    
    console.log('Insert result:', { data: insertedStudent, error: insertError });
    
    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }
    
    res.json(insertedStudent);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running at http://localhost:${PORT}`);
});