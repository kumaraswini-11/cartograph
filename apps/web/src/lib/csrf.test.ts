import { isCsrfRequestAllowed } from "@tanstack/react-start"
import type { RequestServerOptions } from "@tanstack/react-start"
import { describe, expect, it } from "vitest"

import { csrfChecks } from "./csrf"

const SITE = "https://cartograph.test"
const CHAT = "/api/analyses/0d7e8a3e-5f63-4a39-9b4e-2f3c1d1e9a10/chat"

/** A request as the middleware sees it; the rest of its context is unused. */
function context(
  path: string,
  init: RequestInit,
  handlerType: "serverFn" | "router" = "router"
) {
  return {
    request: new Request(`${SITE}${path}`, init),
    pathname: path,
    handlerType,
  } as unknown as RequestServerOptions<unknown, unknown>
}

/**
 * As TanStack's middleware decides: a request the filter selects is
 * refused unless it passes the check; any other goes straight through.
 */
async function refused(ctx: RequestServerOptions<unknown, unknown>) {
  return csrfChecks(ctx) && !(await isCsrfRequestAllowed({}, ctx))
}

const crossSite = {
  Origin: "https://evil.test",
  "Sec-Fetch-Site": "cross-site",
}

describe("CSRF protection (spec 006 plan D-03, spec 010 plan D-03)", () => {
  it("refuses another site's POST to the chat", async () => {
    expect(
      await refused(context(CHAT, { method: "POST", headers: crossSite }))
    ).toBe(true)
  })

  it("answers this site's POST to the chat", async () => {
    expect(
      await refused(
        context(CHAT, {
          method: "POST",
          headers: { Origin: SITE, "Sec-Fetch-Site": "same-origin" },
        })
      )
    ).toBe(false)
  })

  it("refuses another site's server function call", async () => {
    expect(
      await refused(
        context(
          "/_serverFn/abc",
          { method: "POST", headers: crossSite },
          "serverFn"
        )
      )
    ).toBe(true)
  })

  it("leaves Clerk's webhook alone: Clerk calls it, and its signature is checked", async () => {
    expect(
      await refused(
        context("/api/webhooks/clerk", { method: "POST", headers: crossSite })
      )
    ).toBe(false)
  })
})
