import { describe, expect, it } from "vitest"

import { ADMIN_ROLE, sessionFromClaims } from "./session"

const signedIn = {
  isAuthenticated: true,
  userId: "user_1",
  orgId: "org_1",
  orgRole: ADMIN_ROLE,
  sessionClaims: { org_name: "Alice's organization" },
}

describe("the session, from the token's claims (spec 006, FR-011, FR-012)", () => {
  it("reads the person and their current organization, its name included", () => {
    expect(sessionFromClaims(signedIn)).toEqual({
      signedIn: true,
      userId: "user_1",
      organization: { id: "org_1", name: "Alice's organization", admin: true },
    })
  })

  it("makes only the admin role an admin (FR-007, FR-009)", () => {
    const member = sessionFromClaims({ ...signedIn, orgRole: "org:member" })
    expect(member.signedIn && member.organization.admin).toBe(false)
  })

  it("is signed out when the token is, or is still pending (edge cases)", () => {
    expect(sessionFromClaims({ isAuthenticated: false, userId: null })).toEqual(
      { signedIn: false }
    )
  })

  it("refuses a signed-in token with no organization name, rather than loop", () => {
    expect(() => sessionFromClaims({ ...signedIn, sessionClaims: {} })).toThrow(
      /org_name/
    )
    expect(() => sessionFromClaims({ ...signedIn, orgId: null })).toThrow()
  })
})
