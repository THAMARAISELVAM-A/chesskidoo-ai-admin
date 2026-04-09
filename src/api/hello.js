import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
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
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {

    const [studentsRes, coachesRes, achievementsRes, eventsRes] = await Promise.all([
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('coaches').select('*').order('created_at', { ascending: false }),
      supabase.from('achievements').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('created_at', { ascending: false })
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (coachesRes.error) throw coachesRes.error;
    if (achievementsRes.error) throw achievementsRes.error;
    if (eventsRes.error) throw eventsRes.error;

    return response.status(200).json({
      students: studentsRes.data || [],
      coaches: coachesRes.data || [],
      achievements: achievementsRes.data || [],
      events: eventsRes.data || [],
      message: 'Hello from Chesskidoo API!'
    });
  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
