# @workspace/database

The database where storage lives (CONTEXT.md: Storage): Supabase's project
folder, with the migrations that build the schema and its row-level
policies, and the pgTAP tests that prove them; the table types generated
from that schema; and the client every storage request goes through, which
carries the signed-in person's token.

## Why a separate package

Storage is one job: the schema, who may read each row, and the client that
asks. Kept apart, its migrations and database tests are this package's own
tasks, and only a package that declares it can reach storage (spec 006,
plan D-08; spec 007, plan D-01). It knows nothing of the web app or of
Clerk: the token arrives as a function.

## Use

```ts
import { storageClient } from "@workspace/database"

const storage = storageClient({ url, publishableKey, getToken })
const { data } = await storage.from("analyses").select("repository")
```

Who sees which row is the policies' decision, never the caller's: no query
filters by organization (spec 007, C-02).

Reads, with the signed-in person's token:

- `listAnalyses(storage)`: the dashboard's list, each analysis with its
  latest run and whether that run is stale.
- `readAnalysis(storage, id)` and `readResult(storage, id)`: one
  analysis with its latest run, and its stored results.

Writes go only through the server, with the secret key, and only through
the database's own functions (spec 008, plan D-06):

```ts
import { runWriter } from "@workspace/database"

const runs = runWriter({ url, secretKey })
const { analysisId, runId } = await runs.startAnalysis({
  organizationId, // from the verified session, never the request
  repository,
  message,
})
```

Progress is pushed, not polled (spec 008, plan D-09): a trigger broadcasts
each change of a run's stage on private Realtime topics, and a member may
hear only their own organization's, by a policy written like every read
policy. `followStages(access, analysisTopic(organizationId, analysisId), {
onStage, onJoined })` follows one analysis, and `organizationTopic` all of
them. It's exported alone, at `@workspace/database/follow`, so a page can
load Supabase's client once it's interactive.

Explanations (spec 009) are cached per organization: `readExplanation(storage,
cacheKey)` reads with the member's token, and `explanationWriter({ url,
secretKey }).store(…)` writes with the secret key, keeping a key's first row
when two writes race. The table itself refuses a surface role as an inferred
one (C-02).

The per-organization limits (spec 012) are counted, not cached:
`runTimesSince(storage, since, atMost)` and `modelCallTimesSince(…)` read the
latest times with the member's token, and `modelCallWriter({ url, secretKey
}).record({ organizationId, kind })` records a model call.

`deleteOrganization` is the other writer: the organization-deleted webhook's
(spec 007, D-07). Members can't call either: the functions are granted to
the secret key's role alone, and the pgTAP tests check it.

## The local database

Supabase's local stack runs in Docker; Docker Desktop must be running. From
this folder:

| Command                             | What it does                                                            |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `pnpm db:start`                     | Starts the local stack (Postgres, the Data API, Studio)                 |
| `pnpm db:reset`                     | Rebuilds the local database from the migrations                         |
| `pnpm db:test`                      | Runs the pgTAP tests in `supabase/tests` against it                     |
| `pnpm db:advisors`                  | Supabase's security and performance checks; fails on an error           |
| `pnpm db:types`                     | Regenerates `src/database.types.ts` from the local schema               |
| `pnpm db:seed --organization org_…` | Sample analyses for that Clerk organization, in the local database only |
| `pnpm db:stop`                      | Stops the local stack                                                   |

A schema change is a new migration (`pnpm exec supabase migration new
<name>`), never an edit made in a console (spec 007, C-03). After one, run
`db:reset`, `db:test`, `db:advisors` and `db:types`.

## Deploying the schema

The deployed database gets its schema only from these migrations, applied
by `.github/workflows/database-migrations.yml` whenever one reaches `main`
(spec 007, C-03); it can also be run by hand from the Actions tab. It reads
three repository secrets: GitHub → the repository → Settings → Secrets and
variables → Actions → New repository secret.

| Secret                  | Where its value comes from                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → your account (top right) → Account preferences → Access Tokens → Generate new token. Make it a scoped one, limited to this project and what migrations need, never a classic full-account token (`sbp_…`). |
| `SUPABASE_DB_PASSWORD`  | The database password chosen when the project was made. If it's lost: Supabase Dashboard → the project → Project Settings → Database → Reset database password (then update this secret).                                       |
| `SUPABASE_PROJECT_ID`   | The project's reference, the part before `.supabase.co` in its URL: Supabase Dashboard → the project → Project Settings → General → Project ID.                                                                                 |

## Docs

[Spec 006](../../docs/specs/006-sign-in-and-organizations/spec.md) ·
[Spec 007](../../docs/specs/007-organization-dashboard/spec.md) ·
[Supabase: local development](https://supabase.com/docs/guides/local-development) ·
[Supabase: testing](https://supabase.com/docs/guides/local-development/testing/overview)
