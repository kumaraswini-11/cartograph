import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Vercel Toolbar / Comments run on preview deployments only.
// https://vercel.com/docs/vercel-toolbar/managing-toolbar#using-a-content-security-policy
const isVercelPreview = process.env.VERCEL_ENV === "preview";
const vercelLive = isVercelPreview ? ["https://vercel.live"] : [];

// Static CSP ("Without Nonces" pattern). Nonce-based CSP forces dynamic
// rendering and is incompatible with Cache Components / Partial Prerendering.
// See node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  // 'unsafe-eval' is only needed in dev (React debugging), never in production.
  "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...vercelLive],
  "style-src": ["'self'", "'unsafe-inline'", ...vercelLive],
  "img-src": [
    "'self'",
    "blob:",
    "data:",
    ...(isVercelPreview ? ["https://vercel.live", "https://vercel.com"] : []),
  ],
  "font-src": [
    "'self'",
    ...(isVercelPreview ? ["https://vercel.live", "https://assets.vercel.com"] : []),
  ],
  "connect-src": [
    "'self'",
    ...(isVercelPreview ? ["https://vercel.live", "wss://ws-us3.pusher.com"] : []),
  ],
  "frame-src": ["'self'", ...vercelLive],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "upgrade-insecure-requests": [],
};

const cspHeader = Object.entries(cspDirectives)
  .map(([directive, sources]) => [directive, ...sources].join(" "))
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
