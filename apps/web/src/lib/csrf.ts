/** The chat's route (spec 010): a `POST` that spends model calls. */
const CHAT_PATH = /^\/api\/analyses\/[^/]+\/chat$/

/**
 * What the CSRF middleware checks (spec 006 plan D-03, spec 010 plan
 * D-03): every server function, and the chat route's `POST`, each answered
 * only for a request from this site. Clerk's webhook is left out: Clerk
 * calls it from its own servers, and its signature is what's trusted.
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
  (request.method === "POST" && CHAT_PATH.test(pathname))
