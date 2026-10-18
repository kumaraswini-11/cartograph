import { tool } from "ai"
import type {
  JSONValue,
  ToolExecutionOptions,
  ToolSet,
  UIMessageStreamWriter,
} from "ai"
import { z } from "zod"

import {
  fileDetails,
  findFiles,
  insights,
  neighbours,
  sentenceOf,
  sentenceText,
  walk,
} from "@workspace/graph"
import type { EdgeIndex, MapInput } from "@workspace/graph"

import { resolvePath } from "../grounding.ts"
import type { PathIndex } from "../grounding.ts"
import { fenced, shortenSource } from "../source.ts"
import type { Tracing } from "../tracing.ts"
import { MAX_LOOKUPS, MODEL_LIST_LIMIT } from "./limits.ts"

/** The analysis a question is about: its map input, indexed once. */
export type ChatAnalysis = {
  input: MapInput
  index: EdgeIndex
  paths: PathIndex
}

/** What the lookups need from outside: passed in, so tests stand in for it. */
export type LookupDeps = {
  traced: Tracing["traced"]
  /** A file's source at the analysed commit, checked against its hash. */
  source: (path: string) => Promise<string>
  /** The organization's cached explanation of a file, or null (D-07). */
  explanation: (path: string) => Promise<string | null>
}

/** One question's lookups so far, counted as they run (FR-005). */
export type LookupCount = {
  made: number
  /** A lookup was asked for past the limit, and not run. */
  stopped: boolean
}

/**
 * A lookup's output for the model (plan D-05): every list longer than
 * `MODEL_LIST_LIMIT` cut to its first paths and a count, so a walk of
 * every level fits; the browser gets the output whole.
 */
export function forModel(value: unknown): JSONValue {
  if (Array.isArray(value)) {
    const items = value.map(forModel)
    if (items.length <= MODEL_LIST_LIMIT) return items
    return [
      ...items.slice(0, MODEL_LIST_LIMIT),
      `…and ${items.length - MODEL_LIST_LIMIT} more`,
    ]
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, forModel(item)])
    )
  }
  return value as JSONValue
}

const pathInput = z.object({
  path: z
    .string()
    .min(1)
    .describe("The file's path as a lookup returned it, or its file name."),
})

/** What the model gets for a lookup asked for past the limit. */
type NotRun = { notRun: string }

const isNotRun = (output: unknown): output is NotRun =>
  typeof output === "object" && output !== null && "notRun" in output

/** A path tool's answer when the analysis has no such file. */
const notFound = (path: string) => ({ path, found: false as const })

/** A lookup's output for the model as JSON, with long lists cut (D-05). */
const asJson = ({ output }: { output: unknown }) => ({
  type: "json" as const,
  value: forModel(output),
})

const findInput = z.object({
  query: z.string().min(1).describe("A file name, or part of a path."),
})

/**
 * The chat's lookups (spec 010, FR-002) as tools, each running the same
 * query the map and detail pane use (FR-003, C-01). Every one is its own
 * traced run (D-08) and writes itself to the stream before and after it
 * runs, so the member sees it as soon as it finishes (FR-004). Past
 * `MAX_LOOKUPS`, a lookup isn't run, and the model is told so.
 */
export function lookupTools(
  analysis: ChatAnalysis,
  deps: LookupDeps,
  count: LookupCount,
  writer: UIMessageStreamWriter
) {
  const { input, index, paths } = analysis

  /** A lookup's `execute`: counted, traced, and written to the stream. */
  function counted<TInput, TOutput>(
    name: string,
    run: (given: TInput) => TOutput | Promise<TOutput>
  ) {
    const traced = deps.traced(`lookup:${name}`, async (given: TInput) =>
      run(given)
    )
    return async (
      given: TInput,
      { toolCallId }: ToolExecutionOptions<Record<string, unknown>>
    ): Promise<TOutput | NotRun> => {
      if (count.made >= MAX_LOOKUPS) {
        count.stopped = true
        return { notRun: `The limit of ${MAX_LOOKUPS} lookups is reached.` }
      }
      count.made += 1
      writer.write({
        type: "tool-input-available",
        toolCallId,
        toolName: name,
        input: given,
      })
      try {
        const output = await traced(given)
        writer.write({ type: "tool-output-available", toolCallId, output })
        return output
      } catch (error) {
        writer.write({
          type: "tool-output-error",
          toolCallId,
          errorText: "This lookup failed.",
        })
        throw error
      }
    }
  }

  const resolved = (path: string) => resolvePath(path, paths)
  type PathInput = z.infer<typeof pathInput>

  /**
   * A walk from a file, every level, as the detail pane walks (AC-04),
   * named as its tool is, so the stream and the traces tell them apart.
   */
  const walked = (
    name: "blast_radius" | "dependency_chain",
    direction: "dependents" | "dependencies"
  ) =>
    counted(name, ({ path }: PathInput) => {
      const found = resolved(path)
      return found === null
        ? notFound(path)
        : { path: found, found: true, levels: walk(index, found, direction) }
    })

  return {
    find_files: tool({
      description:
        "Find files by name or path; best match first. Use it before any lookup that needs an exact path.",
      inputSchema: findInput,
      execute: counted(
        "find_files",
        ({ query }: z.infer<typeof findInput>) => ({
          query,
          files: findFiles(input.files, query),
        })
      ),
      toModelOutput: asJson,
    }),
    file_details: tool({
      description:
        "A file's role, whether it's an entry point, its line count, and its counts of dependents (fan-in) and dependencies (fan-out).",
      inputSchema: pathInput,
      execute: counted("file_details", ({ path }: PathInput) => {
        const file = fileDetails(input.files, resolved(path) ?? path)
        return file === null ? notFound(path) : { found: true, ...file }
      }),
      toModelOutput: asJson,
    }),
    neighbours: tool({
      description:
        "A file's dependencies (the files it imports) and dependents (the files that import it), one edge away.",
      inputSchema: pathInput,
      execute: counted("neighbours", ({ path }: PathInput) => {
        const found = resolved(path)
        return found === null
          ? notFound(path)
          : { path: found, found: true, ...neighbours(index, found) }
      }),
      toModelOutput: asJson,
    }),
    blast_radius: tool({
      description:
        "Every file that depends on a file, level by level: what may break if it changes.",
      inputSchema: pathInput,
      execute: walked("blast_radius", "dependents"),
      toModelOutput: asJson,
    }),
    dependency_chain: tool({
      description: "Every file a file depends on, level by level.",
      inputSchema: pathInput,
      execute: walked("dependency_chain", "dependencies"),
      toModelOutput: asJson,
    }),
    routes: tool({
      description:
        "The routes the frameworks declare: method, path and the file handling each.",
      inputSchema: z.object({}),
      execute: counted("routes", () => ({
        routes: input.routes.map(({ method, path, file }) => ({
          method,
          path,
          file,
        })),
        notRecovered: input.routesNotRecovered,
      })),
      toModelOutput: asJson,
    }),
    insights: tool({
      description:
        "Unimported, heavily imported and oversized files, and import cycles.",
      inputSchema: z.object({}),
      execute: counted("insights", () => ({
        // Whole, for the browser to render as the pane does; the model
        // reads the sentence.
        insights: insights(input).map((insight) => ({
          ...insight,
          sentence: sentenceText(sentenceOf(insight)),
        })),
      })),
      toModelOutput: asJson,
    }),
    explanation: tool({
      description:
        "The explanation already written for a file, if there is one.",
      inputSchema: pathInput,
      execute: counted("explanation", async ({ path }: PathInput) => {
        const found = resolved(path)
        if (found === null) return notFound(path)
        const body = await deps.explanation(found)
        return { path: found, found: true, explanation: body }
      }),
      toModelOutput: asJson,
    }),
    source: tool({
      description:
        "A file's source at the analysed commit, shortened to its first lines.",
      inputSchema: pathInput,
      execute: counted("source", async ({ path }: PathInput) => {
        const found = resolved(path)
        if (found === null) return notFound(path)
        const { text, lines, shortened } = shortenSource(
          await deps.source(found)
        )
        return { path: found, found: true, lines, shortened, source: text }
      }),
      // C-03: the source reaches the model fenced off as data.
      toModelOutput: ({ output }) =>
        !isNotRun(output) && "source" in output
          ? {
              type: "text" as const,
              value: `${output.path}${output.shortened ? `, shortened to its first lines of ${String(output.lines)}` : ""}:\n${fenced(output.source)}`,
            }
          : asJson({ output }),
    }),
  } satisfies ToolSet
}

/** The lookups' names, as the stream and the browser know them. */
export type LookupName = keyof ReturnType<typeof lookupTools>
