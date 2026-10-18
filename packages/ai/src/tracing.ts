import { registerTelemetry } from "ai"
import { Client } from "langsmith"
import { LangSmithTelemetry } from "langsmith/experimental/vercel"
import { traceable } from "langsmith/traceable"

/** Tracing's settings, as the server's checked configuration has them. */
export type TracingConfig = {
  /** "true" turns tracing on; anything else leaves it off (FR-013). */
  tracing?: string
  apiKey?: string
  /** The account's region; unset means LangSmith's US region. */
  endpoint?: string
  /** Where runs land; one per environment (ADR 0003). */
  project?: string
}

/** What callers get, the same with tracing on or off. */
export type Tracing = {
  /** Whether runs are being recorded, for the interface to say (FR-013). */
  enabled: boolean
  /**
   * `fn`, recorded as a run named `name` when tracing is on: everything it
   * does, model calls included, is nested inside it. With tracing off,
   * `fn` itself.
   */
  traced: <TArgs extends Array<unknown>, TResult>(
    name: string,
    fn: (...args: TArgs) => Promise<TResult>
  ) => (...args: TArgs) => Promise<TResult>
  /**
   * Waits until recorded runs are sent: a serverless function can be ended
   * as soon as it responds (LangSmith: tracing in serverless environments).
   */
  flush: () => Promise<void>
}

const OFF: Tracing = {
  enabled: false,
  traced: (_name, fn) => fn,
  flush: () => Promise.resolve(),
}

/**
 * Tracing for these settings (spec 009, FR-011 to FR-013, plan D-03). With
 * tracing on, LangSmith's telemetry is registered with the AI SDK, so each
 * model call is recorded inside whichever `traced` function made it. With
 * it off, nothing is registered and every request still works.
 * `register` is the AI SDK's own, passed in so a test can watch it.
 */
export function createTracing(
  config: TracingConfig,
  register: typeof registerTelemetry = registerTelemetry
): Tracing {
  if (config.tracing !== "true" || !config.apiKey) return OFF
  const client = new Client({ apiKey: config.apiKey, apiUrl: config.endpoint })
  register(
    LangSmithTelemetry({
      client,
      projectName: config.project,
      tracingEnabled: true,
    })
  )
  return {
    enabled: true,
    // `traceable` returns the same function, recorded; its declared type is
    // a conditional one TypeScript can't resolve for a generic `fn`.
    traced: <TArgs extends Array<unknown>, TResult>(
      name: string,
      fn: (...args: TArgs) => Promise<TResult>
    ) =>
      traceable(fn, {
        name,
        client,
        project_name: config.project,
        tracingEnabled: true,
      }) as unknown as (...args: TArgs) => Promise<TResult>,
    flush: () => client.awaitPendingTraceBatches(),
  }
}

let current: Tracing | undefined

/**
 * The server's tracing, made once: the AI SDK's telemetry is global, and
 * registering it twice would record every call twice.
 */
export function tracing(config: TracingConfig): Tracing {
  current ??= createTracing(config)
  return current
}
