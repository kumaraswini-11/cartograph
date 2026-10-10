import type { NextConfig } from "next";

// Importing env validates every variable when the config loads, so a build
// with a missing or malformed value fails before anything ships.
import { clerkFrontendApiHost, env } from "./env";

const isDev = process.env.NODE_ENV === "development";
// Vercel Toolbar / Comments run on preview deployments only.
// https://vercel.com/docs/vercel-toolbar/managing-toolbar#using-a-content-security-policy
const isVercelPreview = process.env.VERCEL_ENV === "preview";
const vercelLive = isVercelPreview ? ["https://vercel.live"] : [];

// Each environment's exact Clerk Frontend API host (dev:
// <slug>.clerk.accounts.dev, prod: clerk.<domain>), decoded from the validated
// publishable key, so the CSP needs no wildcard. Headers are computed when the
// config loads (build time on Vercel), so a key change needs a rebuild. CI
// skips validation and has no key, so it gets no Clerk host. If NEXT_PUBLIC_CLERK_DOMAIN
// or NEXT_PUBLIC_CLERK_PROXY_URL is ever set, the Frontend API host changes
// and this derivation must follow it.
// https://clerk.com/docs/guides/secure/best-practices/csp-headers
const clerkPublishableKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkHost = clerkFrontendApiHost(clerkPublishableKey);
const clerkFrontendApi = clerkHost ? [`https://${clerkHost}`] : [];
// Dev instances send telemetry; production instances don't.
const clerkTelemetry = clerkPublishableKey.startsWith("pk_test_")
  ? ["https://clerk-telemetry.com", "https://*.clerk-telemetry.com"]
  : [];
// Bot protection on sign-up runs Cloudflare Turnstile in an iframe.
const clerkBotProtection = [
  "https://challenges.cloudflare.com",
  "https://*.protect.clerk.com",
];

// Static CSP ("Without Nonces" pattern). Nonce-based CSP forces dynamic
// rendering and is incompatible with Cache Components / Partial Prerendering.
// See node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  // 'unsafe-eval' is only needed in dev (React debugging), never in production.
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    ...vercelLive,
    ...clerkFrontendApi,
    ...clerkBotProtection,
  ],
  "style-src": ["'self'", "'unsafe-inline'", ...vercelLive],
  "img-src": [
    "'self'",
    "blob:",
    "data:",
    ...(isVercelPreview ? ["https://vercel.live", "https://vercel.com"] : []),
    "https://img.clerk.com",
  ],
  "font-src": [
    "'self'",
    ...(isVercelPreview
      ? ["https://vercel.live", "https://assets.vercel.com"]
      : []),
  ],
  "connect-src": [
    "'self'",
    ...(isVercelPreview
      ? ["https://vercel.live", "wss://ws-us3.pusher.com"]
      : []),
    ...clerkFrontendApi,
    "https://*.protect.clerk.com:*",
    ...clerkTelemetry,
  ],
  "frame-src": ["'self'", ...vercelLive, ...clerkBotProtection],
  // Clerk runs a web worker from a blob: URL.
  "worker-src": ["'self'", "blob:"],
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
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
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
