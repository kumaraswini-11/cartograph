import "@tanstack/react-start/server-only"

import { tracing } from "@workspace/ai"
import type { Tracing } from "@workspace/ai"

import { getServerEnv } from "./env.server"

/**
 * The server's tracing, from its checked configuration (spec 009, FR-013):
 * on when `LANGSMITH_TRACING` is true with a key, otherwise every call runs
 * untraced. Made once per server; explanations and chat share it.
 */
export function serverTracing(): Tracing {
  const env = getServerEnv()
  return tracing({
    tracing: env.LANGSMITH_TRACING,
    apiKey: env.LANGSMITH_API_KEY,
    endpoint: env.LANGSMITH_ENDPOINT,
    project: env.LANGSMITH_PROJECT,
  })
}
