// Every sentence a run writes, in one place (spec 008, plan D-13): what
// each stage is doing, and why a run failed. They're stored with the run,
// so the dashboard, the analysis page and anything later read the same
// words.
import { GitHubError, MAX_ARCHIVE_BYTES, megabytes } from "@workspace/github"
import type { Stage } from "@workspace/database"

const count = new Intl.NumberFormat("en")

/** The first seven characters of a commit, as GitHub shows it. */
export const shortCommit = (commit: string) => commit.slice(0, 7)

export const RUN_MESSAGES = {
  reading: (repository: string) => `Reading ${repository}'s default branch`,
  downloading: (repository: string, commit: string) =>
    `Downloading ${repository} at ${shortCommit(commit)}`,
  parsing: (repository: string) =>
    `Parsing the JavaScript and TypeScript in ${repository}`,
  storing: (files: number) => `Storing the map of ${count.format(files)} files`,
  done: (files: number, commit: string) =>
    `Mapped ${count.format(files)} files at ${shortCommit(commit)}`,
  /** A stale run, ended by a re-run (the spec's edge case). */
  stopped: "Stopped without finishing.",
  /** Over the parser's limit (spec 008, FR-009). */
  tooManyFiles: (repository: string, files: number, limit: number) =>
    `${repository} has ${count.format(files)} JavaScript and TypeScript files, over the ${count.format(limit)} Cartograph maps.`,
} as const

/** Why a run failed in `stage`, in words a member can act on (FR-007). */
export function failureMessage(
  repository: string,
  stage: Stage,
  error: unknown
): string {
  if (error instanceof GitHubError) {
    const { failure } = error
    switch (failure.kind) {
      case "not found":
        // FR-008.
        return `${repository} doesn't exist or isn't public.`
      case "empty":
        return `${repository} has no commits to map.`
      case "too large":
        // FR-009: the message names the limit.
        return failure.limit === "archive"
          ? `${repository}'s archive is over ${megabytes(MAX_ARCHIVE_BYTES)}, the most Cartograph downloads.`
          : `${repository}'s files unpack to over ${megabytes(failure.bytes)}, the most Cartograph reads.`
      case "unavailable":
        return `GitHub didn't send ${repository} (it answered ${failure.status}). Try again later.`
    }
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return `GitHub took too long to send ${repository}. Try again later.`
  }
  return `Something went wrong while ${stage} ${repository}. Try running it again.`
}
