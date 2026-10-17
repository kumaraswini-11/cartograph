import "@tanstack/react-start/server-only"

import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { RunWriter, Stage } from "@workspace/database"
import { defaultBranchHead, extractArchive } from "@workspace/github"
import type { Head } from "@workspace/github"
import { MAX_FILES, isTooLarge } from "@workspace/parser"
import { isReadFile } from "@workspace/parser/paths"

import type { Parsed } from "./parse.worker"
import { RUN_MESSAGES, failureMessage } from "./run-messages"

/** What a run needs from outside: passed in, so tests can stand in for it. */
export type RunDeps = {
  writer: RunWriter
  head: (repository: string) => Promise<Head>
  /** Writes the repository's files at `commit` into `directory`. */
  extract: (
    repository: string,
    commit: string,
    directory: string
  ) => Promise<unknown>
  parse: (directory: string) => Promise<Parsed>
  /** A new, empty folder of the run's own. */
  workspace: () => string
  remove: (directory: string) => void
}

/** The run's real dependencies: GitHub, the disk and the parse worker. */
export function runDeps(writer: RunWriter): RunDeps {
  return {
    writer,
    head: (repository) => defaultBranchHead(repository),
    // Contents only where the parser reads them; every path, so the
    // parser's result is a checkout's (plan D-03).
    extract: (repository, commit, directory) =>
      extractArchive(repository, commit, directory, { contents: isReadFile }),
    // Loaded when a run starts, as a chunk of its own the worker can load
    // alone (plan D-05).
    parse: async (directory) =>
      (await import("./parse.worker")).parseInWorker(directory),
    workspace: () => mkdtempSync(join(tmpdir(), "cartograph-run-")),
    remove: (directory) => rmSync(directory, { recursive: true, force: true }),
  }
}

/**
 * One run of an analysis, after the response (spec 008, FR-005 to FR-009):
 * fetching, then parsing, then storing, each stage written before it
 * starts, so a page shows what's happening now. Any failure ends the run as
 * failed in the stage it reached, with a sentence saying why (FR-007).
 * When the database says the run has already ended (a re-run ended it as
 * stale), it stops without writing more. Its folder is removed however it
 * ends.
 */
export async function runAnalysis(
  run: { runId: string; repository: string },
  deps: RunDeps
): Promise<void> {
  const { runId, repository } = run
  const { writer } = deps
  let stage: Stage = "fetching"
  const directory = deps.workspace()
  try {
    // FR-005: the default branch's commit, then the archive at it.
    const { commit } = await deps.head(repository)
    const fetching = await writer.advanceRun(runId, {
      stage,
      message: RUN_MESSAGES.downloading(repository, commit),
      commit,
    })
    if (!fetching) return
    await deps.extract(repository, commit, directory)

    stage = "parsing"
    const parsing = await writer.advanceRun(runId, {
      stage,
      message: RUN_MESSAGES.parsing(repository),
    })
    if (!parsing) return
    const result = await deps.parse(directory)
    if ("error" in result) throw new Error(`The parse failed: ${result.error}`)
    const { parsed, detection } = result
    if (isTooLarge(parsed) || detection === null) {
      // FR-009: the parser's own limit, named.
      const files = isTooLarge(parsed) ? parsed.tooLarge.files : 0
      await writer.failRun(
        runId,
        RUN_MESSAGES.tooManyFiles(repository, files, MAX_FILES)
      )
      return
    }

    stage = "storing"
    const files = parsed.files.length
    const storing = await writer.advanceRun(runId, {
      stage,
      message: RUN_MESSAGES.storing(files),
    })
    if (!storing) return
    await writer.finishRun(runId, {
      parsed,
      detection,
      message: RUN_MESSAGES.done(files, commit),
    })
  } catch (error) {
    console.error(`Run ${runId} of ${repository} failed while ${stage}:`, error)
    await writer.failRun(runId, failureMessage(repository, stage, error))
  } finally {
    deps.remove(directory)
  }
}
