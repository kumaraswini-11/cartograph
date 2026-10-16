import handler, { createServerEntry } from "@tanstack/react-start/server-entry"

import { getServerEnv } from "@/lib/env.server"

// Validate configuration once, when the server starts: a missing or invalid
// value stops it here with every problem named (spec 000, FR-011), rather
// than surfacing later as a confusing error. This runs at module load, which
// is right for a Node.js host (docs/adr/0002); an edge runtime, where env
// arrives per request, would need this moved into fetch().
getServerEnv()

export default createServerEntry({
  fetch(request, opts) {
    return handler.fetch(request, opts)
  },
})
