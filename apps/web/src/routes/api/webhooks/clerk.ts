import { createFileRoute } from "@tanstack/react-router"
import { deleteOrganization } from "@workspace/database"

import { handleClerkWebhook } from "@/lib/clerk-webhook.server"
import { getServerEnv } from "@/lib/env.server"

/**
 * Clerk's webhook endpoint (spec 007, FR-002, plan D-07), public by
 * necessity: Clerk, not a signed-in person, calls it, and its signature is
 * what's trusted. In Clerk's dashboard: an endpoint at this address for
 * `organization.deleted`, its signing secret in CLERK_WEBHOOK_SIGNING_SECRET.
 */
export const Route = createFileRoute("/api/webhooks/clerk")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const env = getServerEnv()
        return handleClerkWebhook(request, {
          signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
          deleteOrganization: (organizationId) =>
            deleteOrganization(
              {
                url: env.VITE_SUPABASE_URL,
                secretKey: env.SUPABASE_SECRET_KEY,
              },
              organizationId
            ),
        })
      },
    },
  },
})
