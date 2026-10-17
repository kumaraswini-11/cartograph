import { createFileRoute } from "@tanstack/react-router"
import { FolderGit2Icon } from "lucide-react"

import { organizationTopic } from "@workspace/database"
import { EmptyState } from "@workspace/ui/components/empty-state"

import { AccountHeader } from "@/components/account/account-header"
import { AddressForm } from "@/components/dashboard/address-form"
import { AnalysisList } from "@/components/dashboard/analysis-list"
import { getAnalyses } from "@/lib/analyses.functions"
import { useStages, withChange } from "@/lib/progress"
import { pageTitle } from "@/lib/site"

/**
 * The dashboard, where every sign-in lands (spec 006, FR-002): the current
 * organization's name and its analyses, each with its latest run's state,
 * in the server's HTML (spec 006 FR-011; spec 007 FR-006), or the empty
 * state (FR-007). The loader asks again on every visit, so after switching
 * organization the same question returns the new one's (FR-008). A
 * repository's address is submitted here (spec 008, FR-001), and every
 * run's stage changes as storage pushes them, in this tab or another
 * (FR-010, FR-011, AC-04).
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
  const loaded = Route.useLoaderData()
  const changes = useStages(organizationTopic(session.organization.id), (id) =>
    loaded.some((analysis) => analysis.id === id)
  )
  const analyses = loaded.map((analysis) => {
    const change = changes.get(analysis.id)
    if (change === undefined) return analysis
    return {
      ...analysis,
      latestRun:
        analysis.latestRun === null
          ? { state: change.stage, stale: false }
          : withChange(analysis.latestRun, change),
    }
  })
  return (
    <div className="flex min-h-svh flex-col">
      <AccountHeader />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <h1 className="text-lg font-medium">{session.organization.name}</h1>
        <AddressForm />
        {analyses.length === 0 ? (
          <EmptyState
            icon={<FolderGit2Icon />}
            title="No analyses yet"
            description="Map a repository above, and it's listed here for everyone in this organization."
            className="border"
          />
        ) : (
          <AnalysisList analyses={analyses} />
        )}
      </main>
    </div>
  )
}
