import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.use(express.static(join(__dirname, '../public')));

import { getSupabaseClient } from './src/api/supabase.js';

console.log('Supabase client loaded:', getSupabaseClient());

app.post('/api/students', async (req, res) => {
  console.log('\n🎯 POST /api/students called directly');
  console.log('Request body:', req.body);
  
  try {
    const supabase = getSupabaseClient();
    console.log('Supabase key:', supabase.supabaseKey.substring(0, 30) + '...');
    
    const newStudent = { 
      id: 's' + Date.now(), 
      ...req.body,
      enrollment_date: req.body.enrollment_date || req.body.join_date || new Date().toISOString().split('T')[0],
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
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }
    
    return res.status(201).json(insertedStudent);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/students', async (req, res) => {
  console.log('\n🎯 GET /api/students called directly');
  
  try {
    const supabase = getSupabaseClient();
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return res.status(200).json(students || []);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${join(__dirname, '../public')}`);
  console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api/*\n`);
});