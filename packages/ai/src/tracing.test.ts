import { afterEach, describe, expect, it, vi } from "vitest"

import { createTracing } from "./tracing.ts"

afterEach(() => vi.unstubAllGlobals())

describe("tracing (spec 009, FR-011 to FR-013)", () => {
  it("is off unless turned on, and every call still works (FR-013)", async () => {
    for (const config of [
      {},
      { tracing: "false", apiKey: "lsv2_sk_abc" },
      { tracing: "true" },
    ]) {
      const register = vi.fn()
      const tracing = createTracing(config, register)
      expect(tracing.enabled).toBe(false)
      expect(register).not.toHaveBeenCalled()
      const explain = (path: string) => Promise.resolve(`about ${path}`)
      // With tracing off, the function itself, untouched.
      expect(tracing.traced("explain", explain)).toBe(explain)
      await expect(tracing.flush()).resolves.toBeUndefined()
    }
  })

  it("registers LangSmith once, and records runs in the account's region", async () => {
    const sent: Array<string> = []
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        sent.push(input instanceof Request ? input.url : String(input))
        return Promise.resolve(Response.json({}))
      })
    )
    const register = vi.fn()
    const tracing = createTracing(
      {
        tracing: "true",
        apiKey: "lsv2_sk_abc",
        endpoint: "https://apac.api.smith.langchain.com",
        project: "cartograph-test",
      },
      register
    )
    expect(tracing.enabled).toBe(true)
    expect(register).toHaveBeenCalledOnce()

    // A traced function returns what it returns: recording is beside it.
    const explain = tracing.traced("explain", (path: string) =>
      Promise.resolve(`about ${path}`)
    )
    await expect(explain("src/index.ts")).resolves.toBe("about src/index.ts")
    await tracing.flush()
    expect(sent.length).toBeGreaterThan(0)
    expect(
      sent.every((url) =>
        url.startsWith("https://apac.api.smith.langchain.com")
      )
    ).toBe(true)
  })
})
