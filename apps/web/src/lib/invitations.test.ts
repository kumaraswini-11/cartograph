import { describe, expect, it } from "vitest"

import { ONLY_ADMINS, inviterFrom, refusalReason } from "./invitations"
import type { Session } from "./session"

const session = (admin: boolean): Session => ({
  signedIn: true,
  userId: "user_1",
  organization: { id: "org_1", name: "Alice's organization", admin },
})

describe("who may invite (spec 006, FR-007, FR-009)", () => {
  it("lets an admin invite", () => {
    expect(inviterFrom(session(true))).toEqual({ inviter: session(true) })
  })

  it("refuses a member and a signed-out call, whatever the page showed", () => {
    expect(inviterFrom(session(false))).toEqual({ refused: ONLY_ADMINS })
    expect(inviterFrom({ signedIn: false })).toHaveProperty("refused")
  })
})

describe("what a refused invitation says", () => {
  it("names the cases the identity provider reports, and a fallback", () => {
    expect(refusalReason("already_a_member_in_organization")).toMatch(
      /already a member/
    )
    expect(refusalReason("form_param_format_invalid")).toMatch(/valid email/)
    expect(refusalReason("missing_organization_permission")).toBe(ONLY_ADMINS)
    expect(refusalReason("anything_else")).toMatch(/Try again/)
  })
})
