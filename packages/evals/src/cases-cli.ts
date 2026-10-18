// `pnpm --filter @workspace/evals cases`: derives the case set from the
// pinned archives and writes cases.json (spec 011, FR-002). Run it when a
// rule changes; the test then holds the file to the rules (AC-06).
import { writeFileSync } from "node:fs"
import { stdout } from "node:process"

import { CASES_FILE, casesJson, freshCases } from "./cases.ts"

const cases = await freshCases()
writeFileSync(CASES_FILE, casesJson(cases))
const count = (kind: string) => cases.filter((c) => c.kind === kind).length
stdout.write(
  `Wrote ${cases.length.toString()} cases: ${count("file").toString()} files, ${count("box").toString()} boxes, ${count("question").toString()} questions.\n`
)
