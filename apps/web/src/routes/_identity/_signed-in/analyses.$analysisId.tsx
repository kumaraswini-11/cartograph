import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { z } from "zod"

import { STAGES, analysisTopic } from "@workspace/database"
import type { RunDetail } from "@workspace/database"
import { buttonVariants } from "@workspace/ui/components/shadcn-ui/button"

import { AccountHeader } from "@/components/account/account-header"
import { RerunButton } from "@/components/analysis/rerun-button"
import { RunBadge } from "@/components/analysis/run-badge"
import { RunProgress } from "@/components/analysis/run-progress"
import { MapShell } from "@/components/map/map-shell"
import { getAnalysis } from "@/lib/analyses.functions"
import { useStages, withChange } from "@/lib/progress"
import { pageTitle } from "@/lib/site"

/**
 * An analysis (spec 008): its stored map once a run is done, with the
 * coverage banner of 003 where it applies (FR-014), or its latest run's
 * stages and sentence until then (FR-010), as storage pushes each change
 * (FR-011), or why it failed (FR-007). It's
 * read from storage on every visit, with the member's token, so another
 * organization's analysis is not found (spec 007, C-02).
 */
export const Route = createFileRoute(
  "/_identity/_signed-in/analyses/$analysisId"
)({
  loader: async ({ params }) => {
    if (!z.uuid().safeParse(params.analysisId).success) throw notFound()
    const page = await getAnalysis({
      data: { analysisId: params.analysisId },
    })
    if (page === null) throw notFound()
    return page
  },
  // A run moves on between visits: never serve an earlier stage.
  shouldReload: true,
  head: ({ loaderData }) => ({
    meta: [{ title: pageTitle(loaderData?.analysis.repository ?? "Analysis") }],
  }),
  component: AnalysisRoute,
})

/** A run under way, and not stale: a re-run would start nothing (FR-004). */
const isRunning = (run: RunDetail | null) =>
  run !== null &&
  !run.stale &&
  (STAGES as ReadonlyArray<string>).includes(run.state)

function AnalysisRoute() {
  const { session } = Route.useRouteContext()
  const { analysis, map } = Route.useLoaderData()
  const changes = useStages(
    analysisTopic(session.organization.id, analysis.id),
    // A first run arriving reads storage again for the whole run.
    (id) => id === analysis.id && analysis.latestRun !== null
  )
  const run =
    analysis.latestRun === null
      ? null
      : withChange(analysis.latestRun, changes.get(analysis.id))
  const rerun = (
    <RerunButton analysisId={analysis.id} running={isRunning(run)} />
  )

  if (map !== null) {
    return (
      <MapShell
        input={map}
        actions={
          <>
            <Link
              to="/dashboard"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Dashboard
            </Link>
            {/* A later run that isn't done yet, or didn't finish. */}
            {run !== null && run.state !== "done" && <RunBadge run={run} />}
            {rerun}
          </>
        }
      />
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <AccountHeader />
      <main className="flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
        <Link
          to="/dashboard"
          className={buttonVariants({
            variant: "link",
            className: "self-start px-0",
          })}
        >
          Dashboard
        </Link>
        <h1 className="font-mono text-lg font-medium break-all">
          {analysis.repository}
        </h1>
        {run === null ? (
          <p className="text-sm text-muted-foreground">Not run yet.</p>
        ) : (
          <RunProgress run={run} />
        )}
        {rerun}
      </main>
    </div>
  )
}
