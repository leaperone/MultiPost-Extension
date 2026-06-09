export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
} as const;

export function preflightResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function withCors(response: Response) {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
