import { createFileRoute } from "@tanstack/react-router"
import { FolderGit2Icon } from "lucide-react"

import { EmptyState } from "@workspace/ui/components/empty-state"

import { AccountHeader } from "@/components/account/account-header"
import { pageTitle } from "@/lib/site"

/**
 * The dashboard, where every sign-in lands (spec 006, FR-002): the current
 * organization's name is in the server's HTML (FR-011). Its analyses come
 * with spec 007.
 */
export const Route = createFileRoute("/_identity/_signed-in/dashboard")({
  head: () => ({ meta: [{ title: pageTitle("Dashboard") }] }),
  component: Dashboard,
})

function Dashboard() {
  const { session } = Route.useRouteContext()
  return (
    <div className="flex min-h-svh flex-col">
      <AccountHeader />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <h1 className="text-lg font-medium">{session.organization.name}</h1>
        <EmptyState
          icon={<FolderGit2Icon />}
          title="No analyses yet"
          description="The repositories this organization maps will be listed here."
          className="border"
        />
      </main>
    </div>
  )
}
