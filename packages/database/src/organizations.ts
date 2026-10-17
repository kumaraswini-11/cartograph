import { createClient } from "@supabase/supabase-js"

import type { Database } from "./database.types.ts"

/** Where storage is, with its secret key, which row-level access doesn't bind. */
export type SecretAccess = { url: string; secretKey: string }

/**
 * Deletes an organization's row and, through every table's reference to
 * it, every row the organization owns (spec 007, FR-002, plan D-04, D-07).
 * For the identity provider's notice that an organization was deleted, a
 * request no signed-in person makes, so no token for a policy to read: the
 * secret key is the one way in, and the client it makes is made here and
 * never handed out, so nothing else can use it. With no user token on the
 * request, the key bypasses row-level access, as Supabase documents. A
 * repeated or late notice deletes nothing more (the spec's edge cases).
 * The filter names the organization being deleted; it decides what's
 * deleted, not what anyone reads (C-02).
 */
export async function deleteOrganization(
  { url, secretKey }: SecretAccess,
  organizationId: string
): Promise<void> {
  const secret = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await secret
    .from("organizations")
    .delete()
    .eq("id", organizationId)
  if (error) {
    throw new Error(
      `Couldn't delete organization ${organizationId}: ${error.message}`
    )
  }
}
