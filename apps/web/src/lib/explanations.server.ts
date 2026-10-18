import "@tanstack/react-start/server-only"

import {
  INFERRED_ROLES,
  MODEL,
  PROMPT_VERSION,
  askModel,
  boxToExplain,
  explainBox,
  explainFile,
  fileToExplain,
  languageModel,
} from "@workspace/ai"
import type { ExplainDeps, ExplainOutcome, InferredRole } from "@workspace/ai"
import { explanationWriter, readExplanation } from "@workspace/database"
import { GitHubError, defaultBranchHead, fileAtCommit } from "@workspace/github"
import { MAX_FILE_BYTES, contentHash } from "@workspace/parser"

import { currentOrganization } from "./analyses.server"
import type { ExplainResult, ExplainSubject, Staleness } from "./explanations"
import { getServerEnv } from "./env.server"
import { ModelCallsSpent, spendModelCall } from "./limits.server"
import { SourceMismatch, sourceAtCommit } from "./source.server"
import { analysisFacts, readStoredAnalysis } from "./stored-analysis.server"
import { requestStorage } from "./storage.server"
import { serverTracing } from "./tracing.server"

const isInferredRole = (role: string | null): role is InferredRole =>
  role !== null && (INFERRED_ROLES as ReadonlyArray<string>).includes(role)

/**
 * A file or box of the member's organization's analysis, explained (spec
 * 009, plan Approach). The analysis, its stored result and the cache are
 * read with the member's token, so another organization's are simply not
 * there; the facts come from the stored result, never the request, so no
 * one can have an explanation written from neighbours that aren't real.
 */
export async function explainSelection(
  analysisId: string,
  subject: ExplainSubject
): Promise<ExplainResult> {
  const organizationId = await currentOrganization()
  const env = getServerEnv()
  const traces = serverTracing()
  const failed = (message: string): ExplainResult => ({
    traced: traces.enabled,
    status: "failed",
    message,
  })
  const storage = await requestStorage()

  const read = await readStoredAnalysis(storage, analysisId)
  if (read?.result == null) return failed("This analysis has no map yet.")
  const { analysis, result } = read
  const facts = analysisFacts(analysis.repository, result)

  const writer = explanationWriter({
    url: env.VITE_SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  })
  const ask = askModel(languageModel(env.GEMINI_API_KEY))
  const deps: ExplainDeps = {
    traced: traces.traced,
    read: async (cacheKey) => {
      const cached = await readExplanation(storage, cacheKey)
      if (cached === null) return null
      return {
        body: cached.body,
        inferredRole: isInferredRole(cached.inferredRole)
          ? cached.inferredRole
          : null,
      }
    },
    write: (cacheKey, explanation) =>
      writer.store({
        organizationId,
        analysisId,
        cacheKey,
        subject: subject.path,
        kind: subject.kind,
        body: explanation.body,
        inferredRole: explanation.inferredRole,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
      }),
    // Each ask is a model call, counted against the organization's limit
    // first (`012` FR-007); a cached explanation asks nothing.
    ask: async (request) => {
      await spendModelCall(storage, { organizationId, kind: "explanation" })
      return ask(request)
    },
  }

  let outcome: ExplainOutcome
  try {
    if (subject.kind === "file") {
      const file = fileToExplain(facts, subject.path)
      if (file === null) {
        return failed(`${subject.path} isn't in this analysis.`)
      }
      outcome = await explainFile(file, {
        ...deps,
        // Fetched only on a miss, at the analysed commit, and refused
        // unless it matches the hash the parser recorded (D-04).
        source: () => sourceAtCommit(analysis.repository, result.commit, file),
      })
    } else {
      // The map's own boxes, so a box here is the box the member sees.
      const box = boxToExplain(facts, subject.path)
      if (box === null) return failed("This box isn't on the analysis's map.")
      outcome = await explainBox(box, deps)
    }
  } catch (error) {
    if (error instanceof ModelCallsSpent) {
      return {
        traced: traces.enabled,
        status: "paused",
        resumesAt: error.resumesAt,
      }
    }
    console.error(
      `Explaining ${subject.kind} ${subject.path} of analysis ${analysisId} failed:`,
      error
    )
    return failed(failureMessage(error))
  } finally {
    // A serverless function can end as soon as it responds (plan D-03).
    await traces.flush()
  }
  return { traced: traces.enabled, ...outcome }
}

/**
 * Whether an explanation still matches the repository (spec 009, FR-014,
 * FR-015, plan D-10): the default branch's commit against the analysed
 * one, then, for a file, its bytes there against the parser's hash. A box
 * is only as current as the branch: checking each of its files would take
 * a request apiece. Read with the member's token, as the explanation is.
 */
export async function stalenessOf(
  analysisId: string,
  subject: ExplainSubject
): Promise<Staleness> {
  const read = await readStoredAnalysis(await requestStorage(), analysisId)
  if (read?.result == null) return { status: "unknown" }
  const { analysis, result } = read

  let head: string
  try {
    head = (await defaultBranchHead(analysis.repository)).commit
  } catch (error) {
    // Gone, private or unreachable: nothing to compare with.
    console.error(`The head of ${analysis.repository} wasn't read:`, error)
    return { status: "unknown" }
  }
  if (head === result.commit) return { status: "current" }
  if (subject.kind === "box") return { status: "moved" }

  const record = result.parsed.files.find((file) => file.path === subject.path)
  if (record === undefined) return { status: "unknown" }
  try {
    const bytes = await fileAtCommit(analysis.repository, head, record.path, {
      maxBytes: MAX_FILE_BYTES,
    })
    return { status: contentHash(bytes) === record.hash ? "moved" : "changed" }
  } catch (error) {
    if (error instanceof GitHubError) {
      // Deleted, or grown past what's read: either way, not what was parsed.
      if (error.failure.kind === "not found") return { status: "changed" }
      if (error.failure.kind === "too large") return { status: "changed" }
    }
    console.error(`${record.path} at ${head.slice(0, 7)} wasn't read:`, error)
    return { status: "unknown" }
  }
}

function failureMessage(error: unknown): string {
  if (error instanceof SourceMismatch) {
    return "The file's source doesn't match what was analysed, so it wasn't sent to the model. Re-run the analysis."
  }
  if (error instanceof GitHubError) {
    return "GitHub didn't send the file's source. Try again later."
  }
  return "The explanation couldn't be written. Try again later."
}
