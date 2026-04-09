import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseClient } from './src/api/supabase.js';

console.log('Testing students API module...');
console.log('Supabase client:', getSupabaseClient());

const supabase = getSupabaseClient();

async function test() {
  try {
    const testStudent = {
      id: 'test_api_' + Date.now(),
      name: 'Test API Student',
      age: 10,
      grade: '5th',
      phone: '9876543210',
      parent_name: 'Test Parent',
      parent_phone: '9876543211',
      address: 'Test Address',
      enrollment_date: '2024-01-01',
      status: 'active'
    };

    console.log('Attempting INSERT...');
    const { data, error } = await supabase
      .from('students')
      .insert(testStudent)
      .select()
      .single();

    if (error) {
      console.error('❌ INSERT Error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ INSERT successful:', data);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();