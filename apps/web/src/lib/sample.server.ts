// The marker makes TanStack Start refuse to import this file into the
// browser bundle, as for env.server.ts (spec 000 plan: .server.ts import
// protection is still experimental).
import "@tanstack/react-start/server-only"

import type { MapInput } from "@workspace/graph"

import type { SampleName } from "@/sample/samples"

/**
 * Each sample's module, loaded only when it's asked for (spec 005 plan D-07).
 * Server-only, so no sample is ever part of the browser's JavaScript; the
 * page carries the one it shows once, as data.
 */
const MODULES: Record<SampleName, () => Promise<{ SAMPLE_MAP: MapInput }>> = {
  taxonomy: () => import("@/sample/taxonomy.gen"),
  "nestjs-realworld-example-app": () =>
    import("@/sample/nestjs-realworld-example-app.gen"),
  "node-express-boilerplate": () =>
    import("@/sample/node-express-boilerplate.gen"),
}

export async function readSampleMap(name: SampleName): Promise<MapInput> {
  return (await MODULES[name]()).SAMPLE_MAP
}
