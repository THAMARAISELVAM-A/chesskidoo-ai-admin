const ALLOWED_ORIGINS = [
  'https://chesskidoo-ai-admin.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin) {
    return {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    };
  }

  const allowed = ALLOWED_ORIGINS.includes(origin);
  if (!allowed) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

export function corsResponse(body: string, status: number, origin: string | null): Response {
  const headers = getCorsHeaders(origin);
  if (Object.keys(headers).length === 0 && origin) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response(body, {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}
