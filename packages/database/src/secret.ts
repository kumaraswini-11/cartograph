import { createClient } from "@supabase/supabase-js"

import type { StorageClient } from "./client.ts"
import type { Database } from "./database.types.ts"

/** Where storage is, with its secret key, which row-level access doesn't bind. */
export type SecretAccess = { url: string; secretKey: string }

/**
 * A client with the secret key, for the requests no signed-in person makes:
 * an organization's deletion (spec 007, D-07) and a run's writes after the
 * response (spec 008, D-06). With no user token on the request, the key
 * bypasses row-level access, as Supabase documents, so this module is
 * internal: each caller in this package wraps it in functions that each
 * take the organization or run they act on, and the client itself is
 * never handed out.
 */
export function secretClient({ url, secretKey }: SecretAccess): StorageClient {
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
