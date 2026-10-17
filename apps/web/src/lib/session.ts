// The signed-in person and their current organization, read from the
// session token's claims alone (spec 006, C-01, FR-011, FR-012).

/** The current organization, as the token carries it. */
export type CurrentOrganization = {
  id: string
  /** The `org_name` custom claim (plan D-04). */
  name: string
  /** Whether they're its admin: the only one who invites (FR-007, FR-009). */
  admin: boolean
}

export type Session =
  | { signedIn: false }
  | { signedIn: true; userId: string; organization: CurrentOrganization }

/** The parts of Clerk's auth object a session is read from. */
export type AuthClaims = {
  isAuthenticated: boolean
  userId: string | null
  orgId?: string | null
  orgRole?: string | null
  sessionClaims?: { org_name?: string } | null
}

/** The admin role, Clerk's default (FR-009). */
export const ADMIN_ROLE = "org:admin"

/**
 * The session from the token's claims. A session with no organization
 * chosen is pending, which Clerk reports as signed out, so the person goes
 * back to sign-in to choose one (spec edge cases, plan D-07). A signed-in
 * token without the organization or its name is a misconfigured instance,
 * not a signed-out person: it throws, since sending them to sign-in would
 * only send them back here.
 */
export function sessionFromClaims(auth: AuthClaims): Session {
  if (!auth.isAuthenticated || !auth.userId) return { signedIn: false }
  const name = auth.sessionClaims?.org_name
  if (!auth.orgId || typeof name !== "string") {
    throw new Error(
      "The session token carries no current organization or no org_name claim: check the identity provider's organization and session token settings (spec 006 plan D-01, D-04)."
    )
  }
  return {
    signedIn: true,
    userId: auth.userId,
    organization: {
      id: auth.orgId,
      name,
      admin: auth.orgRole === ADMIN_ROLE,
    },
  }
}
