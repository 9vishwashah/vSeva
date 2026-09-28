// Shared CORS helper for Netlify Functions called from more than one origin:
// the production web app (https://vseva.vjas.in, same-origin — never actually
// hits this, but listed for clarity/defense-in-depth) and the Capacitor
// Android app, whose WebView requests originate from https://localhost since
// it loads the bundled dist/ (webDir) rather than the live site. No cookies
// are ever sent by any client call site (auth uses a Bearer token in the
// Authorization header), so Access-Control-Allow-Credentials is never needed
// and Allow-Origin is safe to echo back for an allow-listed origin only.
const ALLOWED_ORIGINS = new Set([
  'https://vseva.vjas.in',
  'https://localhost',
]);

const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

export function corsHeaders(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
  };
}

// Wraps a Netlify Function handler: answers CORS preflight OPTIONS requests
// directly, and merges the CORS headers onto whatever the wrapped handler
// returns, without touching its business logic, status codes, or body.
export function withCors(handler) {
  return async (event, context) => {
    const headers = corsHeaders(event);

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': ALLOWED_METHODS,
          'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        },
        body: '',
      };
    }

    const response = await handler(event, context);
    return {
      ...response,
      headers: {
        ...(response?.headers || {}),
        ...headers,
      },
    };
  };
}
