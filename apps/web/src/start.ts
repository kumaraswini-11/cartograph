import { clerkMiddleware } from "@clerk/tanstack-react-start/server"
import { isNotFound, isRedirect } from "@tanstack/react-router"
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start"

import { csrfChecks } from "@/lib/csrf"
import { SIGN_IN_PATH } from "@/lib/sign-in"

/**
 * Every response's security headers (spec 012, FR-004, D-04), outermost,
 * so a refusal or a redirect from the middleware inside gets them too. The
 * nonce goes into the request's context, where the router reads it for
 * its own inline scripts (src/router.tsx). Loaded here, on the server, so
 * none of it reaches the browser's bundle.
 */
const securityHeaders = createMiddleware().server(async ({ next }) => {
  const { newNonce, withSecurityHeaders } = await import("@/lib/headers.server")
  const nonce = newNonce()
  const result = await next({ context: { nonce } })
  return { ...result, response: withSecurityHeaders(result.response, nonce) }
})

// TanStack Start adds its own CSRF protection only while this file doesn't
// exist, so it's added back here, the first check (spec 006 plan D-03): a
// server function, or the chat's POST, is answered only for a request from
// this site.
const csrfMiddleware = createCsrfMiddleware({ filter: csrfChecks })

/**
 * Runs `next`, reporting what it throws (spec 012, FR-001) before throwing
 * it on. A redirect or a not-found is how a page answers, not a failure.
 * Telemetry is loaded here, on the server: this callback never reaches the
 * browser's bundle.
 */
async function reportingErrors<T>(next: () => T): Promise<Awaited<T>> {
  try {
    return await next()
  } catch (error) {
    if (!isRedirect(error) && !isNotFound(error)) {
      const { reportError } = await import("@/lib/telemetry.server")
      await reportError(error)
    }
    throw error
  }
}

/** Every page's and server route's unhandled errors. */
const requestErrors = createMiddleware().server(({ next }) =>
  reportingErrors(() => next())
)

/**
 * Every server function's: Start answers a function's error itself, so it
 * may never reach the request's middleware.
 */
const functionErrors = createMiddleware({ type: "function" }).server(
  ({ next }) => reportingErrors(() => next())
)

/**
 * Every request's middleware: the security headers, CSRF protection, then
 * Clerk's, which verifies the session token so `auth()` can read it (spec
 * 006, C-01), then error reports.
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [
    securityHeaders,
    csrfMiddleware,
    clerkMiddleware({ signInUrl: SIGN_IN_PATH }),
    requestErrors,
  ],
  functionMiddleware: [functionErrors],
}))
