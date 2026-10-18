# @workspace/github

Reads public GitHub repositories with no token: what counts as a
repository's address, which commit its default branch is at, and its files
at that commit, from an archive that is streamed, filtered and capped.

## Why a separate package

Fetching a repository is one job, and two packages need it: the web app
fetches the repository a run analyses (spec 008) and a file's source to
explain (spec 009), and the golden scripts fetch theirs
(`@workspace/golden`). One package keeps one way to do it (AGENTS.md: shared
code goes in a package once a second package needs it). It keeps the
network out of the parser, which must never touch it (spec 001, C-01), and
it is the one place that names GitHub's addresses (spec 008 plan, D-01).

## Use

```ts
import { repositoryFrom } from "@workspace/github/address"
import { defaultBranchHead, extractArchive } from "@workspace/github"
import { isReadFile } from "@workspace/parser/paths"

const address = repositoryFrom("https://github.com/facebook/react/tree/main")
if ("refusal" in address) throw new Error(address.refusal)

const { commit } = await defaultBranchHead(address.repository)
await extractArchive(address.repository, commit, directory, {
  contents: isReadFile,
})
```

- `repositoryFrom` has no Node.js import, so a form can check an address in
  the browser with the rules the server applies. It's exported on its own,
  at `@workspace/github/address`.
- `defaultBranchHead` reads git's own HTTP protocol (`info/refs`), so it uses
  none of the REST API's 60 requests an hour.
- `extractArchive` writes every path the archive has. Contents are written
  only where `contents` says, and the other files are written empty. Each
  link is written as a link to itself, so nothing can follow it out of the
  folder. It stops past `MAX_ARCHIVE_BYTES` downloaded or
  `MAX_EXTRACTED_BYTES` written.
- `fileAtCommit(repository, commit, path, { maxBytes })` reads one file at a
  commit, from GitHub's raw host, holding at most `maxBytes` (spec 009,
  plan D-04): an explanation's source, and whether a file has changed.
- A download gives up after `DOWNLOAD_TIMEOUT_MS` (two minutes).
- Every failure is a `GitHubError` whose `failure` names its kind: not
  found, empty, too large (with the limit) or unavailable.

## Status

Used by the web app (a run's archive, a file's source, the default branch's
commit for staleness) and by `@workspace/golden`.

## Docs

[Spec 008](../../docs/specs/008-repository-analysis/spec.md) and its
[plan](../../docs/specs/008-repository-analysis/plan.md), D-01 to D-03 ·
[Spec 009's plan](../../docs/specs/009-file-explanations/plan.md), D-04.
