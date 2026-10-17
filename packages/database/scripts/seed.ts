// `pnpm db:seed --organization org_…`: sample analyses for development,
// into the local database only (spec 007, C-04, plan D-08). Until spec 008
// creates analyses, they let the dashboard's list, its run states and
// switching organization be built and checked. The organization is a real
// Clerk one (Clerk's dashboard → Organizations, its ID), since only its
// members' tokens can read its rows. Repeat --organization for several;
// --repositories owner/a,owner/b chooses what each gets. Run twice, it adds
// nothing twice.
//
// The SQL goes through the CLI's `db query --local`, which reaches the local
// stack only: this script can't write to a deployed database.
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { parseArgs } from "node:util"

/** Sample repositories, each with its latest run as the dashboard shows it. */
const SAMPLES: Array<[repository: string, run: string | null]> = [
  ["shadcn-ui/taxonomy", "done"],
  ["lujakob/nestjs-realworld-example-app", "parsing"],
  ["hagopj13/node-express-boilerplate", "failed"],
  ["expressjs/express", "stale"],
  ["date-fns/date-fns", null],
]

/** Each sample run's columns, as the schema requires them together. */
const RUNS: Record<string, string> = {
  done: `'done', null, 'Done', now(), now()`,
  parsing: `'parsing', null, 'Parsing', now(), null`,
  failed: `'failed', 'fetching', 'The repository doesn''t exist or isn''t public', now(), now()`,
  // Unfinished for longer than STALE_RUN_AFTER (spec 008, FR-013).
  stale: `'parsing', null, 'Parsing', now() - interval '1 hour', null`,
}

const { values } = parseArgs({
  options: {
    organization: { type: "string", multiple: true },
    repositories: { type: "string" },
  },
})
const organizations = values.organization ?? []
if (organizations.length === 0) {
  throw new Error("Name an organization: pnpm db:seed --organization org_…")
}
for (const id of organizations) {
  // Every value that reaches the SQL is checked against Clerk's ID format.
  if (!/^org_[A-Za-z0-9]+$/.test(id))
    throw new Error(`Not an organization ID: ${id}`)
}
const wanted = values.repositories?.split(",")
const samples = wanted
  ? SAMPLES.filter(([repository]) => wanted.includes(repository))
  : SAMPLES

const statements = organizations.flatMap((organization) => [
  `insert into public.organizations (id) values ('${organization}') on conflict do nothing;`,
  ...samples.flatMap(([repository, run]) => [
    `insert into public.analyses (organization_id, repository) values ('${organization}', '${repository}') on conflict do nothing;`,
    ...(run === null
      ? []
      : [
          `insert into public.runs (organization_id, analysis_id, state, failed_stage, message, started_at, finished_at)
           select '${organization}', id, ${RUNS[run]}
           from public.analyses
           where organization_id = '${organization}' and repository = '${repository}'
             and not exists (select 1 from public.runs r where r.analysis_id = analyses.id);`,
        ]),
  ]),
])

// The package's own CLI, run by Node, the same on every platform.
const require = createRequire(import.meta.url)
const cli = join(
  dirname(require.resolve("supabase/package.json")),
  "dist",
  "supabase.js"
)
// One statement, as `db query` runs only one: the inserts in a block, which
// also makes the seed all or nothing.
const sql = `do $$ begin\n${statements.join("\n")}\nend $$;`
try {
  execFileSync(process.execPath, [cli, "db", "query", "--local", sql], {
    cwd: join(import.meta.dirname, ".."),
    stdio: "pipe",
  })
} catch (error) {
  const output = (error as { stdout?: Buffer }).stdout?.toString() ?? ""
  throw new Error(`The local database refused the seed: ${output.trim()}`)
}
console.log(
  `Seeded ${samples.length} ${samples.length === 1 ? "analysis" : "analyses"} for ${organizations.join(", ")} in the local database.`
)
