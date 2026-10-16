import { createFileRoute } from "@tanstack/react-router"

import { MapShell } from "@/components/map/map-shell"
import { getSampleMap } from "@/lib/sample.functions"

/**
 * The sample map (spec 003): one fixed analysis until spec 008 stores real
 * ones. The rail, banner and pane render on the server; the map draws in the
 * browser. The sample never changes, so it's loaded once.
 */
export const Route = createFileRoute("/sample")({
  loader: () => getSampleMap(),
  staleTime: Infinity,
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.repository ?? "Sample"}: Cartograph` }],
  }),
  component: SampleRoute,
})

function SampleRoute() {
  const input = Route.useLoaderData()
  return <MapShell input={input} />
}
