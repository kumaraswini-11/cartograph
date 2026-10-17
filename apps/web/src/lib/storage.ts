import { createClient } from "@supabase/supabase-js"

/** Where storage is, and how a request proves who's asking. */
export type StorageAccess = {
  url: string
  publishableKey: string
  /** The signed-in person's session token, or null when signed out. */
  getToken: () => Promise<string | null>
}

/**
 * The one way to make a storage client (spec 006, FR-013, plan D-08): every
 * request carries the signed-in person's Clerk token, so storage policies
 * read its organization claim (C-04). With the token supplied this way,
 * Supabase's own sign-in can't be used on the client, so there is one
 * session system, Clerk's (C-03). No table exists yet (C-05).
 */
export function storageClient({
  url,
  publishableKey,
  getToken,
}: StorageAccess) {
  return createClient(url, publishableKey, { accessToken: getToken })
}
