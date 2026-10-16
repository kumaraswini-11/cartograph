// Test helpers: map files and edges with only what a test cares about.
import { folderOf } from "@workspace/parser/paths"

import type { MapEdge, MapFile } from "./input.ts"

/** A file at `path`, in the folder that holds it, with `role`. */
export const file = (path: string, role = "Unidentified"): MapFile => ({
  path,
  folder: folderOf(path),
  lines: 1,
  fanIn: 0,
  fanOut: 0,
  role,
  entryPoint: false,
})

/** An edge from one file to another, not type-only. */
export const edge = (from: string, to: string): MapEdge => ({
  from,
  to,
  typeOnly: false,
})
