import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing auth role...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseServiceRoleKey.substring(0, 30) + '...');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testAuth() {
  try {
    // Test with a simple query that checks auth role
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .limit(1);
    
    console.log('\nSELECT result:', { data, error });
    
    // Try to get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('\nAuth user:', { user, userError });
    
    // Try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('\nAuth session:', { session, sessionError });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAuth();