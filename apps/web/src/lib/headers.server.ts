import "@tanstack/react-start/server-only"

import { getServerEnv } from "./env.server"
import { STATIC_HEADERS, contentSecurityPolicy } from "./headers"

export { newNonce } from "./headers"

/**
 * A response with the security headers (spec 012, FR-004, D-04), the
 * policy with this response's nonce among them. A built app gets the
 * policy; Vite's development server doesn't, as its own inline scripts and
 * HMR socket carry no nonce. The response is copied, as a redirect's
 * headers can't be changed.
 */
export function withSecurityHeaders(
  response: Response,
  nonce: string
): Response {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(STATIC_HEADERS)) {
    headers.set(name, value)
  }
  if (import.meta.env.PROD) {
    const env = getServerEnv()
    headers.set(
      "Content-Security-Policy",
      contentSecurityPolicy(nonce, {
        clerkPublishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
        supabaseUrl: env.VITE_SUPABASE_URL,
        posthogHost: env.VITE_POSTHOG_HOST,
      })
    )
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
