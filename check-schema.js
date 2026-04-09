import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function checkSchema() {
  console.log('Checking students table schema...\n');

  // Try to get one student to see the actual columns
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else if (students && students.length > 0) {
    console.log('Sample student data:', JSON.stringify(students[0], null, 2));
    console.log('\nAvailable columns:', Object.keys(students[0]));
  } else {
    console.log('No students found, table is empty');
  }
}

checkSchema().catch(console.error);