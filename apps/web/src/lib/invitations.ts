// Inviting someone into the current organization (spec 006, FR-007 to
// FR-009): who may, and what to say when it can't be done.
import type { Session, SignedInSession } from "./session"

export type InvitationResult = { sent: true } | { sent: false; reason: string }

export const ONLY_ADMINS = "Only an admin of this organization can invite."

/**
 * The session that may invite, or why this one can't: signed in, and an
 * admin of the current organization (FR-007, FR-009). Checked by the
 * server function itself, since a route guard doesn't protect it.
 */
export function inviterFrom(
  session: Session
): { inviter: SignedInSession } | { refused: string } {
  if (!session.signedIn) return { refused: "Sign in to invite someone." }
  if (!session.organization.admin) return { refused: ONLY_ADMINS }
  return { inviter: session }
}

/**
 * A sentence for an invitation the identity provider refused, by its error
 * code (as returned on the development instance, plan T03); any other code
 * reads as a failure to try again.
 */
export function refusalReason(code: string | undefined): string {
  switch (code) {
    case "already_a_member_in_organization":
      return "They're already a member of this organization."
    case "form_param_format_invalid":
      return "Enter a valid email address."
    case "missing_organization_permission":
      return ONLY_ADMINS
    default:
      return "The invitation couldn't be sent. Try again in a moment."
  }
}
