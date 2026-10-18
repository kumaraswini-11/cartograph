import handler, { createServerEntry } from "@tanstack/react-start/server-entry"
import { handleStartError } from "@tanstack/react-start/server"

import { getServerEnv } from "@/lib/env.server"
import { newNonce, withSecurityHeaders } from "@/lib/headers.server"

// Validate configuration once, when the server starts: a missing or invalid
// value stops it here with every problem named (spec 000, FR-011), rather
// than surfacing later as a confusing error. This runs at module load, which
// is right for a Node.js host (docs/adr/0002); an edge runtime, where env
// arrives per request, would need this moved into fetch().
getServerEnv()

export default createServerEntry({
  async fetch(request, opts) {
    let response: Response
    try {
      response = await handler.fetch(request, opts)
    } catch (error) {
      // An error nothing answered: Start's own response, as it advises.
      response = handleStartError(error)
    }
    // Start makes some responses after the request middleware has finished:
    // a thrown Response (a redirect), a server function's failure, in the
    // form its browser half reads, or the error above. Those get the
    // security headers here (spec 012, FR-004); the middleware's own carry
    // them already, with the nonce the page was rendered with.
    return response.headers.has("X-Content-Type-Options")
      ? response
      : withSecurityHeaders(response, newNonce())
  },
})
