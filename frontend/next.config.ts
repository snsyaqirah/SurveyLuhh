import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js inline scripts + reCAPTCHA
      "script-src 'self' https://www.google.com https://www.gstatic.com 'unsafe-inline' 'unsafe-eval'",
      // Tailwind inline styles + Google Fonts
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
      // Property images come from any HTTPS source
      "img-src 'self' data: https:",
      // API calls + reCAPTCHA network requests
      "connect-src 'self' https://www.google.com https://www.gstatic.com",
      // reCAPTCHA iframe
      "frame-src https://www.google.com",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
