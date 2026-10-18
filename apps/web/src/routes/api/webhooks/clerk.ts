import { createFileRoute } from "@tanstack/react-router"

import {
  clerkWebhookActions,
  handleClerkWebhook,
} from "@/lib/clerk-webhook.server"

/**
 * Clerk's webhook endpoint (spec 007, FR-002, plan D-07), public by
 * necessity: Clerk, not a signed-in person, calls it, and its signature is
 * what's trusted. In Clerk's dashboard: an endpoint at this address for
 * `organization.deleted` and `session.created` (spec 012), its signing
 * secret in CLERK_WEBHOOK_SIGNING_SECRET.
 */
export const Route = createFileRoute("/api/webhooks/clerk")({
  server: {
    handlers: {
      POST: ({ request }) => handleClerkWebhook(request, clerkWebhookActions()),
    },
  },
})
