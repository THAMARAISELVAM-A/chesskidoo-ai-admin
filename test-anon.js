import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('Testing with anon key...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey.substring(0, 30) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnon() {
  try {
    console.log('\n1. Testing SELECT...');
    const { data: students, error: selectError } = await supabase
      .from('students')
      .select('*');
    
    console.log('SELECT result:', { count: students?.length, error: selectError });

    console.log('\n2. Testing INSERT...');
    const testStudent = {
      id: 'test_anon_' + Date.now(),
      name: 'Test Anon Student',
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

    console.log('INSERT result:', { data: insertedStudent, error: insertError });

    if (insertedStudent) {
      console.log('\n3. Cleaning up test record...');
      await supabase.from('students').delete().eq('id', testStudent.id);
      console.log('✅ Cleanup successful');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testAnon();