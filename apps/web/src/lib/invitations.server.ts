// The marker makes TanStack Start refuse to import this file into the
// browser bundle, as for env.server.ts.
import "@tanstack/react-start/server-only"

import { isClerkAPIResponseError } from "@clerk/tanstack-react-start/errors"
import { clerkClient } from "@clerk/tanstack-react-start/server"
import { getRequestUrl } from "@tanstack/react-start/server"

import { inviterFrom, refusalReason } from "./invitations"
import type { InvitationResult } from "./invitations"
import { MEMBER_ROLE } from "./session"
import { readSession } from "./session.server"
import { SIGN_IN_PATH } from "./sign-in"

/**
 * Invites `email` into the current organization as a member (spec 006,
 * FR-007, plan D-06). The invitation leads to this deployment's own
 * sign-in page (FR-008), which the browser's invite call can't set.
 */
export async function sendInvitation(email: string): Promise<InvitationResult> {
  const check = inviterFrom(await readSession())
  if ("refused" in check) return { sent: false, reason: check.refused }
  const { userId, organization } = check.inviter
  try {
    await clerkClient().organizations.createOrganizationInvitation({
      organizationId: organization.id,
      emailAddress: email,
      inviterUserId: userId,
      role: MEMBER_ROLE,
      redirectUrl: new URL(SIGN_IN_PATH, getRequestUrl()).toString(),
    })
    return { sent: true }
  } catch (error) {
    if (!isClerkAPIResponseError(error)) throw error
    return { sent: false, reason: refusalReason(error.errors[0]?.code) }
  }
}
