# 008 — Repository analysis: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

A member pastes an address on the dashboard. A server function normalises
it, then records the analysis and its first run in one database call that
takes the organization from Clerk's verified session. It answers with the
analysis, and the page moves to the analysis's own page. The run carries on
after the response, in the same server invocation, for at most
`MAX_RUN_SECONDS`. It reads the default branch's commit over git's HTTP
protocol and streams that commit's archive from GitHub, writing contents
only for the files the parser and detection read. It parses and detects off
the main thread, then stores the two results with the commit. Each stage change is a
row update, and a trigger on that row pushes the stage and its message to
private Realtime channels. Whether a member may join a channel is a policy
on Realtime's messages table, written the same way as every read policy
(C-04). Pages read the current state from storage, then follow the pushes.

The address and the archive are GitHub's concern, not the web app's. They go
in a new package, `@workspace/github`, which the golden scripts' download
also moves into, so there is one way to fetch a repository. Writes to runs
and results stay in `@workspace/database`, next to the reads.

### Where each vendor sits

Each service is named in one place, behind an interface in the product's own
terms. Replacing a service means rewriting that one place, and the parser,
detection and the map never know which services are in use.

| Concern                 | Today                    | The only place that names it                                         | What the rest of the code sees                              |
| ----------------------- | ------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Storage and its pushes  | Supabase                 | `@workspace/database`                                                | `startAnalysis`, `readAnalysis`, `subscribeToStages`, …     |
| Where repositories live | GitHub (the product's)   | `@workspace/github`                                                  | `repositoryFrom`, `defaultBranchHead`, `extractArchive`     |
| Identity                | Clerk                    | `session.server.ts`, `storage.server.ts`, `progress.ts` (`getToken`) | the session's organization; a token getter                  |
| Work after the response | Nitro (any host it runs) | `background.server.ts`                                               | `runAfterResponse(promise)`                                 |
| The host's limits       | Vercel                   | `platform.ts`, `@workspace/github`'s `limits.ts`                     | named thresholds (`MAX_RUN_SECONDS`, `MAX_EXTRACTED_BYTES`) |

## Modules and interfaces

| Module                                                              | What it does                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/github/src/address.ts` (`@workspace/github/address`)      | `repositoryFrom(address)`: `{ repository: "owner/name" }`, or `{ refusal }` with the reason (FR-001, AC-09, the spec's edge cases). Imports nothing from Node, so the form can check an address in the browser as the server does.                                                                                                                           |
| `packages/github/src/head.ts`                                       | `defaultBranchHead(repository)`: the default branch and its commit, read from git's HTTP `info/refs` (D-02). A missing or private repository throws a `GitHubError` of kind "not found" (FR-008).                                                                                                                                                            |
| `packages/github/src/archive.ts`                                    | `extractArchive(repository, commit, directory, { contents })`: streams the archive and counts its bytes, stopping past `MAX_ARCHIVE_BYTES` (FR-009, AC-12). Every path is written, with contents only where `contents` accepts; links become links to themselves; paths that leave `directory` are refused; writing stops past `MAX_EXTRACTED_BYTES` (D-03). |
| `packages/github/src/limits.ts`                                     | `MAX_ARCHIVE_BYTES`, `MAX_EXTRACTED_BYTES`, `DOWNLOAD_TIMEOUT_MS`.                                                                                                                                                                                                                                                                                           |
| `packages/golden/src/index.ts`                                      | `checkout` downloads through `extractArchive` instead of the system's `tar`.                                                                                                                                                                                                                                                                                 |
| `packages/database/supabase/migrations/`                            | The run's columns, the one-unfinished-run index, `stale`, `results`, the write functions, the broadcast trigger and the Realtime policy (Data).                                                                                                                                                                                                              |
| `packages/database/supabase/tests/`                                 | pgTAP: AC-05, AC-06, AC-08, AC-11, and `results` covered by the existing tests that read every table from the catalog.                                                                                                                                                                                                                                       |
| `packages/database/src/runs.ts`                                     | `runWriter(access)`, with the secret key, server-only: `startAnalysis`, `rerunAnalysis`, `advanceRun`, `failRun`, `finishRun` (D-06). Each takes the organization or the run it acts on and nothing else, and the client behind them is never handed out.                                                                                                    |
| `packages/database/src/analyses.ts`                                 | `listAnalyses` gains each latest run's `stale`. `readAnalysis(storage, id)` returns the analysis with its latest run, and `readResult(storage, id)` its stored results, each with the member's token.                                                                                                                                                        |
| `packages/database/src/progress.ts`                                 | `organizationTopic`, `analysisTopic` and `stageChangeFrom`: the topics, and a push read as `{ analysisId, stage, message }` (D-09).                                                                                                                                                                                                                          |
| `packages/database/src/follow.ts` (`@workspace/database/follow`)    | `subscribeToStages` and `followStages`: a private channel and its `stage` events. Kept out of the package's entry, so a page imports Supabase's client once it's interactive.                                                                                                                                                                                |
| `apps/web/src/lib/run.server.ts`                                    | `runAnalysis(run)`: fetching, then parsing, then storing, each stage written before it starts. Any error ends the run as failed in the stage it reached, with its sentence (FR-006, FR-007).                                                                                                                                                                 |
| `apps/web/src/lib/parse.worker.ts`                                  | `parseRepository` then `detectFrameworks` on the extracted directory, in a worker thread (D-05).                                                                                                                                                                                                                                                             |
| `apps/web/src/lib/run-messages.ts`                                  | Every stage's and failure's sentence, in one place (D-13).                                                                                                                                                                                                                                                                                                   |
| `apps/web/src/lib/analyses.functions.ts`                            | `submitRepository` and `rerunAnalysis`, POST: the organization comes from `auth()`, never from the request. The run is started with `runAfterResponse`. `getAnalysis` (GET) returns the analysis page's data.                                                                                                                                                |
| `apps/web/src/lib/background.server.ts`                             | `runAfterResponse(promise)`: hands the promise to the current request's `waitUntil`, as Nitro provides it on every host (D-04).                                                                                                                                                                                                                              |
| `apps/web/src/lib/analyses.server.ts`                               | `submitAddress`, `rerun` and `analysisPage`, behind the server functions: the session's organization, the run started after the response, and the stored results read back through the parser's and detection's schemas into the map's input (D-12).                                                                                                         |
| `apps/web/src/components/analysis/`                                 | `RunProgress` (the stages by name, and the sentence as a live region), `RunBadge` (a run's state in words, shared by the dashboard and the map's header) and `RerunButton`.                                                                                                                                                                                  |
| `apps/web/src/lib/progress.ts`                                      | `useStages(topic, isKnown)`: the browser's storage client with Clerk's `getToken` as its `accessToken`; the newest pushed change per analysis, which `withChange` lays over the run storage last gave. It reads the route again once joined, when a run ends, and when a change names an analysis the page doesn't have (D-11).                              |
| `apps/web/src/routes/_identity/_signed-in/dashboard.tsx`            | The address form (FR-001), and the list with live stages and a stale mark (FR-010, FR-013).                                                                                                                                                                                                                                                                  |
| `apps/web/src/routes/_identity/_signed-in/analyses.$analysisId.tsx` | An unfinished run's stages; a failed run's stage and reason; the stored map with its coverage banner (FR-014). The re-run button sits on the analysis (FR-003).                                                                                                                                                                                              |
| Removed (C-07)                                                      | The two `routes/sample.*` routes, `src/sample/`, `lib/sample.*`, `scripts/sample.ts`, the home page's sample list and `web`'s dependency on `@workspace/golden`.                                                                                                                                                                                             |

## Data

```sql
-- One analysis per repository per organization (C-01), whatever the case:
-- GitHub reads Facebook/React as facebook/react. 007's unique
-- (organization_id, repository) becomes:
create unique index analyses_one_per_repository
  on analyses (organization_id, lower(repository));

-- runs gains what a run reports (007 left these to 008).
alter table runs
  add column message text not null default '',   -- the current stage's sentence, or why it failed
  add column failed_stage text check (failed_stage in ('fetching', 'parsing', 'storing')),
  add column commit text,                         -- set once fetching has read it (FR-005)
  add constraint runs_failure_names_its_stage
    check ((state = 'failed') = (failed_stage is not null)),
  add constraint runs_end_when_finished
    check ((state in ('done', 'failed')) = (finished_at is not null));

-- At most one unfinished run per analysis (FR-004, AC-11): a second
-- insert fails, whatever raced it.
create unique index runs_one_unfinished on runs (analysis_id)
  where state in ('fetching', 'parsing', 'storing');

-- STALE_RUN_AFTER, defined once, on the database's clock (D-08).
-- PostgREST reads it as a computed field: runs(state, stale).
create function stale(runs) returns boolean language sql stable
  set search_path = '' as $$
    select $1.state in ('fetching', 'parsing', 'storing')
      and $1.started_at < now() - interval '10 minutes'
  $$;

-- An analysis's stored result: the parser's and detection's output at the
-- commit they came from (FR-015, AC-08). One row per analysis, replaced by
-- each done run, so a failed re-run leaves the last map in place.
results (
  analysis_id uuid primary key,
  organization_id text not null references organizations on delete cascade,
  commit text not null,
  parsed jsonb not null,                          -- ParseResult (001)
  detection jsonb not null,                       -- Detection (002)
  stored_at timestamptz not null default now(),
  foreign key (organization_id, analysis_id)
    references analyses (organization_id, id) on delete cascade
)
```

- **Grants and policies.** Members keep `select` only, and `results` gets
  007's policy. The write functions are callable by `service_role` alone, so
  members stay read-only and 007's "a member can't write" test still holds.
- **The write functions.**
  - `start_analysis(organization, repository)` adds the organization's row if
    missing. It then returns the existing analysis with no run (FR-002), or
    creates the analysis and its first run.
  - `rerun_analysis(organization, analysis)` ends any stale run as failed,
    "stopped without finishing" (the spec's edge case). It then starts a run,
    or returns the unfinished one (FR-004).
  - `finish_run(run, parsed, detection)` writes the result and marks the run
    done in one transaction, so a done run always has its result.
- **The broadcast trigger.** `after insert or update of state, message on
runs` calls `realtime.send` once for each topic (D-09).
- **The Realtime policy.** On `realtime.messages`, `select` for
  `authenticated` where `extension = 'broadcast'` and
  `starts_with((select realtime.topic()), 'organization:' || <the token's o.id>)`.
  There is no `insert` policy, so members can listen but not send.

## Decisions

- **D-01** **A package for GitHub, `@workspace/github`.**
  - It owns three things: what counts as a repository's address, how to read
    a repository's default branch and commit, and how to fetch an archive
    safely.
  - _Why:_ this is the second place that downloads an archive (the golden
    scripts' `checkout` is the first), and AGENTS.md wants one source for each
    concern. It is also a job the parser must stay out of (`001` C-01).
  - The address rules are their own subpath with no Node imports. Both the
    form and the server function can then validate with the same code.
  - _Rejected:_ code inside `apps/web`, which the golden scripts couldn't
    use.
- **D-02** **The commit comes from git's HTTP protocol; the archive is taken
  at that commit.**
  - `GET https://github.com/<owner>/<name>.git/info/refs?service=git-upload-pack`
    names the default branch (`symref=HEAD:refs/heads/…`) and its commit. It
    needs no token.
  - The archive is then `https://codeload.github.com/<owner>/<name>/tar.gz/<commit>`.
    The commit recorded is therefore exactly the commit parsed (AC-08), even
    if the branch moves during the download.
  - A missing or private repository answers `401` (git) or `404` (codeload),
    and the run fails at fetching (FR-008). A renamed one redirects, and
    `fetch` follows the redirect (the spec's edge case).
  - _Rejected:_
    - GitHub's REST API, which allows 60 unauthenticated requests an hour per
      address, shared by every run on Vercel's addresses (C-06 rules out a
      token).
    - `git clone`, which is slower and needs a git binary the function doesn't
      have.
- **D-03** **The archive is streamed, never held whole.**
  - The pipeline: `fetch` body → byte count → gunzip → `tar` (node-tar).
  - Byte count: past `MAX_ARCHIVE_BYTES` (100 MB, the spec) the download is
    aborted and the run fails, naming the limit (FR-009). GitHub's codeload
    sends no length, so the limit is enforced by counting.
  - What's extracted: every path a checkout has, but contents only for the
    files the parser and detection read. That rule is the parser's own
    `isReadFile`: source files, every `.json` and `pnpm-workspace.yaml`. The
    other files are written empty.
    - _Why every path:_ the resolver answers by whether a file exists (an
      import of `./logo.svg` resolves when it's there). The walk records
      excluded folders and links wherever they are. So leaving a file out
      would change the result.
    - _Measured:_ a full copy and one with only these contents give
      identical parser and detection results for `expressjs/express`,
      `facebook/react` and `vitejs/vite` (5 links among 15 excluded paths).
      React's contents drop from 40.6 MB to 23.1 MB, and vite's from 17.7 MB
      to 3.4 MB.
  - What's refused: absolute paths and `..` (node-tar). Links are never
    extracted as the archive has them, since anything that followed one
    could read outside the folder. Each is written instead as a link to
    itself, which leads nowhere (`ELOOP`). The walk still finds a link
    there, as spec 001 records it.
  - `MAX_EXTRACTED_BYTES` is 400 MB. Vercel gives a function 500 MB of
    `/tmp`, and the limit stops a small archive that unpacks into a large one
    before the disk fills.
  - Each run extracts into its own folder under `os.tmpdir()`, removed when
    the run ends however it ends.
  - _Rejected:_
    - Buffering the archive (memory equal to the archive's size).
    - The system's `tar`, which can't filter or count bytes as it goes.
- **D-04** **The run carries on after the response, through the request's
  own `waitUntil`, which Nitro provides on every host.**
  - On Vercel, Nitro's `web` entry sets `request.waitUntil` from Vercel's
    function context. On Node, srvx sets the same property, and Nitro's
    graceful shutdown waits for that work. The app names no host.
  - The host keeps the function alive until the promise settles, within its
    `maxDuration`. That is `MAX_RUN_SECONDS`, 300 s, and `facebook/react`
    takes about 15 s.
  - With no `waitUntil` (Vite's dev server), the promise simply runs on in
    the long-lived process.
  - One module, `background.server.ts`, is the only place that knows this.
  - A function that dies mid-run leaves the run unfinished. C-05 and FR-013
    make that run visible as stale rather than hiding it.
  - _Rejected:_
    - `@vercel/functions`' `waitUntil`, which ties the app to one host for
      something Nitro already gives on all of them.
    - A queue service, which the spec doesn't need at this size (`000`).
    - Making the member's request wait for the whole run.
- **D-05** **The parse and the detection run in a `node:worker_threads`
  worker.**
  - _Why:_ both are synchronous and take about 11 s on `facebook/react`.
    Vercel's Fluid compute sends other requests to the same instance, so that
    blocking would stall every one of them (Node.js: "Don't block the event
    loop"). Only the result, a structured clone, crosses back.
  - _How:_ `parse.worker.ts` is its own worker. The server loads it with a
    dynamic `import()`, so the build gives it a chunk of its own, and
    `parseInWorker` starts a `Worker` on that same file (`import.meta.url`).
    Inside the worker, the module finds `workerData` and does the job. No
    separate worker entry is needed, so nothing depends on the bundler.
  - _Spike, 2026-10-17, on the production build:_
    - The worker chunk is emitted (`_ssr/parse.worker-….mjs`), and oxc's
      native binding loads inside it.
    - The oxc packages must stay outside the bundle. The `ssr` environment
      marks them external, Nitro's `traceDeps` copies them and their
      platform's binary into the output, and `web` declares them so pnpm
      lets Nitro resolve them.
    - Parsing `date-fns` (1,785 files, 2.4 s): a 10 ms timer on the main
      thread fired 0 times when the parse ran there, and kept firing (145
      ticks, Windows' timer resolution) when it ran in the worker.
    - `getRequest()` carries `waitUntil` (D-04). The Node build's is srvx's,
      and work scheduled with it ran after the response. The Vercel build
      chooses Nitro's `web` entry, which sets `req.waitUntil` from Vercel's
      function context, with `maxDuration` 300. That one is seen running on
      the deployment (T07).
- **D-06** **Every write goes through the server with the secret key.**
  - The organization comes from Clerk's verified session (`auth()`), never
    from the request.
  - Each write is a Postgres function that `service_role` alone may execute,
    taking only the organization or run it acts on.
  - _Why:_
    - The run writes for up to 300 s after the request. Clerk's token lives
      60 s, so no member token outlasts the run.
    - Write grants for members would let anyone mark a run done, or write a
      map, straight through the Data API.
    - The rule from 007 D-07 still holds: the secret key is used server-side
      only, by `@workspace/database` only, and never with a user's token.
    - Reads keep the member's token and the policies (007 C-02).
  - _Rejected:_ insert policies for members on `analyses` and `runs`.
- **D-07** **One unfinished run is a constraint, not a check.**
  - The partial unique index makes a racing second start fail with `23505`.
    The functions catch that and answer with the run already under way
    (FR-004, AC-11).
  - Because a stale run stays unfinished until something ends it,
    `rerun_analysis` ends stale runs first, in the same transaction. That is
    the spec's edge case.
- **D-08** **"Stale" is computed by the database: a `stale(runs)` computed
  field.**
  - `STALE_RUN_AFTER` (10 minutes, the spec) is then written once, in SQL,
    and compared against the database's clock. That is the same clock that
    wrote `started_at`.
  - The dashboard reads it like any column (AC-05).
  - _Rejected:_ comparing in TypeScript, which would mean a second copy of the
    threshold and a server clock that may drift from the database's.
- **D-09** **Pushes go through Realtime Broadcast from the database, as
  `realtime.send` in a trigger, on private channels.**
  - _Payload:_ `{ analysisId, stage, message }`, never the row (C-03).
  - _Topics:_
    - `organization:<id>` for the dashboard.
    - `organization:<id>:analysis:<id>` for an analysis's page, so that page
      filters nothing.
  - _Who may join:_ the Realtime policy above. The topic's prefix is the
    organization, so the check is one comparison with the token's claim and
    needs no join (Supabase: complex Realtime policies slow every join).
    `starts_with`, not `like`, because Clerk's IDs contain `_`, a `like`
    wildcard.
  - _Rejected:_
    - `realtime.broadcast_changes`, which sends the record.
    - Postgres Changes, which sends the row and which Supabase steers away
      from at scale.
    - A channel per analysis on the dashboard, which hits the per-client
      channel limit.
    - Public channels: their "Allow public access" setting is turned off in
      production (Supabase: Realtime authorization).
- **D-10** **The browser reaches Realtime directly, with Clerk's token.**
  - `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` become
    `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The server and
    the browser read the same two values, as `VITE_CLERK_PUBLISHABLE_KEY`
    already works. Vite exposes only `VITE_` variables to the browser, and
    Supabase documents the publishable key as safe there.
  - The browser's client takes `getToken` from Clerk's `useAuth` as its
    `accessToken`. realtime-js calls that "on connect and on every heartbeat",
    so the 60-second token is renewed before Realtime would close the channel
    at expiry.
  - _Rejected:_ handing the two values to the browser through a loader, which
    would be a second path for the same configuration.
- **D-11** **Read first, then follow.**
  - Each page renders on the server from storage, so the current stage shows
    at once (the spec's edge case).
  - After hydration it subscribes. Once the channel reports `SUBSCRIBED`, it
    reloads the route's data once, which catches any change made between the
    render and the subscription.
  - When a push says the run is done or failed, the route reloads, so the
    stored map or the failure comes from storage too (C-02).
  - Nothing renders differently in the browser, so no `ClientOnly` is
    needed. The subscription is an effect.
- **D-12** **The stored result is the parser's and detection's output as
  `jsonb`.**
  - It is validated on the way out with their own schemas (`parseResult`,
    `detection`) and turned into the map's input on the server
    (`toMapInput`), as the samples were.
  - _Why:_ FR-015 stores the results themselves, not the picture. `009` and
    `010` look facts up in them, and Postgres compresses large `jsonb` by
    itself.
- **D-13** **Fixed sentences for stages and failures**, as `005`'s insights
  are.
  - Fetching: "Downloading owner/name at abc1234".
  - A refusal names its cause: "owner/name doesn't exist or isn't public";
    "The archive is over 100 MB, the most Cartograph downloads".
  - One module holds them all, so the dashboard, the analysis page and the
    stored message can't disagree.
- **D-14** **The samples go (C-07).**
  - The map route reads only stored analyses, at `/analyses/$analysisId`.
  - The home page points to sign-in instead of listing samples.
  - `@workspace/golden` stays, for the parser's and detection's golden
    scripts.
  - The coverage banner's test gets a fixture of its own rather than a
    sample.

## Stack notes

- **TanStack Start.**
  - `submitRepository` and `rerunAnalysis` are `POST` server functions, so
    the CSRF middleware covers them.
  - The analysis route is server-rendered like the dashboard, with
    `shouldReload: true`.
- **Vercel.**
  - `waitUntil`'s work shares the function's timeout. If the function times
    out, the work is cancelled, which is what makes a run stale.
  - Function responses are limited to 4.5 MB. A map of `MAX_FILES` (5,000)
    files is the largest page, and T05 measures it.
- **Realtime.**
  - A channel's permissions are checked when it's joined and cached for the
    connection. A member removed from the organization keeps receiving until
    the next token, which is at most one heartbeat away.
  - The policy reads `realtime.topic()`.
- **PostgREST.** A computed field is a function that takes the table's row
  type, in an exposed schema. It's selected by name: `runs(state, stale)`.
- **node-tar.**
  - The `filter` option decides each entry.
  - `onwarn`, and the stream's `error`, report a corrupt archive.
  - The `strip: 1` option drops GitHub's `<name>-<commit>/` prefix.

## Thresholds

| Name                  | Value      | Where               | Why                                                                        |
| --------------------- | ---------- | ------------------- | -------------------------------------------------------------------------- |
| `MAX_ARCHIVE_BYTES`   | 100 MB     | `@workspace/github` | The spec, measured.                                                        |
| `STALE_RUN_AFTER`     | 10 minutes | SQL, `stale(runs)`  | The spec, measured.                                                        |
| `MAX_EXTRACTED_BYTES` | 400 MB     | `@workspace/github` | Under Vercel's 500 MB of `/tmp`, with room for the function's own files.   |
| `DOWNLOAD_TIMEOUT_MS` | 120 s      | `@workspace/github` | The golden scripts' value. Leaves most of `MAX_RUN_SECONDS` for the parse. |

## What needs doing outside the code

By the repository's owner:

- **GitHub Actions secrets**, once, before this branch merges (T06):
  `SUPABASE_ACCESS_TOKEN` (a scoped token), `SUPABASE_DB_PASSWORD`,
  `SUPABASE_PROJECT_ID`. The merge then runs "Database migrations", which
  applies `007`'s and `008`'s migrations together; nothing needs re-running.
  Without them, that run fails as `007`'s did, since the credentials can't
  live in the repository.
- **Vercel** (Production and Preview):
  - rename `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to their `VITE_`
    names (D-10);
  - add `SUPABASE_SECRET_KEY` and `CLERK_WEBHOOK_SIGNING_SECRET` if they
    aren't there yet.
- **Supabase**, production: Realtime settings → turn off "Allow public
  access" (D-09).
- **Clerk:** a webhook endpoint for `organization.deleted` at production's
  `/api/webhooks/clerk` (from 007).
- **`.env.local`:** the local stack's Supabase values under the new names,
  and a real `whsec_` secret.

## Testing

- **Vitest, `@workspace/github`.**
  - AC-09: the address cases, accepted and refused, each with its reason.
  - `info/refs` parsing, against a recorded response.
  - AC-12: an archive served from a local HTTP server is stopped at the
    limit.
  - Links and paths outside the folder are refused, and only kept files are
    written.
- **pgTAP.**
  - AC-05: a run started 11 minutes ago is stale, 9 minutes ago isn't.
  - AC-06: a member of another organization reads no message on the topic.
  - AC-08: `results.commit` is required, and `finish_run` writes it.
  - AC-11: a second start returns the unfinished run, and a stale run is
    ended before a re-run.
  - The existing every-table tests now cover `results` too.
- **Vitest, the web app.**
  - `runAnalysis`, with the network and storage passed in: the stages in
    order; a failure in each stage recorded with that stage and its
    sentence; the temporary folder removed every time.
  - The server functions take the organization from the session.
- **Browser, locally (Docker's Supabase with the dev Clerk):** AC-01 to AC-04,
  AC-07 and AC-10 on real repositories, `facebook/react` among them.
- **Deployed, after merge:** the same browser checks, plus 006's and 007's
  carried checks. Migrations reach the cloud only from `main` (007 D-05), so
  a preview of this branch has none of its tables.

## Risks

- **GitHub throttles codeload or git HTTP from Vercel's addresses.** The run
  fails at fetching with GitHub's answer, never silently. A token stays out
  of scope (C-06).
- **The worker can't be bundled (D-05).** Then the parse runs on the main
  thread and stalls other requests on that instance for its length. That is
  measured and recorded, and revisited before T03 is done.
- **A run killed past 300 s.** It shows as stale after 10 minutes, and a
  re-run ends it (C-05).
- **Previews write to production's data** (007 D-05, until staging exists).
  Runs started from a preview are real analyses, owned by the organization
  that started them.
- **A large map's page nears 4.5 MB.** Measured in T05 (2026-10-17): the map's
  input runs from 316 to 551 bytes per file (`TypeScript-Website`,
  `facebook/react` 3,536 files at 1.4 MB, `withastro/astro`,
  `microsoft/playwright`, `trpc/trpc`, `nestjs/nest` the densest). At
  `MAX_FILES`, that's about 2.8 MB, which the page carries once, under the
  4.5 MB with room to spare, and about 150 kB gzipped. Vercel's limit names no
  exception for streamed responses, so it's treated as hard.
- **The map page's main thread (`012` AC-13).** Measured in T05 on the
  production build, Lighthouse 13.5.0's mobile profile, median of 5:
  - Home: performance 100, LCP 0.71 s, TBT 86 ms, CLS 0, accessibility 100.
  - An analysis's map (`t3-oss/create-t3-app`, 182 files): LCP 1.62 s and
    CLS 0.001 within `012`'s thresholds, but TBT 1,126 ms, against the
    200 ms that `INP_MAX` implies. Nearly all of it is hydrating the page
    and laying out the map on the main thread, which is `003`'s drawing,
    not 008's: the sample map measured 365 to 1,200 ms before 008.
  - Accessibility 96: the map's folder boxes fall under WCAG 2.2's 24 px
    target size (2.5.8) when the map zooms out to fit a phone's width.

  Both are carried to `012`, whose AC-13 measures the map at `MAX_FILES` on
  this profile. Supabase's client stays off the page's critical path:
  `@workspace/database/follow` is imported once the page is interactive.
