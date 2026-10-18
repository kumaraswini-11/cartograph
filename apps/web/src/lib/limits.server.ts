import "@tanstack/react-start/server-only"

import {
  modelCallTimesSince,
  modelCallWriter,
  runTimesSince,
} from "@workspace/database"
import type { ModelCallKind, StorageClient } from "@workspace/database"

import { getServerEnv } from "./env.server"
import {
  MODEL_CALL_LIMIT,
  MODEL_CALL_LIMIT_WINDOW,
  RUN_LIMIT,
  RUN_LIMIT_WINDOW,
  liftsAt,
} from "./limits"

/**
 * When the member's organization may start its next run (FR-006): null if
 * it may now. Counted in storage at the moment of asking (D-05), with the
 * member's token, so the count is their organization's alone.
 */
export async function runLimitLiftsAt(
  storage: StorageClient,
  now = new Date()
): Promise<string | null> {
  const since = new Date(now.getTime() - RUN_LIMIT_WINDOW)
  const times = await runTimesSince(storage, since, RUN_LIMIT)
  return liftsAt(times, RUN_LIMIT, RUN_LIMIT_WINDOW)
}

/** A model call refused for the organization's limit (FR-007). */
export class ModelCallsSpent extends Error {
  /** When calls resume, ISO 8601. */
  readonly resumesAt: string

  constructor(resumesAt: string) {
    super(`The organization's model calls resume at ${resumesAt}.`)
    this.name = "ModelCallsSpent"
    this.resumesAt = resumesAt
  }
}

/**
 * One model call for the organization (FR-007): refused with when calls
 * resume if its limit is reached, or else recorded, before the call is
 * made, so a call that fails still counts, as it does on the model's side.
 */
export async function spendModelCall(
  storage: StorageClient,
  call: { organizationId: string; kind: ModelCallKind },
  now = new Date()
): Promise<void> {
  const since = new Date(now.getTime() - MODEL_CALL_LIMIT_WINDOW)
  const times = await modelCallTimesSince(storage, since, MODEL_CALL_LIMIT)
  const resumesAt = liftsAt(times, MODEL_CALL_LIMIT, MODEL_CALL_LIMIT_WINDOW)
  if (resumesAt !== null) throw new ModelCallsSpent(resumesAt)
  const env = getServerEnv()
  await modelCallWriter({
    url: env.VITE_SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  }).record(call)
}
