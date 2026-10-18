import "@tanstack/react-start/server-only"

import { fileAtCommit } from "@workspace/github"
import { MAX_FILE_BYTES, contentHash } from "@workspace/parser"

/** Why a file's source can't be used: it isn't what was parsed. */
export class SourceMismatch extends Error {}

/**
 * A file's text at the analysed commit (spec 009, plan D-04), checked
 * against the parser's hash of its bytes: anything else would be explained,
 * or looked up in a chat, in its place. One fetch for both (spec 010).
 */
export async function sourceAtCommit(
  repository: string,
  commit: string,
  record: { path: string; hash: string }
): Promise<string> {
  const bytes = await fileAtCommit(repository, commit, record.path, {
    maxBytes: MAX_FILE_BYTES,
  })
  if (contentHash(bytes) !== record.hash) {
    throw new SourceMismatch(
      `${record.path} at ${commit.slice(0, 7)} doesn't match the analysed file`
    )
  }
  return new TextDecoder().decode(bytes)
}
