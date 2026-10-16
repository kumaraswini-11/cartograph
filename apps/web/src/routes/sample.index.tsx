import { createFileRoute, redirect } from "@tanstack/react-router"

import { DEFAULT_SAMPLE } from "@/sample/samples"

/** `/sample` leads to the first sample (spec 005 plan D-07). */
export const Route = createFileRoute("/sample/")({
  beforeLoad: () => {
    throw redirect({ to: "/sample/$name", params: { name: DEFAULT_SAMPLE } })
  },
})
