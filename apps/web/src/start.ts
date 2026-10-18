import { clerkMiddleware } from "@clerk/tanstack-react-start/server"
import { createCsrfMiddleware, createStart } from "@tanstack/react-start"

import { csrfChecks } from "@/lib/csrf"
import { SIGN_IN_PATH } from "@/lib/sign-in"

// TanStack Start adds its own CSRF protection only while this file doesn't
// exist, so it's added back here, first (spec 006 plan D-03): a server
// function, or the chat's POST, is answered only for a request from this
// site.
const csrfMiddleware = createCsrfMiddleware({ filter: csrfChecks })

/**
 * Every request's middleware: CSRF protection, then Clerk's, which verifies
 * the session token so `auth()` can read it (spec 006, C-01).
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [
    csrfMiddleware,
    clerkMiddleware({ signInUrl: SIGN_IN_PATH }),
  ],
}))
