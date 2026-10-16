import { createFileRoute, notFound } from "@tanstack/react-router"

import { MapShell } from "@/components/map/map-shell"
import { getSampleMap } from "@/lib/sample.functions"
import { pageTitle, seo } from "@/lib/site"
import { isSampleName } from "@/sample/samples"

/**
 * A sample map (specs 003 and 005): one of the fixed analyses until spec
 * 008 stores real ones. The rail, banner and pane render on the server; the
 * map draws in the browser. A sample never changes, so it's loaded once.
 */
export const Route = createFileRoute("/sample/$name")({
  loader: ({ params }) => {
    if (!isSampleName(params.name)) throw notFound()
    return getSampleMap({ data: { name: params.name } })
  },
  // A sample is fixed: loaded once, and a preload is kept as long.
  staleTime: Infinity,
  preloadStaleTime: Infinity,
  head: ({ loaderData, params }) =>
    loaderData
      ? seo({
          title: pageTitle(loaderData.repository),
          description: `A dependency map of ${loaderData.repository}: ${loaderData.files.length} files and the ${loaderData.edges.length} edges between them, drawn from the code itself.`,
          path: `/sample/${params.name}`,
        })
      : {},
  component: SampleRoute,
})

function SampleRoute() {
  const input = Route.useLoaderData()
  return <MapShell input={input} />
}
