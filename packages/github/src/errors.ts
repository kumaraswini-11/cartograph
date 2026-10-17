/** Why a repository couldn't be read, each a case its reader can name. */
export type GitHubFailure =
  /** GitHub has no public repository there (spec 008, FR-008). */
  | { kind: "not found"; repository: string }
  /** The repository has no commit to read. */
  | { kind: "empty"; repository: string }
  /** Over a limit, named with its value (FR-009). */
  | {
      kind: "too large"
      repository: string
      limit: "archive" | "extracted"
      bytes: number
    }
  /** GitHub answered with something other than the repository. */
  | { kind: "unavailable"; repository: string; status: number }

/** Thrown by this package when a repository can't be read. */
export class GitHubError extends Error {
  readonly failure: GitHubFailure

  constructor(failure: GitHubFailure) {
    super(describe(failure))
    this.name = "GitHubError"
    this.failure = failure
  }
}

/** A plain account of the failure, for logs and scripts. */
function describe(failure: GitHubFailure): string {
  switch (failure.kind) {
    case "not found":
      return `${failure.repository} doesn't exist or isn't public`
    case "empty":
      return `${failure.repository} has no commits`
    case "too large":
      return `${failure.repository}'s ${failure.limit === "archive" ? "archive exceeds" : "unpacked files exceed"} ${megabytes(failure.bytes)}, the most read`
    case "unavailable":
      return `GitHub answered ${failure.status} for ${failure.repository}`
  }
}

/**
 * Throws `failure` for `response`, cancelling its body first: an unread
 * body holds its connection open until it's collected.
 */
export async function refuse(
  response: Response,
  failure: GitHubFailure
): Promise<never> {
  await response.body?.cancel().catch(() => undefined)
  throw new GitHubError(failure)
}

/** Bytes in megabytes, as limits are written: 100000000 → "100 MB". */
export function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1000 / 1000)} MB`
}
