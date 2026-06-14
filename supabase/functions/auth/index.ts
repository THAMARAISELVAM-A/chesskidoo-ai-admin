import { checkRateLimit } from './rate_limit.js';

Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  function base64UrlEncode(input: string | Uint8Array) {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
    let binary = ''
    bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  async function signPortalToken(payload: Record<string, unknown>) {
    const secret = Deno.env.get('PORTAL_AUTH_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'dev-portal-auth-secret'
    const header = { alg: 'HS256', typ: 'JWT' }
    const encodedHeader = base64UrlEncode(JSON.stringify(header))
    const encodedPayload = base64UrlEncode(JSON.stringify(payload))
    const signingInput = `${encodedHeader}.${encodedPayload}`
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
    return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`
  }

  function portalResponse(body: Record<string, unknown>, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
        ...headers,
      },
    })
  }
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-portal-token, x-portal-role, x-portal-student-id',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }

  // Check rate limit
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             req.headers.get('cf-connecting-ip') ||
             'unknown';
  const rateLimitResult = await checkRateLimit(ip, 'auth');
  
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ 
      error: 'Rate limit exceeded',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    }), { 
      status: 429, 
      headers: { 
        'Content-Type': 'application/json', 
        ...corsHeaders,
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
      } 
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, username, password } = body;

    if (action !== 'login') {
      return new Response(JSON.stringify({ error: 'Unknown action' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    // 1. Check Hardcoded Admin/Master from .env (Stabilization Fallback)
    const masterUser = Deno.env.get('MASTER_USERNAME');
    const masterPass = Deno.env.get('MASTER_PASSWORD');
    const adminUser = Deno.env.get('ADMIN_USERNAME');
    const adminPass = Deno.env.get('ADMIN_PASSWORD');

    // Debug log for server-side troubleshooting
    console.log(`Login attempt for: ${username}`);

    if (masterUser && masterPass && String(username) === String(masterUser) && String(password) === String(masterPass)) {
      console.log("Master login successful");
      const portalToken = await signPortalToken({
        role: 'master',
        user: masterUser,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
      })
      return portalResponse({
        success: true,
        token: 'master-token-' + Date.now(),
        portal_token: portalToken,
        role: 'master',
        user: masterUser
      });
    }

    if (adminUser && adminPass && String(username) === String(adminUser) && String(password) === String(adminPass)) {
      console.log("Admin login successful");
      const portalToken = await signPortalToken({
        role: 'admin',
        user: adminUser,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
      })
      return portalResponse({
        success: true,
        token: 'admin-token-' + Date.now(),
        portal_token: portalToken,
        role: 'admin',
        user: adminUser
      });
    }

    // 2. Check Supabase Auth (Built-in users from Dashboard)
    // This is the secure way to handle Admin/Master access
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (!authError && authData.user) {
      // Enforce explicit role metadata - Fix #25
      const userRole = authData.user.user_metadata?.role;
      if (!userRole) {
        return new Response(JSON.stringify({ error: 'Access denied: No role assigned in metadata.' }), { 
          status: 403, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
      
      const portalToken = await signPortalToken({
        role: userRole,
        user_id: authData.user.id,
        user: authData.user.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
      })
      return portalResponse({
        success: true,
        token: authData.session?.access_token || 'session-' + Date.now(),
        portal_token: portalToken,
        role: userRole,
        user: authData.user.email
       });
    }

    // 4. Check parent credentials (username = student name, password = parent phone)
    const cleanUsername = String(username).trim();
    const inputDigits = String(password).replace(/\D/g, '');
    
    console.log(`[Auth] Checking parent credentials. Name: "${cleanUsername}", Phone digits: "${inputDigits}"`);

    let { data: students, error: studentError } = await supabase
      .from('students_decrypted')
      .select('id, name, parent_phone, phone')
      .or(`name.ilike.%${cleanUsername}%,name.ilike.${cleanUsername}`);

    if (studentError) {
      console.warn('[Auth] decrypted view query failed, trying raw students table:', studentError.message);
      const fallbackRes = await supabase
        .from('students')
        .select('id, name, parent_phone, phone')
        .or(`name.ilike.%${cleanUsername}%,name.ilike.${cleanUsername}`);
      
      if (!fallbackRes.error) {
        students = fallbackRes.data;
      } else {
        console.error('[Auth] Fallback query to students table failed:', fallbackRes.error.message);
      }
    }

    if (students && students.length > 0) {
      console.log(`[Auth] Found ${students.length} matching student records. Verifying phone numbers.`);
      const matchedStudent = students.find(s => {
        const pDigits = s.parent_phone ? String(s.parent_phone).replace(/\D/g, '') : '';
        const fDigits = s.phone ? String(s.phone).replace(/\D/g, '') : '';
        
        console.log(`[Auth] Verifying "${s.name}" (parent_phone="${pDigits}", student_phone="${fDigits}") against input="${inputDigits}"`);
        
        if (inputDigits.length >= 8) {
          if (pDigits.length >= 8 && (pDigits.endsWith(inputDigits) || inputDigits.endsWith(pDigits))) return true;
          if (fDigits.length >= 8 && (fDigits.endsWith(inputDigits) || inputDigits.endsWith(fDigits))) return true;
        }
        if (inputDigits && (inputDigits === pDigits || inputDigits === fDigits)) return true;
        return false;
      });

      if (matchedStudent) {
        console.log(`[Auth] Successful parent login for student: ${matchedStudent.name}`);
        const portalToken = await signPortalToken({
          role: 'parent',
          user: matchedStudent.name,
          student_id: matchedStudent.id,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
        })
        return portalResponse({
          success: true,
          token: 'parent-token-' + Date.now(),
          portal_token: portalToken,
          role: 'parent',
          student_id: matchedStudent.id,
          user: matchedStudent.name
        });
      } else {
        console.log(`[Auth] No phone match among candidate students.`);
      }
    } else {
      console.log(`[Auth] No student records matched name "${cleanUsername}".`);
    }

// Failed attempt - check if we can suggest parent contact registration
     const canRegisterParent = students && students.length > 0 && !authError;
     const studentIds = (students || []).map(s => s.id).join(',');
     return new Response(JSON.stringify({ 
       error: 'Invalid credentials.',
       details: authError ? authError.message : 'Check if user exists in Supabase Auth or as a Student Name + Parent Phone.',
       can_register_parent: canRegisterParent,
       student_ids: canRegisterParent ? studentIds : undefined
     }), { 
       status: 401, 
       headers: { 
         'Content-Type': 'application/json', 
         ...corsHeaders,
         'X-RateLimit-Limit': String(rateLimitResult.limit),
         'X-RateLimit-Remaining': String(rateLimitResult.remaining),
         'X-RateLimit-Reset': String(rateLimitResult.resetTime)
       } 
     });
   } catch (error) {
     console.error('Auth error:', error.message);
     return new Response(JSON.stringify({ error: 'Internal server error' }), { 
       status: 500, 
       headers: { 'Content-Type': 'application/json', ...corsHeaders } 
     });
   }
 });

