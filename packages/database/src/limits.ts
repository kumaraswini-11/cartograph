// What the per-organization limits count (spec 012, FR-006, FR-007, plan
// D-05): runs from the runs table, model calls from their own table. Read
// with the member's token, so the policy confines each count to their
// organization; a call is recorded with the secret key.
import type { StorageClient } from "./client.ts"
import { secretClient } from "./secret.ts"
import type { SecretAccess } from "./secret.ts"

/** What a model call was for (FR-007). */
export type ModelCallKind = "explanation" | "chat"

// Each returns the times, ISO 8601 and newest first, of at most `atMost`
// rows since `since`: enough to tell whether a limit of `atMost` is
// reached, and when the oldest of them leaves the window. Two queries, not
// one over either table, so each keeps its generated row type.

/** The member's organization's latest runs since `since` (FR-006). */
export async function runTimesSince(
  storage: StorageClient,
  since: Date,
  atMost: number
): Promise<Array<string>> {
  const { data, error } = await storage
    .from("runs")
    .select("started_at")
    .gte("started_at", since.toISOString())
    .order("started_at", { ascending: false })
    .limit(atMost)
  if (error) throw new Error(`Couldn't count runs: ${error.message}`)
  return data.map((run) => run.started_at)
}

/** The member's organization's latest model calls since `since` (FR-007). */
export async function modelCallTimesSince(
  storage: StorageClient,
  since: Date,
  atMost: number
): Promise<Array<string>> {
  const { data, error } = await storage
    .from("model_calls")
    .select("called_at")
    .gte("called_at", since.toISOString())
    .order("called_at", { ascending: false })
    .limit(atMost)
  if (error) throw new Error(`Couldn't count model calls: ${error.message}`)
  return data.map((call) => call.called_at)
}

/** The model calls' one write, with the secret key (plan D-05). */
export type ModelCallWriter = {
  record: (call: {
    organizationId: string
    kind: ModelCallKind
  }) => Promise<void>
}

/** The writer for model calls, with the secret key (server-only). */
export function modelCallWriter(access: SecretAccess): ModelCallWriter {
  const secret = secretClient(access)
  return {
    async record(call) {
      const { error } = await secret
        .from("model_calls")
        .insert({ organization_id: call.organizationId, kind: call.kind })
      if (error) {
        throw new Error(`Couldn't record a model call: ${error.message}`)
      }
    },
  }
}
