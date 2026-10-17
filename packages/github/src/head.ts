import { GitHubError, refuse } from "./errors.ts"
import { DOWNLOAD_TIMEOUT_MS } from "./limits.ts"

/** A repository's default branch and the commit it points at. */
export type Head = { branch: string; commit: string }

export type HeadOptions = {
  /** Defaults to the global fetch; tests pass their own. */
  fetch?: typeof globalThis.fetch
  signal?: AbortSignal
}

/**
 * The longest first ref line read, in bytes: the commit, `HEAD` and the
 * server's capabilities, a few hundred bytes in practice.
 */
const MAX_HEAD_LINE_BYTES = 64 * 1024

/**
 * The default branch and its commit, from git's own HTTP protocol (plan
 * D-02): GitHub's `info/refs` advertises `HEAD` first, with the branch it
 * points to among its capabilities (`symref=HEAD:refs/heads/main`). No token
 * and no REST API rate limit (C-06). Only the first ref line is read: the
 * rest lists every branch and tag, which for a large repository is
 * megabytes. A missing or private repository answers 401 or 404 (FR-008);
 * a renamed one redirects, which fetch follows (the spec's edge case).
 */
export async function defaultBranchHead(
  repository: string,
  options: HeadOptions = {}
): Promise<Head> {
  const fetch = options.fetch ?? globalThis.fetch
  const signal = AbortSignal.any([
    AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    ...(options.signal ? [options.signal] : []),
  ])
  const response = await fetch(
    `https://github.com/${repository}.git/info/refs?service=git-upload-pack`,
    { signal, headers: { "User-Agent": "git/2 cartograph" } }
  )
  if (response.status === 401 || response.status === 404) {
    return refuse(response, { kind: "not found", repository })
  }
  if (!response.ok || response.body === null) {
    return refuse(response, {
      kind: "unavailable",
      repository,
      status: response.status,
    })
  }

  const line = await firstRefLine(response.body)
  const head = line === null ? null : headFrom(line)
  if (head === null) throw new GitHubError({ kind: "empty", repository })
  return head
}

/**
 * The first ref after the service announcement, as text, or null when there
 * is none. Reads pkt-lines (four hex digits of length, then the data; `0000`
 * is a flush) and stops reading as soon as it has the line.
 */
async function firstRefLine(
  body: ReadableStream<Uint8Array>
): Promise<string | null> {
  const reader = body.getReader()
  let buffered: Uint8Array = new Uint8Array(0)
  let flushed = false
  try {
    for (;;) {
      // Every complete pkt-line in the buffer, in order.
      while (buffered.length >= 4) {
        const length = Number.parseInt(text(buffered.subarray(0, 4)), 16)
        if (Number.isNaN(length)) return null
        if (length === 0) {
          // The flush after the service announcement; a second one ends the
          // list, so the repository has no refs.
          if (flushed) return null
          flushed = true
          buffered = buffered.subarray(4)
          continue
        }
        if (length > MAX_HEAD_LINE_BYTES) return null
        if (buffered.length < length) break
        const data = text(buffered.subarray(4, length))
        buffered = buffered.subarray(length)
        if (flushed) return data
      }
      if (buffered.length > MAX_HEAD_LINE_BYTES) return null
      const { done, value } = await reader.read()
      if (done) return null
      buffered = concat(buffered, value)
    }
  } finally {
    // The rest of the advertisement is never needed.
    await reader.cancel().catch(() => undefined)
  }
}

/** `<commit> HEAD\0<capabilities>`, read into the branch and commit. */
export function headFrom(line: string): Head | null {
  const [ref = "", capabilities = ""] = line.replace(/\n$/, "").split("\0")
  const [commit = "", name = ""] = ref.split(" ")
  if (name !== "HEAD" || !/^[\da-f]{40}(?:[\da-f]{24})?$/.test(commit)) {
    return null
  }
  if (/^0+$/.test(commit)) return null
  const symref = capabilities
    .split(" ")
    .find((c) => c.startsWith("symref=HEAD:refs/heads/"))
  if (symref === undefined) return null
  return { branch: symref.slice("symref=HEAD:refs/heads/".length), commit }
}

const decoder = new TextDecoder()

function text(bytes: Uint8Array): string {
  return decoder.decode(bytes)
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const joined = new Uint8Array(a.length + b.length)
  joined.set(a)
  joined.set(b, a.length)
  return joined
}
