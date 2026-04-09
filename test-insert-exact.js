import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Creating Supabase client...');
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'apikey': supabaseServiceRoleKey,
      'Authorization': `Bearer ${supabaseServiceRoleKey}`
    }
  }
});

console.log('Supabase client created');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key:', supabaseServiceRoleKey.substring(0, 30) + '...');
console.log('Client headers:', supabase.rest.headers);

async function testInsert() {
  console.log('\n🧪 Testing INSERT operation...');
  
  const newStudent = { 
    id: 'test_' + Date.now(), 
    name: 'Test Student',
    age: 10,
    parent_name: 'Test Parent',
    parent_phone: '1234567890',
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
    console.error('❌ Insert failed:', insertError);
  } else {
    console.log('✅ Insert successful:', insertedStudent);
  }
}

testInsert().catch(console.error);