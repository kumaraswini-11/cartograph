// The marker makes TanStack Start refuse to import this file into the
// browser bundle, as for env.server.ts.
import "@tanstack/react-start/server-only"

import { verifyWebhook } from "@clerk/tanstack-react-start/webhooks"

/** What the webhook does once a notice is proven to be Clerk's. */
export type ClerkWebhookActions = {
  signingSecret: string
  deleteOrganization: (organizationId: string) => Promise<void>
}

/**
 * Clerk's notices (spec 007, FR-002, plan D-07). A notice whose signature
 * isn't Clerk's is refused and changes nothing. `organization.deleted`
 * deletes the organization's rows; every other notice is acknowledged and
 * ignored. A failed delete answers 500, so Clerk delivers the notice again;
 * a repeat deletes nothing more (Clerk delivers at least once, in no fixed
 * order).
 */
export async function handleClerkWebhook(
  request: Request,
  { signingSecret, deleteOrganization }: ClerkWebhookActions
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
  return new Response(null, { status: 204 })
}
