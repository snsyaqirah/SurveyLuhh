import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    // Nonce replaces unsafe-inline; no unsafe-eval
    `script-src 'self' 'nonce-${nonce}' https://www.google.com https://www.gstatic.com`,
    // Inline styles needed for Tailwind and framer-motion
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://www.google.com https://www.gstatic.com https://o4511411898548224.ingest.us.sentry.io",
    "frame-src https://www.google.com",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
