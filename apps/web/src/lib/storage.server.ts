// The marker makes TanStack Start refuse to import this file into the
// browser bundle, as for env.server.ts.
import "@tanstack/react-start/server-only"

import { auth } from "@clerk/tanstack-react-start/server"

import { getServerEnv } from "./env.server"
import { storageClient } from "./storage"

/**
 * Storage for this request, as the signed-in person: their token, from the
 * session Clerk's middleware verified, goes with every request (FR-013).
 * Called inside a server function or handler, never at module scope.
 */
export function requestStorage() {
  const env = getServerEnv()
  return storageClient({
    url: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    getToken: async () => (await auth()).getToken(),
  })
}
