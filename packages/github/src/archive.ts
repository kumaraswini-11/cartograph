import { lstatSync, mkdirSync, symlinkSync } from "node:fs"
import { dirname, join } from "node:path"
import { Readable, Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"

import { extract } from "tar"
import type { ReadEntry } from "tar"

import { GitHubError, refuse } from "./errors.ts"
import {
  DOWNLOAD_TIMEOUT_MS,
  MAX_ARCHIVE_BYTES,
  MAX_EXTRACTED_BYTES,
} from "./limits.ts"

export type ArchiveOptions = {
  /**
   * Which files' contents to write, by their path in the repository
   * ("/"-separated, no leading slash). Defaults to every file's. The other
   * files are written empty: every file, folder and link a checkout has is
   * there, so whatever lists the folder or checks that a path exists sees a
   * checkout, and only what's read takes space.
   */
  contents?: (path: string) => boolean
  /** Defaults to MAX_ARCHIVE_BYTES; tests pass a smaller one. */
  maxArchiveBytes?: number
  /** Defaults to MAX_EXTRACTED_BYTES; tests pass a smaller one. */
  maxExtractedBytes?: number
  /** Defaults to the global fetch; tests pass their own. */
  fetch?: typeof globalThis.fetch
  signal?: AbortSignal
}

/** What an extraction wrote. */
export type Extracted = {
  /** Files written, with their contents or empty. */
  files: number
  /** The bytes of the contents written. */
  bytes: number
  /** Links, each written as a link to itself (`extractArchive`). */
  links: number
}

/** Entry types that are a file's contents. */
const FILE_TYPES: ReadonlySet<string> = new Set([
  "File",
  "OldFile",
  "ContiguousFile",
])

/** Entry types that are a link to another path. */
const LINK_TYPES: ReadonlySet<string> = new Set(["SymbolicLink", "Link"])

/**
 * The repository's files at `commit`, from GitHub's archive, written into
 * `directory` (plan D-03). The archive is streamed and never held whole:
 * its bytes are counted as they arrive and the download stops past
 * `maxArchiveBytes` (spec 008, FR-009), since GitHub sends no length. Only
 * the contents `contents` accepts are written, and writing stops past
 * `maxExtractedBytes` of them.
 *
 * Links are never extracted as they are: a link's target is the archive
 * author's choice, and anything that later followed one could read outside
 * the folder. Each link is written instead as a link to itself, which points
 * nowhere (following it fails with ELOOP), so a reader that lists the folder
 * still sees a link at that path, as spec 001 records it. node-tar already
 * refuses absolute paths, `..` and paths through a link.
 */
export async function extractArchive(
  repository: string,
  commit: string,
  directory: string,
  options: ArchiveOptions = {}
): Promise<Extracted> {
  const fetch = options.fetch ?? globalThis.fetch
  const maxArchiveBytes = options.maxArchiveBytes ?? MAX_ARCHIVE_BYTES
  const maxExtractedBytes = options.maxExtractedBytes ?? MAX_EXTRACTED_BYTES
  const signal = AbortSignal.any([
    AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    ...(options.signal ? [options.signal] : []),
  ])

  const response = await fetch(
    `https://codeload.github.com/${repository}/tar.gz/${commit}`,
    { signal }
  )
  if (response.status === 404) {
    return refuse(response, { kind: "not found", repository })
  }
  if (!response.ok || response.body === null) {
    return refuse(response, {
      kind: "unavailable",
      repository,
      status: response.status,
    })
  }

  mkdirSync(directory, { recursive: true })
  const extracted: Extracted = { files: 0, bytes: 0, links: 0 }
  const links: Array<string> = []
  const emptied = new WeakSet<ReadEntry>()
  let archiveBytes = 0

  const counted = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      archiveBytes += chunk.length
      if (archiveBytes > maxArchiveBytes) {
        done(
          new GitHubError({
            kind: "too large",
            repository,
            limit: "archive",
            bytes: maxArchiveBytes,
          })
        )
      } else done(null, chunk)
    },
  })

  const unpack = extract({
    cwd: directory,
    // GitHub's archive puts everything under `<name>-<commit>/`.
    strip: 1,
    strict: true,
    filter: (path, entry) => {
      if (!("type" in entry)) return false
      const inRepository = path.split("/").slice(1).join("/")
      if (entry.type === "Directory") return true
      if (LINK_TYPES.has(entry.type)) {
        // Written by this function, not node-tar, so its path is checked
        // here, as node-tar checks the paths it writes.
        if (!staysInside(inRepository)) {
          unpack.abort(
            new Error(
              `${repository}'s archive has a link outside its folder: ${path}`
            )
          )
        } else links.push(inRepository)
        return false
      }
      if (!FILE_TYPES.has(entry.type)) return false
      extracted.files += 1
      if (options.contents && !options.contents(inRepository)) {
        emptied.add(entry)
        return true
      }
      extracted.bytes += entry.size
      if (extracted.bytes > maxExtractedBytes) {
        unpack.abort(
          new GitHubError({
            kind: "too large",
            repository,
            limit: "extracted",
            bytes: maxExtractedBytes,
          })
        )
        return false
      }
      return true
    },
    // A stream returned here is written in place of the entry's contents
    // (node-tar: `transform`); this one writes nothing.
    transform: (entry) =>
      emptied.has(entry)
        ? (new Transform({
            transform: (_chunk, _encoding, done) => done(),
          }) as unknown as ReadEntry)
        : undefined,
  })

  await pipeline(
    Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>),
    counted,
    unpack
  )

  for (const link of links) {
    const path = join(directory, ...link.split("/"))
    mkdirSync(dirname(path), { recursive: true })
    if (exists(path)) continue
    // "junction" lets Windows make it without privileges; it's ignored
    // elsewhere, where this is an ordinary link.
    symlinkSync(path, path, "junction")
    extracted.links += 1
  }
  return extracted
}

/**
 * True for a relative, "/"-separated path that names something inside the
 * folder: no empty, `.` or `..` segment, and no `\` or `:` that Windows
 * would read as a separator or a drive.
 */
export function staysInside(path: string): boolean {
  return (
    !/[\\:]/.test(path) &&
    path.split("/").every((s) => s !== "" && s !== "." && s !== "..")
  )
}

/** True when anything, even a link, is at `path`. */
function exists(path: string): boolean {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}
