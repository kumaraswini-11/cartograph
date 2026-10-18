// The marker makes TanStack Start refuse to import this file into the
// browser bundle, as for env.server.ts.
import "@tanstack/react-start/server-only"

import { verifyWebhook } from "@clerk/tanstack-react-start/webhooks"
import { deleteOrganization as deleteStoredOrganization } from "@workspace/database"

import { getServerEnv } from "./env.server"
import { track } from "./telemetry.server"

/** What the webhook does once a notice is proven to be Clerk's. */
export type ClerkWebhookActions = {
  signingSecret: string
  deleteOrganization: (organizationId: string) => Promise<void>
  /** A session started: someone signed in (spec 012, FR-002). */
  signedIn: (session: {
    userId: string
    organizationId: string | null
  }) => Promise<void>
}

/**
 * Clerk's notices (spec 007, FR-002, plan D-07). A notice whose signature
 * isn't Clerk's is refused and changes nothing. `organization.deleted`
 * deletes the organization's rows; `session.created` is a sign-in, sent as
 * its event (spec 012, FR-002); every other notice is acknowledged and
 * ignored. A failed delete answers 500, so Clerk delivers the notice again;
 * a repeat deletes nothing more (Clerk delivers at least once, in no fixed
 * order).
 */
export async function handleClerkWebhook(
  request: Request,
  { signingSecret, deleteOrganization, signedIn }: ClerkWebhookActions
): Promise<Response> {
  let event: Awaited<ReturnType<typeof verifyWebhook>>
  try {
    event = await verifyWebhook(request, { signingSecret })
  } catch {
    return new Response("The notice's signature isn't Clerk's.", {
      status: 400,
    })
  }
  if (event.type === "organization.deleted" && event.data.id !== undefined) {
    await deleteOrganization(event.data.id)
  }
  if (event.type === "session.created") {
    await signedIn({
      userId: event.data.user_id,
      organizationId: event.data.last_active_organization_id ?? null,
    })
  }
  return new Response(null, { status: 204 })
}

/**
 * The webhook's real actions: the secret, storage's delete with the secret
 * key, and the sign-in event (spec 012, FR-002).
 */
export function clerkWebhookActions(): ClerkWebhookActions {
  const env = getServerEnv()
  return {
    signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
    deleteOrganization: (organizationId) =>
      deleteStoredOrganization(
        { url: env.VITE_SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY },
        organizationId
      ),
    signedIn: ({ userId, organizationId }) =>
      track(userId, { event: "signed_in", properties: { organizationId } }),
  }
}
