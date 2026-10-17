import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "./database.types.ts"

/** Where storage is, and how a request proves who's asking. */
export type StorageAccess = {
  url: string
  publishableKey: string
  /** The signed-in person's session token, or null when signed out. */
  getToken: () => Promise<string | null>
}

/** A storage client, its queries typed by the schema the migrations build. */
export type StorageClient = SupabaseClient<Database>

/**
 * The one way to make a storage client (spec 006, FR-013): every request
 * carries the signed-in person's token, so the policies read its
 * organization claim (spec 007, FR-003). With the token supplied this way,
 * Supabase's own sign-in can't be used on the client, so there is one
 * session system (spec 006, C-03). Without a token, a request fails here
 * instead of going out on the publishable key alone, where the policies
 * would answer with nothing and hide the mistake (spec 006, C-04).
 */
export function storageClient({
  url,
  publishableKey,
  getToken,
}: StorageAccess): StorageClient {
  return createClient<Database>(url, publishableKey, {
    accessToken: async () => {
      const token = await getToken()
      if (token === null) throw new Error(NO_TOKEN)
      return token
    },
  })
}

/** Why a request without a signed-in person's token isn't sent. */
export const NO_TOKEN =
  "Storage needs the signed-in person's token; none was given (spec 006, FR-013)."
