# 008 — Repository analysis: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** In progress

## T01 — Addresses and archives

**Status:** Done
**Blocked by:** none
**Covers:** FR-001, FR-005, FR-008, FR-009, C-06, AC-09, AC-12, D-01 to D-03

**What to build:** `@workspace/github`:

- the address rules, as an isomorphic subpath;
- the default branch's commit, read over git's HTTP protocol;
- the streamed, filtered, capped extraction.

The golden scripts' `checkout` moves onto it.

**Done when:**

- [x] A GitLab address, a malformed one and a GitHub address that isn't a
      repository are each refused with their reason. `.git`, branch and path
      forms normalise to the repository.
- [x] An archive past `MAX_ARCHIVE_BYTES` stops at the limit, and the error
      names the limit. Links and escaping paths are refused.
- [x] `facebook/react` is written with contents only for the files the parser
      reads, and parses exactly as a full copy does. The parser's
      and detection's golden scripts still pass through the new `checkout`.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T02 — Runs in storage

**Status:** Done
**Blocked by:** none
**Covers:** FR-002 to FR-004, FR-007, FR-013, FR-015, C-01, C-05, AC-05,
AC-08, AC-11, D-06 to D-08, D-12

**What to build:**

- the migration: the run's columns, the one-unfinished-run index, `stale`,
  `results`, and the write functions;
- their pgTAP tests and regenerated types;
- `@workspace/database`'s `runs.ts`, and `readAnalysis`;
- `listAnalyses` with `stale`.

**Done when:**

- [x] pgTAP passes AC-05, AC-08 and AC-11, and every earlier test, now
      covering `results`. `supabase db advisors` reports no error.
- [x] Submitting an address the organization already has returns that
      analysis and starts no run. A re-run over a stale run ends the stale
      one as failed first.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — A submitted address becomes a stored map

**Status:** Done, but for the pages seen signed in, which T04's browser
check covers
**Blocked by:** T01, T02
**Covers:** FR-001 to FR-009, FR-014, FR-015, AC-02, AC-03, AC-08, AC-10,
D-04, D-05, D-13

**What to build:**

- First, the spike (D-05): the worker in the production build, and
  `waitUntil` on the request (D-04).
- Then the address form on the dashboard, and `submitRepository` and
  `rerunAnalysis`.
- `runAnalysis` run through `runAfterResponse`, with the parse in the
  worker.
- `/analyses/$analysisId`, showing the stage stored, the failure, or the
  stored map with its coverage banner, and the re-run button. A reload
  shows progress until T04 pushes it.

**Done when:**

- [x] The spike's result is recorded in the plan, as D-05 asks.
- [x] Locally, `expressjs/express` (3 s) and `facebook/react` (33 s) each
      end done, through the real run, worker and storage, and the stored
      result names the commit read. Their maps, seen signed in, move into
      T04's browser check.
- [x] A missing repository fails at fetching with its sentence. Submitting a
      known address returns its analysis and starts no run, and a re-run
      starts a new run of the same analysis (Vitest and pgTAP). Seen
      signed in, in T04's browser check.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — Progress, pushed

**Status:** Done (browser check by the owner, 2026-10-17)
**Blocked by:** T03
**Covers:** FR-010 to FR-012, C-02 to C-04, AC-01, AC-04, AC-06, D-09 to
D-11

**What to build:**

- The broadcast trigger and the Realtime policy, with AC-06's pgTAP test.
- The `VITE_SUPABASE_*` rename, in `.env.example`, `env.server.ts` and the
  docs.
- `subscribeToStages` and `useStages`.
- Live stages on the analysis page and on the dashboard.

**Done when:**

- [x] Signed in, locally: T03's pages work end to end. An address becomes
      its map, a known address opens its analysis, a missing repository
      reads failed, a GitLab address is refused, and re-run starts a run.
- [x] pgTAP passes AC-06: another organization's member reads no message on
      the topic. Also with real Clerk tokens on the local Realtime: a member
      of another organization never joins the channel and hears nothing.
- [x] With real Clerk tokens on the local Realtime, a member hears each
      stage of a run, by name and in order, on the analysis's topic and on
      the organization's.
- [x] Signed in, locally: those stages pass on the analysis page without a
      reload, and on the dashboard in a second tab. A page opened mid-run
      shows the current stage at once.
- [x] The rename is complete: no `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY`
      left under the old name.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — The samples go

**Status:** Todo
**Blocked by:** T03
**Covers:** C-07, FR-014, AC-07, D-14

**What to build:**

- Remove the sample routes, files and script.
- The home page points to sign-in.
- A fixture of its own for the coverage banner's test.

**Done when:**

- [ ] Nothing in the repository reads a checked-in map. A repository with
      path aliases or a nested app, analysed locally, shows the coverage
      banner with its figure.
- [ ] A 5,000-file map's page response is measured against Vercel's 4.5 MB,
      and the result is recorded in the plan.
- [ ] Lighthouse on the home page and an analysis page still meets `012`'s
      thresholds.
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T06 — Migrations reach production on merge

**Status:** Todo, the owner's, once, before this branch merges
**Blocked by:** none
**Covers:** `007` T03, `007` AC-09

**What to build:** nothing in the repository. The workflow is already
there, and it only needs credentials, which can't be committed. The owner
adds the three GitHub Actions secrets the plan lists. The merge then runs
"Database migrations", which applies `007`'s and `008`'s migrations
together.

**Done when:**

- [ ] The secrets are in place before the merge.
- [ ] After the merge, the workflow's run on `main` passes, and production
      answers `/rest/v1/analyses` with a permission error, not "table not
      found".
- [ ] Production's schema matches the migrations: `supabase db diff --linked`
      is empty (`007` AC-09), and `007`'s T03 says so.

## T07 — Acceptance

**Status:** Todo
**Blocked by:** T04, T05, T06
**Covers:** AC-01 to AC-12; `006` AC-01 (GitHub, Google), AC-02, AC-03,
AC-05, AC-07; `007` AC-01 to AC-09

**Done when:**

- [ ] Every acceptance criterion passes, each checked the way its row says.
      The browser ones are checked locally before merge, and on production
      after it (plan, Testing).
- [ ] `006`'s and `007`'s carried checks pass on production, and their
      tasks files say so.
- [ ] Build status at the top of this file set to Done.
