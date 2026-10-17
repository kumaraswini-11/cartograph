import { createFileRoute, redirect } from "@tanstack/react-router"

import { getSession } from "@/lib/session.functions"
import { SIGN_IN_PATH } from "@/lib/sign-in"

/**
 * Every protected page sits under this layout (spec 006, FR-010): signed
 * out, the visitor is sent to sign-in from the server, before any of the
 * page is sent, and comes back here afterwards. Its pages read the session
 * from the route context. A route guard protects pages only: each server
 * function checks the session itself.
 */
export const Route = createFileRoute("/_signed-in")({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session.signedIn) {
      throw redirect({
        href: `${SIGN_IN_PATH}?redirect_url=${encodeURIComponent(location.href)}`,
      })
    }
    return { session }
  },
})
