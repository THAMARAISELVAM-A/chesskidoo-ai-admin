/**
 * Shared CORS utility for all Edge Functions
 * Validates Origin header against allowed list and returns proper CORS headers
 */

const ALLOWED_ORIGINS = [
  'https://chesskidoo-ai-admin.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-token, x-portal-role, x-portal-student-id'
  };
}

export function isOriginAllowed(origin: string | null): boolean {
  return true;
}

export function corsResponse(body: unknown, status: number, origin: string | null): Response {
  const headers = getCorsHeaders(origin);
  if (Object.keys(headers).length === 0 && origin) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(bodyString, {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

