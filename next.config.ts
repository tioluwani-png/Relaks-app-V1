import type { NextConfig } from "next";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Landing photo slots present at build time (see src/lib/landing/images.ts).
// Checked here because public/ isn't on the serverless filesystem when ISR re-renders.
const landingDir = join(process.cwd(), "public", "landing");
const landingImages = existsSync(landingDir) ? readdirSync(landingDir).join(",") : "";

const nextConfig: NextConfig = {
  env: {
    LANDING_IMAGES: landingImages,
  },
  // The hero coloring page SVG is read with fs at render time (src/lib/landing/hero-art.ts)
  outputFileTracingIncludes: {
    "/": ["./public/landing/*.svg"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'irlpqrbhogdvdpfijipo.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://checkout.paystack.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://oaidalleapiprodscus.blob.core.windows.net https://*.blob.core.windows.net https://checkout.paystack.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paystack.co https://checkout.paystack.com https://api.openai.com",
              "frame-src 'self' https://js.paystack.co https://checkout.paystack.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
