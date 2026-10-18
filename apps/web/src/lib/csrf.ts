/** Methods that only read: CSRF protects what changes or spends. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * Clerk's webhook, as the router matches it: paths match without regard to
 * case (TanStack Router's default) and with or without a trailing slash.
 */
const CLERK_WEBHOOK = /^\/api\/webhooks\/clerk\/?$/i

/**
 * What the CSRF middleware checks (spec 006 plan D-03, spec 010 plan
 * D-03): every server function, and every request to a route that isn't a
 * read, the chat's among them, each answered only for a request from this
 * site. Checking by method, not by path, can't miss a spelling the router
 * accepts, nor a route added later. Clerk's webhook is the one exception:
 * Clerk calls it from its own servers, and its signature is what's trusted.
 */
export const csrfChecks = ({
  handlerType,
  request,
  pathname,
}: {
  handlerType: string
  request: Request
  pathname: string
}) =>
  handlerType === "serverFn" ||
  (!SAFE_METHODS.has(request.method) && !CLERK_WEBHOOK.test(pathname))
