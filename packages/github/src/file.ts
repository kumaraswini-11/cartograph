import { GitHubError, refuse } from "./errors.ts"
import { DOWNLOAD_TIMEOUT_MS } from "./limits.ts"

export type FileOptions = {
  /** The most bytes read; a larger file is refused. */
  maxBytes: number
  /** Defaults to the global fetch; tests pass their own. */
  fetch?: typeof globalThis.fetch
  signal?: AbortSignal
}

/**
 * One file's bytes as they were at `commit` (spec 009, plan D-04), from
 * GitHub's file host with no token. A commit's files never change, so this
 * is exactly what was parsed; the caller checks it against the stored hash.
 * A file over `maxBytes` is refused rather than cut, so a partial file is
 * never taken for a whole one, and it's refused as it arrives: no more than
 * the limit and one chunk is ever held, whatever the server sends.
 */
export async function fileAtCommit(
  repository: string,
  commit: string,
  path: string,
  options: FileOptions
): Promise<Uint8Array> {
  const fetch = options.fetch ?? globalThis.fetch
  const signal = AbortSignal.any([
    AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    ...(options.signal ? [options.signal] : []),
  ])
  const encoded = path.split("/").map(encodeURIComponent).join("/")
  const response = await fetch(
    `https://raw.githubusercontent.com/${repository}/${commit}/${encoded}`,
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
  const chunks: Array<Uint8Array> = []
  let length = 0
  const reader = response.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > options.maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw new GitHubError({
        kind: "too large",
        repository,
        limit: "extracted",
        bytes: options.maxBytes,
      })
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}
