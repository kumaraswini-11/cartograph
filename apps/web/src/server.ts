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
    try {
      return await handler.fetch(request, opts)
    } catch (error) {
      // An error the app didn't answer is answered here, by Start, outside
      // the request middleware: the security headers go on that response
      // too (spec 012, FR-004). Start's catch, kept as it advises.
      return withSecurityHeaders(handleStartError(error), newNonce())
    }
  },
})
