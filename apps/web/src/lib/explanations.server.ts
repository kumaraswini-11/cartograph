import "@tanstack/react-start/server-only"

import { createHash } from "node:crypto"

import {
  INFERRED_ROLES,
  MODEL,
  PROMPT_VERSION,
  askModel,
  explainFile,
  languageModel,
  pathIndex,
  tracing,
} from "@workspace/ai"
import type { InferredRole } from "@workspace/ai"
import {
  explanationWriter,
  readAnalysis,
  readExplanation,
  readResult,
} from "@workspace/database"
import { detection } from "@workspace/frameworks"
import { GitHubError, fileAtCommit } from "@workspace/github"
import { MAX_FILE_BYTES, isTooLarge, parseResult } from "@workspace/parser"

import { currentOrganization } from "./analyses.server"
import type { ExplainResult } from "./explanations"
import { getServerEnv } from "./env.server"
import { requestStorage } from "./storage.server"

const isInferredRole = (role: string | null): role is InferredRole =>
  role !== null && (INFERRED_ROLES as ReadonlyArray<string>).includes(role)

/**
 * A file of the member's organization's analysis, explained (spec 009,
 * plan Approach). The analysis, its stored result and the cache are read
 * with the member's token, so another organization's are simply not there;
 * the file's neighbours come from the stored result, never the request, so
 * no one can have an explanation written from neighbours that aren't real.
 * The source is fetched only on a cache miss, at the analysed commit, and
 * refused unless it matches the hash the parser recorded (D-04).
 */
export async function explainSelection(
  analysisId: string,
  path: string
): Promise<ExplainResult> {
  const organizationId = await currentOrganization()
  const env = getServerEnv()
  const traces = tracing({
    tracing: env.LANGSMITH_TRACING,
    apiKey: env.LANGSMITH_API_KEY,
    endpoint: env.LANGSMITH_ENDPOINT,
    project: env.LANGSMITH_PROJECT,
  })
  const storage = await requestStorage()

  const analysis = await readAnalysis(storage, analysisId)
  const stored = await readResult(storage, analysisId)
  if (analysis === null || stored === null) {
    return {
      traced: traces.enabled,
      status: "failed",
      message: "This analysis has no map yet.",
    }
  }
  const parsed = parseResult.parse(stored.parsed)
  if (isTooLarge(parsed)) throw new Error(`Analysis ${analysisId} has no files`)
  const record = parsed.files.find((file) => file.path === path)
  if (record === undefined) {
    return {
      traced: traces.enabled,
      status: "failed",
      message: `${path} isn't in this analysis.`,
    }
  }
  const role =
    detection.parse(stored.detection).files.find((file) => file.path === path)
      ?.role ?? "unidentified"

  const writer = explanationWriter({
    url: env.VITE_SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  })
  try {
    const outcome = await explainFile(
      {
        repository: analysis.repository,
        path,
        hash: record.hash,
        detectedRole: role,
        dependencies: parsed.edges
          .filter((edge) => edge.from === path)
          .map((edge) => edge.to),
        dependents: parsed.edges
          .filter((edge) => edge.to === path)
          .map((edge) => edge.from),
        analysisPaths: pathIndex(parsed.files.map((file) => file.path)),
      },
      {
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
            subject: path,
            kind: "file",
            body: explanation.body,
            inferredRole: explanation.inferredRole,
            model: MODEL,
            promptVersion: PROMPT_VERSION,
          }),
        source: () =>
          sourceAtCommit(analysis.repository, stored.commit, record),
        ask: askModel(languageModel(env.GEMINI_API_KEY)),
      }
    )
    return { traced: traces.enabled, ...outcome }
  } catch (error) {
    console.error(`Explaining ${path} of analysis ${analysisId} failed:`, error)
    return {
      traced: traces.enabled,
      status: "failed",
      message: failureMessage(error),
    }
  } finally {
    // A serverless function can end as soon as it responds (plan D-03).
    await traces.flush()
  }
}

/** Why a file's source can't be used: it isn't what was parsed. */
class SourceMismatch extends Error {}

/**
 * The file's text at the analysed commit, checked against the parser's
 * SHA-256 of its bytes: anything else would be explained in its place.
 */
async function sourceAtCommit(
  repository: string,
  commit: string,
  record: { path: string; hash: string }
): Promise<string> {
  const bytes = await fileAtCommit(repository, commit, record.path, {
    maxBytes: MAX_FILE_BYTES,
  })
  const hash = createHash("sha256").update(bytes).digest("hex")
  if (hash !== record.hash) {
    throw new SourceMismatch(
      `${record.path} at ${commit.slice(0, 7)} doesn't match the analysed file`
    )
  }
  return new TextDecoder().decode(bytes)
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
