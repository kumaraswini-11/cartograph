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

**Status:** Done
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

**Status:** Done; the map page's blocking time and target size carried to
`012`
**Blocked by:** T03
**Covers:** C-07, FR-014, AC-07, D-14

**What to build:**

- Remove the sample routes, files and script.
- The home page points to sign-in.
- A fixture of its own for the coverage banner's test.

**Done when:**

- [x] Nothing in the repository reads a checked-in map. A repository with
      path aliases or a nested app, analysed locally, shows the coverage
      banner with its figure: `t3-oss/create-t3-app`, "Coverage 48.2%",
      mapped from the dashboard on the production build, its stages passing
      on the page with no reload.
- [x] A 5,000-file map's page response is measured against Vercel's 4.5 MB,
      and the result is recorded in the plan: about 2.8 MB.
- [x] Lighthouse on the home page and an analysis page, recorded in the
      plan (Risks). Home meets `012`'s thresholds. The analysis page meets
      LCP and CLS, but its blocking time (the map's drawing, as before 008)
      and the map's target size on a phone don't: both carried to `012`
      AC-13.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

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

**Status:** In progress: every criterion passes locally; the deployed checks
follow the merge
**Blocked by:** T04, T05, T06
**Covers:** AC-01 to AC-12; `006` AC-01 (GitHub, Google), AC-02, AC-03,
AC-05, AC-07; `007` AC-01 to AC-09

**Locally, before merge** (2026-10-17):

| AC    | How                       | Result                                                                                                                                                          |
| ----- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Browser, production build | `t3-oss/create-t3-app` from the dashboard: Fetching, Parsing and Storing by name, each with its sentence, no reload, then its map; and by the owner, signed in. |
| AC-02 | Browser (owner)           | `expressjs/express` submitted again opened the same analysis: one analysis in the organization.                                                                 |
| AC-03 | Browser (owner)           | `someone-nope-zz/missing-repo` failed at fetching, "…doesn't exist or isn't public.", and the dashboard read Failed.                                            |
| AC-04 | Browser (owner); tokens   | A second tab's dashboard moved with the run; with real Clerk tokens, the organization's topic heard every stage in order.                                       |
| AC-05 | pgTAP                     | A run 11 minutes in is stale, 9 minutes in isn't (`runs_test.sql`).                                                                                             |
| AC-06 | pgTAP; tokens             | Another organization's member reads no message (`progress_test.sql`); with a real Clerk token, never joins the channel.                                         |
| AC-07 | Browser, production build | `t3-oss/create-t3-app`'s map shows "Coverage 48.2%: some lines may be missing".                                                                                 |
| AC-08 | pgTAP                     | The stored results name the run's commit, and can't be stored without one.                                                                                      |
| AC-09 | Vitest                    | GitLab, malformed and non-repository GitHub addresses refused, each with its reason (`address.test.ts`).                                                        |
| AC-10 | Browser (owner)           | Re-run on `expressjs/express` added a second run, done, to the same analysis.                                                                                   |
| AC-11 | pgTAP                     | A second start during a run returns that run; the database refuses a second unfinished run.                                                                     |
| AC-12 | Vitest                    | An archive past the limit stops downloading, and the run fails naming 100 MB.                                                                                   |

**Done when:**

- [x] Every acceptance criterion passes locally, each checked the way its row
      says.
- [ ] On production, after merge (migrations applied, T06): the browser
      ones again, and the run's `waitUntil` seen keeping a run alive on
      Vercel (plan D-04).
- [ ] `006`'s and `007`'s carried checks pass on production, and their
      tasks files say so.
- [ ] Build status at the top of this file set to Done.
