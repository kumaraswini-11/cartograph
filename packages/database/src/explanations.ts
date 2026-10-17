import type { StorageClient } from "./client.ts"
import { secretClient } from "./secret.ts"
import type { SecretAccess } from "./secret.ts"

/** What an explanation is about (spec 009, FR-001, FR-002). */
export type ExplanationKind = "file" | "box"

/** An explanation as the cache holds it (spec 009, FR-010). */
export type StoredExplanation = {
  subject: string
  kind: ExplanationKind
  /** The paragraph, as the model wrote it. */
  body: string
  /** One of the fixed roles, for a file no adapter identified (FR-009). */
  inferredRole: string | null
  /** The exact model version it was written with (FR-012). */
  model: string
  promptVersion: number
  createdAt: string
}

/** An explanation to cache: what the server writes after a model call. */
export type NewExplanation = Omit<StoredExplanation, "createdAt"> & {
  /** From the verified session, never the request (spec 008, D-06). */
  organizationId: string
  analysisId: string
  cacheKey: string
}

/**
 * The current organization's explanation for `cacheKey`, or null on a miss
 * (spec 009, FR-010). It names no organization: the policy returns only the
 * token's organization's row (spec 007, C-02), so another organization's
 * explanation of the same file is never seen.
 */
export async function readExplanation(
  storage: StorageClient,
  cacheKey: string
): Promise<StoredExplanation | null> {
  const { data, error } = await storage
    .from("explanations")
    .select(
      "subject, kind, body, inferred_role, model, prompt_version, created_at"
    )
    .eq("cache_key", cacheKey)
    .maybeSingle()
  if (error) throw new Error(`Couldn't read the explanation: ${error.message}`)
  if (data === null) return null
  if (data.kind !== "file" && data.kind !== "box") {
    throw new Error(`An unknown explanation kind: ${data.kind}`)
  }
  return {
    subject: data.subject,
    kind: data.kind,
    body: data.body,
    inferredRole: data.inferred_role,
    model: data.model,
    promptVersion: data.prompt_version,
    createdAt: data.created_at,
  }
}

/** The cache's one write, with the secret key (spec 009, plan D-09). */
export type ExplanationWriter = {
  /**
   * Caches an explanation. A key already cached keeps its first row: two
   * tabs explaining the same file at once write one explanation.
   */
  store: (explanation: NewExplanation) => Promise<void>
}

/** The writer for explanations, with the secret key (server-only). */
export function explanationWriter(access: SecretAccess): ExplanationWriter {
  const secret = secretClient(access)
  return {
    async store(explanation) {
      const { error } = await secret.from("explanations").upsert(
        {
          organization_id: explanation.organizationId,
          analysis_id: explanation.analysisId,
          cache_key: explanation.cacheKey,
          subject: explanation.subject,
          kind: explanation.kind,
          body: explanation.body,
          inferred_role: explanation.inferredRole,
          model: explanation.model,
          prompt_version: explanation.promptVersion,
        },
        { onConflict: "organization_id,cache_key", ignoreDuplicates: true }
      )
      if (error) {
        throw new Error(
          `Couldn't cache the explanation of ${explanation.subject}: ${error.message}`
        )
      }
    },
  }
}
