import { createFileRoute } from "@tanstack/react-router"
import { FolderGit2Icon } from "lucide-react"

import { EmptyState } from "@workspace/ui/components/empty-state"

import { AccountHeader } from "@/components/account/account-header"
import { AnalysisList } from "@/components/dashboard/analysis-list"
import { getAnalyses } from "@/lib/analyses.functions"
import { pageTitle } from "@/lib/site"

/**
 * The dashboard, where every sign-in lands (spec 006, FR-002): the current
 * organization's name and its analyses, each with its latest run's state,
 * in the server's HTML (spec 006 FR-011; spec 007 FR-006), or the empty
 * state (FR-007). The loader asks again on every visit, so after switching
 * organization the same question returns the new one's (FR-008).
 */
export const Route = createFileRoute("/_identity/_signed-in/dashboard")({
  head: () => ({ meta: [{ title: pageTitle("Dashboard") }] }),
  loader: () => getAnalyses(),
  // Whose analyses these are is the token's, which a switch changes without
  // changing the address: never serve an earlier organization's list.
  shouldReload: true,
  component: Dashboard,
})

function Dashboard() {
  const { session } = Route.useRouteContext()
  const analyses = Route.useLoaderData()
  return (
    <div className="flex min-h-svh flex-col">
      <AccountHeader />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <h1 className="text-lg font-medium">{session.organization.name}</h1>
        {analyses.length === 0 ? (
          <EmptyState
            icon={<FolderGit2Icon />}
            title="No analyses yet"
            description="The repositories this organization maps will be listed here."
            className="border"
          />
        ) : (
          <AnalysisList analyses={analyses} />
        )}
      </main>
    </div>
  )
}
