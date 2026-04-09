import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl ? 'Loaded' : 'Missing');
console.log('Service Role Key:', supabaseServiceRoleKey ? 'Loaded' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  try {
    console.log('\n1. Testing SELECT...');
    const { data: students, error: selectError } = await supabase
      .from('students')
      .select('*');
    
    if (selectError) {
      console.error('SELECT Error:', selectError);
    } else {
      console.log('✅ SELECT successful. Found', students.length, 'students');
    }

    console.log('\n2. Testing INSERT...');
    const testStudent = {
      id: 'test_' + Date.now(),
      name: 'Test Student',
      age: 10,
      grade: '5th',
      phone: '9876543210',
      parent_name: 'Test Parent',
      parent_phone: '9876543211',
      address: 'Test Address',
      enrollment_date: '2024-01-01',
      status: 'active'
    };

    const { data: insertedStudent, error: insertError } = await supabase
      .from('students')
      .insert(testStudent)
      .select()
      .single();

    if (insertError) {
      console.error('❌ INSERT Error:', insertError);
      console.error('Error details:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ INSERT successful:', insertedStudent);
    }

    console.log('\n3. Testing DELETE...');
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', testStudent.id);

    if (deleteError) {
      console.error('❌ DELETE Error:', deleteError);
    } else {
      console.log('✅ DELETE successful');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConnection();