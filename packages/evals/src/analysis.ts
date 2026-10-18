// The evaluation's repositories (spec 011, FR-001, C-02): three of the
// golden repositories already pinned by specs 001 and 002, each kept as
// GitHub's own archive of its commit beside the cases (plan D-03), and
// analysed as a run analyses one.
import { join } from "node:path"

import { detectFrameworks } from "@workspace/frameworks"
import { checkout } from "@workspace/golden"
import { edgeIndex, toMapInput } from "@workspace/graph"
import type { EdgeIndex, MapInput } from "@workspace/graph"
import { isTooLarge, parseRepository } from "@workspace/parser"
import type { ParsedRepository } from "@workspace/parser"

/** A repository at the commit its cases are pinned to. */
export type Pin = { repository: string; commit: string }

/** The three, in the order cases are drawn from them. */
export const PINS: ReadonlyArray<Pin> = [
  {
    repository: "expressjs/express",
    commit: "a419aa7350389a275ab45fde2e849ed1f02449ef",
  },
  {
    repository: "vercel/commerce",
    commit: "3761e52e60df9c6a316e067dbfd7032e494d3634",
  },
  {
    repository: "lujakob/nestjs-realworld-example-app",
    commit: "c1c2cc4e448b279ff083272df1ac50d20c3304fa",
  },
]

/** Where a pin's archive is kept: in this package, committed. */
export const archiveOf = ({ repository, commit }: Pin) =>
  join(
    import.meta.dirname,
    "..",
    "archives",
    `${repository.replace("/", "-")}-${commit.slice(0, 7)}.tar.gz`
  )

/** A pinned repository, analysed. */
export type Analysis = Pin & {
  directory: string
  parsed: ParsedRepository
  input: MapInput
  index: EdgeIndex
}

/**
 * A pin unpacked from its archive (no network) and analysed: parsed (`001`),
 * detected (`002`), and turned into the map's input, as a run stores it.
 */
export async function analyse(pin: Pin): Promise<Analysis> {
  const directory = await checkout(pin.repository, pin.commit, {
    archive: archiveOf(pin),
  })
  const parsed = parseRepository(directory)
  if (isTooLarge(parsed)) {
    throw new Error(`${pin.repository} is too large to analyse`)
  }
  const input = toMapInput(pin, parsed, detectFrameworks(directory, parsed))
  return { ...pin, directory, parsed, input, index: edgeIndex(input.edges) }
}
