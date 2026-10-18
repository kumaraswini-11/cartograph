import { beforeEach, describe, expect, it, vi } from "vitest"

import { reportError, track } from "./telemetry.server"

const exceptions: Array<{
  error: Error
  distinctId?: string
  properties: Record<string, unknown>
}> = []
const fail = { capture: false }
vi.mock("posthog-node", () => ({
  PostHog: class {
    captureImmediate() {
      return fail.capture
        ? Promise.reject(new Error("PostHog is down"))
        : Promise.resolve()
    }
    captureExceptionImmediate(
      error: Error,
      distinctId: string | undefined,
      properties: Record<string, unknown>
    ) {
      exceptions.push({ error, distinctId, properties })
      return Promise.resolve()
    }
  },
}))
vi.mock("@tanstack/react-start/server-only", () => ({}))
vi.mock("./env.server", () => ({
  getServerEnv: () => ({
    VITE_POSTHOG_KEY: "phc_test",
    VITE_POSTHOG_HOST: "https://us.i.posthog.com",
  }),
}))

beforeEach(() => {
  exceptions.length = 0
  fail.capture = false
})

describe("the server's error reports (spec 012, FR-001, C-01)", () => {
  it("send the bare error with the release", async () => {
    const error = Object.assign(new Error("Storage refused"), {
      requestBodyValues: { prompt: "the source" },
    })
    await reportError(error, "user_1")
    expect(exceptions).toHaveLength(1)
    const [report] = exceptions
    expect(report?.error.message).toBe("Storage refused")
    expect(report?.error).not.toHaveProperty("requestBodyValues")
    expect(report?.distinctId).toBe("user_1")
    expect(report?.properties).toMatchObject({ release: "test" })
  })

  it("report an error once, though both middlewares see it", async () => {
    const error = new Error("once")
    await reportError(error)
    await reportError(error)
    expect(exceptions).toHaveLength(1)
  })

  it("never fail the request when PostHog is down", async () => {
    fail.capture = true
    await expect(
      track("user_1", {
        event: "signed_in",
        properties: { organizationId: null },
      })
    ).resolves.toBeUndefined()
  })
})
