// The parse and the detection, off the server's main thread (spec 008, plan
// D-05). Both are synchronous and take seconds on a large repository; on
// the main thread they'd stall every other request the instance is serving
// (Node.js: "Don't block the event loop").
//
// The module is its own worker: the server imports it, and
// `parseInWorker` starts a worker thread on this same file, where the
// check at the bottom finds itself inside that worker and does the work.
// Loaded with a dynamic import, it's a chunk of its own in the build, so
// the worker loads only this and what it imports. That's also why it
// imports packages by name, never through the app's `@/` alias.
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads"

import { detectFrameworks } from "@workspace/frameworks"
import type { Detection } from "@workspace/frameworks"
import { isTooLarge, parseRepository } from "@workspace/parser"
import type { ParseResult } from "@workspace/parser"

/** What the worker sends back: both results, or what went wrong. */
export type Parsed =
  { parsed: ParseResult; detection: Detection | null } | { error: string }

/** Marks the worker this module starts, so nothing else runs the job. */
const JOB = "cartograph:parse"

type Job = { job: typeof JOB; directory: string }

const isJob = (data: unknown): data is Job =>
  typeof data === "object" &&
  data !== null &&
  "job" in data &&
  data.job === JOB &&
  "directory" in data &&
  typeof data.directory === "string"

/** Parses and detects `directory` in the calling thread. */
export function parseHere(directory: string): Parsed {
  const parsed = parseRepository(directory)
  // A repository over the parser's limit has no files to detect in (001).
  const detection = isTooLarge(parsed)
    ? null
    : detectFrameworks(directory, parsed)
  return { parsed, detection }
}

/**
 * Parses and detects `directory` in a worker thread, so the server keeps
 * answering meanwhile. Only the results, structured-cloned, come back.
 */
export function parseInWorker(directory: string): Promise<Parsed> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), {
      workerData: { job: JOB, directory } satisfies Job,
    })
    worker.once("message", (message: Parsed) => resolve(message))
    worker.once("error", reject)
    worker.once("exit", (code) => {
      if (code !== 0) reject(new Error(`The parse worker stopped (${code})`))
    })
  })
}

if (!isMainThread && isJob(workerData)) {
  let result: Parsed
  try {
    result = parseHere(workerData.directory)
  } catch (error) {
    result = { error: error instanceof Error ? error.message : String(error) }
  }
  parentPort?.postMessage(result)
}
