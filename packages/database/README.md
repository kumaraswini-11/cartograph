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

## The local database

Supabase's local stack runs in Docker; Docker Desktop must be running. From
this folder:

| Command            | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `pnpm db:start`    | Starts the local stack (Postgres, the Data API, Studio)       |
| `pnpm db:reset`    | Rebuilds the local database from the migrations               |
| `pnpm db:test`     | Runs the pgTAP tests in `supabase/tests` against it           |
| `pnpm db:advisors` | Supabase's security and performance checks; fails on an error |
| `pnpm db:types`    | Regenerates `src/database.types.ts` from the local schema     |
| `pnpm db:stop`     | Stops the local stack                                         |

A schema change is a new migration (`pnpm exec supabase migration new
<name>`), never an edit made in a console (spec 007, C-03). After one, run
`db:reset`, `db:test`, `db:advisors` and `db:types`.

## Docs

[Spec 006](../../docs/specs/006-sign-in-and-organizations/spec.md) ·
[Spec 007](../../docs/specs/007-organization-dashboard/spec.md) ·
[Supabase: local development](https://supabase.com/docs/guides/local-development) ·
[Supabase: testing](https://supabase.com/docs/guides/local-development/testing/overview)
