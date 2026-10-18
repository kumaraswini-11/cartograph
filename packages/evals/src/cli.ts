// `pnpm eval` (spec 011, FR-007): runs every case, prints the scores per
// kind and overall, stores the run, compares it with the accepted one, and
// exits 1 if it fails the gate (FR-009). `pnpm eval --accept` also makes it
// the accepted run; `pnpm eval compare <run> <run>` compares two stored ones.
// The keys come from apps/web/.env.local (plan D-10).
import process, { argv, env, stdout } from "node:process"

import {
  CHAT_MODEL,
  CHAT_PROMPT_VERSION,
  MODEL,
  PROMPT_VERSION,
  languageModel,
  paced,
  tracing,
} from "@workspace/ai"

import { analyses, committedCases } from "./cases.ts"
import {
  comparisonLines,
  failures,
  percent,
  recordOf,
  scoreLines,
} from "./report.ts"
import { runCases } from "./run.ts"
import { acceptRun, acceptedRun, readRun, storeRun } from "./runs.ts"

/** The free tiers' requests a minute (ADR 0003; plan D-09). */
const EXPLAIN_PER_MINUTE = 5
/** Flash-Lite's is higher than Flash's; this stays under it until confirmed. */
const CHAT_PER_MINUTE = 10

const print = (lines: ReadonlyArray<string>) =>
  stdout.write(`${lines.join("\n")}\n`)

async function evaluate(accept: boolean): Promise<void> {
  const key = env.GEMINI_API_KEY
  if (key === undefined || key.trim() === "") {
    throw new Error(
      "GEMINI_API_KEY is missing: the evaluation reads apps/web/.env.local."
    )
  }
  // C-03, plan D-08: traced, in a project of its own.
  const traces = tracing({
    tracing: env.LANGSMITH_TRACING,
    apiKey: env.LANGSMITH_API_KEY,
    endpoint: env.LANGSMITH_ENDPOINT,
    project: "cartograph-evals",
  })
  const cases = committedCases()
  print([
    `${String(cases.length)} cases. Tracing ${traces.enabled ? "to cartograph-evals" : "is off"}.`,
  ])

  let done = 0
  const results = await runCases(
    cases,
    await analyses(),
    {
      explainModel: paced(languageModel(key, MODEL), EXPLAIN_PER_MINUTE),
      chatModel: paced(languageModel(key, CHAT_MODEL), CHAT_PER_MINUTE),
      traced: traces.traced,
    },
    (r) => {
      done += 1
      print([
        `${String(done).padStart(2)}/${String(cases.length)} ${r.kind.padEnd(8)} ${r.ended.padEnd(10)} grounded ${percent(r.scores.grounded)}, coverage ${percent(r.scores.coverage)}${r.scores.lookupUse === undefined ? "" : `, lookup use ${percent(r.scores.lookupUse)}`}  ${(r.ms / 1000).toFixed(1)} s  ${r.id}`,
      ])
    }
  )
  await traces.flush()

  const run = recordOf(
    results,
    {
      explainModel: MODEL,
      explainPrompt: PROMPT_VERSION,
      chatModel: CHAT_MODEL,
      chatPrompt: CHAT_PROMPT_VERSION,
    },
    new Date().toISOString()
  )
  print(["", ...scoreLines(run)])
  const name = storeRun(run)
  print(["", `Stored as runs/${name}.`])

  const accepted = acceptedRun()
  if (accepted !== null) print(["", ...comparisonLines(accepted, run)])
  const failed = failures(run, accepted)
  if (failed.length > 0) print(["", "Failed:", ...failed])
  if (accept) {
    acceptRun(name)
    print(["", `Accepted runs/${name} as the run to compare with.`])
  }
  // The status, not exit(): output on its way to a pipe is written in full.
  if (failed.length > 0) process.exitCode = 1
}

const [command, ...rest] = argv.slice(2)
if (command === "compare") {
  const [before, after] = rest
  if (before === undefined || after === undefined) {
    print(["Usage: pnpm eval compare <run file> <run file>"])
    process.exitCode = 2
  } else {
    print(comparisonLines(readRun(before), readRun(after)))
  }
} else {
  await evaluate(command === "--accept" || rest.includes("--accept"))
}
