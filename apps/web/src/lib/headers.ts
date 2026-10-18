import { parsePublishableKey } from "@clerk/shared/keys"

// The security headers every response is sent with (spec 012, FR-004,
// FR-005, C-02, plan D-03, D-04). One list of sources, each exact, built
// from the configured addresses; the one wildcard is Clerk Protect's.

/** Cloudflare's bot check, which Clerk's sign-in loads and frames. */
const CLOUDFLARE_CHALLENGES = "https://challenges.cloudflare.com"

/** Where Clerk serves profile images. */
const CLERK_IMAGES = "https://img.clerk.com"

/**
 * Clerk Protect, its fraud protection, on for every Clerk application
 * (Device Intelligence). Its script comes from cdn.protect.clerk.com, then
 * probes a subdomain of client.protect.clerk.com made for the session, on
 * several ports, so no exact list can name them: the one wildcard C-02
 * allows, as Clerk's CSP guide gives it (plan D-03).
 */
export const CLERK_PROTECT = "https://*.protect.clerk.com"

/** Clerk Protect's probes, on any port (Clerk: "The trailing :* is required"). */
export const CLERK_PROTECT_ANY_PORT = `${CLERK_PROTECT}:*`

/** The addresses the policy is built from. */
export type PolicySources = {
  /** Clerk's publishable key: its frontend API's host is inside it. */
  clerkPublishableKey: string
  /** Storage's address: its data API, and Realtime over a WebSocket. */
  supabaseUrl: string
  /** PostHog's ingestion address, when error reports are on. */
  posthogHost?: string
}

/** Clerk's frontend API, as an origin, from its publishable key. */
export function clerkFrontendApi(publishableKey: string): string {
  const { frontendApi } = parsePublishableKey(publishableKey, { fatal: true })
  return `https://${frontendApi}`
}

/** An address's origin, and the WebSocket origin its Realtime answers on. */
function withWebSocket(url: string): Array<string> {
  const { origin, protocol, host } = new URL(url)
  return [origin, `${protocol === "https:" ? "wss" : "ws"}://${host}`]
}

/**
 * The content security policy for one response (FR-005, D-03). Scripts
 * come from this origin, Clerk's frontend API and Cloudflare's challenge,
 * or are inline with this response's `nonce`: the router's and the
 * theme's. Styles may be inline, the one exception: Clerk's components
 * write theirs at run time, and React writes style attributes.
 */
export function contentSecurityPolicy(
  nonce: string,
  sources: PolicySources
): string {
  const clerk = clerkFrontendApi(sources.clerkPublishableKey)
  const directives: Record<string, Array<string>> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      clerk,
      CLERK_PROTECT,
      CLOUDFLARE_CHALLENGES,
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Clerk's components draw some images as data: SVGs; an image can't
    // run script, so data: is allowed here alone.
    "img-src": ["'self'", "data:", CLERK_IMAGES],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      clerk,
      CLERK_PROTECT_ANY_PORT,
      ...withWebSocket(sources.supabaseUrl),
      ...(sources.posthogHost === undefined
        ? []
        : [new URL(sources.posthogHost).origin]),
    ],
    // Clerk runs a worker from a blob it makes (its CSP guide).
    "worker-src": ["'self'", "blob:"],
    "frame-src": [CLERK_PROTECT, CLOUDFLARE_CHALLENGES],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    // No other site may frame Cartograph (FR-005).
    "frame-ancestors": ["'none'"],
  }
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ")
}

/**
 * Every header but the policy (FR-004): sent in development too, where
 * Vite's own inline scripts would break under the policy.
 */
export const STATIC_HEADERS: Readonly<Record<string, string>> = {
  // Two years, as browsers' preload lists ask; ignored over plain HTTP.
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // For browsers that predate frame-ancestors.
  "X-Frame-Options": "DENY",
  // Nothing Cartograph uses, so nothing it allows.
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
}

/** A nonce for one response: 128 random bits, as the CSP spec asks. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}
