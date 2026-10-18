// @vitest-environment jsdom
// The browser's PostHog client as Cartograph configures it (spec 012,
// FR-012, D-01), started in a browser's document: it keeps nothing on the
// device, and sends nothing but exceptions.
import posthog from "posthog-js/no-external"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { BROWSER_CONFIG } from "./telemetry.browser"

const sent: Array<string> = []

beforeAll(() => {
  // What PostHog sends goes nowhere; its addresses are kept to check.
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL | Request) => {
      sent.push(String(input instanceof Request ? input.url : input))
      return Promise.resolve(new Response("{}", { status: 200 }))
    })
  )
  posthog.init("phc_test", {
    ...BROWSER_CONFIG,
    api_host: "https://us.i.posthog.com",
  })
})
afterAll(() => vi.unstubAllGlobals())

describe("the browser's error reports (FR-012)", () => {
  it("store nothing on the device: no cookie, no local or session storage", () => {
    posthog.captureException(new Error("a test"))
    posthog.capture("$pageview")
    expect(document.cookie).toBe("")
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it("send exceptions only", () => {
    expect(
      BROWSER_CONFIG.before_send({ event: "$exception" } as never)
    ).toEqual({ event: "$exception" })
    expect(
      BROWSER_CONFIG.before_send({ event: "$pageview" } as never)
    ).toBeNull()
  })

  it("load no script from elsewhere, and ask no feature flags", () => {
    expect(posthog.config.disable_external_dependency_loading).toBe(true)
    expect(sent.some((url) => /\/flags|\/decide|array\//.test(url))).toBe(false)
  })
})
