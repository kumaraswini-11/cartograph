// The marker makes TanStack Start refuse to import this file into the
// browser bundle, as for env.server.ts.
import "@tanstack/react-start/server-only"

import { auth } from "@clerk/tanstack-react-start/server"

import { getServerEnv } from "./env.server"
import { NO_TOKEN, runWriter, storageClient } from "@workspace/database"

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
    url: env.VITE_SUPABASE_URL,
    publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
    getToken,
  })
}

/**
 * The writer for runs, with the secret key (spec 008, plan D-06): for a
 * server function that has already read the organization from the verified
 * session, and for the run it starts after the response.
 */
export function serverRunWriter() {
  const env = getServerEnv()
  return runWriter({
    url: env.VITE_SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  })
}
