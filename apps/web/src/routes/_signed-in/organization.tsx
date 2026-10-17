import { createFileRoute } from "@tanstack/react-router"

import { AccountHeader } from "@/components/account/account-header"
import { InviteForm } from "@/components/organization/invite-form"
import { ONLY_ADMINS } from "@/lib/invitations"
import { pageTitle } from "@/lib/site"

/**
 * The current organization's page, which the switcher's "Manage" opens
 * (spec 006 plan D-06): an admin invites from here (FR-007). Clerk's own
 * organization screen isn't used, since its invitations can't lead to this
 * app's sign-in (FR-008).
 */
export const Route = createFileRoute("/_signed-in/organization")({
  head: () => ({ meta: [{ title: pageTitle("Organization") }] }),
  component: OrganizationPage,
})

function OrganizationPage() {
  const { organization } = Route.useRouteContext().session
  return (
    <div className="flex min-h-svh flex-col">
      <AccountHeader />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <h1 className="text-lg font-medium">{organization.name}</h1>
        <section
          aria-labelledby="invite-heading"
          className="flex flex-col gap-3"
        >
          <h2 id="invite-heading" className="font-medium">
            Invite a member
          </h2>
          {organization.admin ? (
            <InviteForm organization={organization.name} />
          ) : (
            <p className="text-sm text-muted-foreground">{ONLY_ADMINS}</p>
          )}
        </section>
      </main>
    </div>
  )
}
