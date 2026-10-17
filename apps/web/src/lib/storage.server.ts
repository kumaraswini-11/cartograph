// The marker makes TanStack Start refuse to import this file into the
// browser bundle, as for env.server.ts.
import "@tanstack/react-start/server-only"

import { auth } from "@clerk/tanstack-react-start/server"

import { getServerEnv } from "./env.server"
import { NO_TOKEN, storageClient } from "./storage"

/**
 * Storage for this request, as the signed-in person: their token, from the
 * session Clerk's middleware verified, goes with every request (FR-013).
 * Signed out, it fails here, before a client exists: no request is made,
 * and none is retried. Called inside a server function or handler, never
 * at module scope.
 */
export async function requestStorage() {
  const { getToken } = await auth()
  if ((await getToken()) === null) throw new Error(NO_TOKEN)
  const env = getServerEnv()
  return storageClient({
    url: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    getToken,
  })
}
