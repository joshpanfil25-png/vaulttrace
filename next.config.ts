import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

// Content Security Policy
// next/font/google self-hosts fonts under /_next/static/media/, so font-src 'self' is correct.
// Next.js App Router injects inline hydration scripts, so script-src needs 'unsafe-inline'.
// 'unsafe-eval' is only included in development (webpack hot-reload uses eval).
const ContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy',        value: ContentSecurityPolicy },
  { key: 'X-Frame-Options',                value: 'DENY' },
  { key: 'X-Content-Type-Options',         value: 'nosniff' },
  { key: 'Referrer-Policy',                value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control',         value: 'on' },
  { key: 'Permissions-Policy',             value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  // pdfkit reads font AFM files from the filesystem at runtime;
  // mark it external so Next.js/Turbopack does not attempt to bundle it.
  serverExternalPackages: ['pdfkit'],

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
