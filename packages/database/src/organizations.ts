import { secretClient } from "./secret.ts"
import type { SecretAccess } from "./secret.ts"

/**
 * Deletes an organization's row and, through every table's reference to
 * it, every row the organization owns (spec 007, FR-002, plan D-04, D-07).
 * For the identity provider's notice that an organization was deleted, a
 * request no signed-in person makes, so no token for a policy to read: the
 * secret key is the one way in. A repeated or late notice deletes nothing
 * more (the spec's edge cases). The filter names the organization being
 * deleted; it decides what's deleted, not what anyone reads (C-02).
 */
export async function deleteOrganization(
  access: SecretAccess,
  organizationId: string
): Promise<void> {
  const { error } = await secretClient(access)
    .from("organizations")
    .delete()
    .eq("id", organizationId)
  if (error) {
    throw new Error(
      `Couldn't delete organization ${organizationId}: ${error.message}`
    )
  }
}
