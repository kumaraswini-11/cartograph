import { buildPublishableKey } from "@clerk/shared/keys"
import { describe, expect, it } from "vitest"

import {
  CLERK_PROTECT,
  CLERK_PROTECT_ANY_PORT,
  STATIC_HEADERS,
  clerkFrontendApi,
  contentSecurityPolicy,
  newNonce,
} from "./headers"

const SOURCES = {
  clerkPublishableKey: buildPublishableKey("calm-owl-12.clerk.accounts.dev"),
  supabaseUrl: "https://ref.supabase.co",
  posthogHost: "https://us.i.posthog.com",
}

/** The policy's directives, each with its sources. */
const directives = (policy: string) =>
  new Map(
    policy.split("; ").map((directive) => {
      const [name = "", ...sources] = directive.split(" ")
      return [name, sources]
    })
  )

describe("the security headers (spec 012, FR-004, AC-09)", () => {
  it("are each there", () => {
    expect(Object.keys(STATIC_HEADERS)).toEqual(
      expect.arrayContaining([
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
      ])
    )
    expect(STATIC_HEADERS["X-Content-Type-Options"]).toBe("nosniff")
    expect(STATIC_HEADERS["Strict-Transport-Security"]).toMatch(
      /^max-age=\d{8,}/
    )
  })
})

describe("the content security policy (FR-005, C-02, D-03)", () => {
  const policy = directives(contentSecurityPolicy("abc123", SOURCES))

  it("names every source exactly: no wildcard but Clerk Protect's, no bare scheme", () => {
    for (const [name, sources] of policy) {
      for (const source of sources) {
        // C-02's one exception: Clerk's fraud protection, on its own hosts.
        if (source === CLERK_PROTECT || source === CLERK_PROTECT_ANY_PORT) {
          continue
        }
        expect(source, `${name} ${source}`).not.toContain("*")
        // blob: is Clerk's worker, made by the page itself (D-03).
        if (name === "worker-src" && source === "blob:") continue
        // data: images: Clerk's drawings; an image runs no script.
        if (name === "img-src" && source === "data:") continue
        expect(source, `${name} ${source}`).not.toMatch(/^[a-z]+:$/)
      }
    }
  })

  it("allows scripts from this origin, Clerk and Cloudflare, or with the nonce", () => {
    expect(policy.get("script-src")).toEqual([
      "'self'",
      "'nonce-abc123'",
      "https://calm-owl-12.clerk.accounts.dev",
      "https://*.protect.clerk.com",
      "https://challenges.cloudflare.com",
    ])
    expect(policy.get("script-src")).not.toContain("'unsafe-inline'")
    expect(policy.get("script-src")).not.toContain("'unsafe-eval'")
  })

  it("connects to Clerk, storage and its Realtime, and PostHog only", () => {
    expect(policy.get("connect-src")).toEqual([
      "'self'",
      "https://calm-owl-12.clerk.accounts.dev",
      "https://*.protect.clerk.com:*",
      "https://ref.supabase.co",
      "wss://ref.supabase.co",
      "https://us.i.posthog.com",
    ])
    const local = directives(
      contentSecurityPolicy("n", {
        ...SOURCES,
        supabaseUrl: "http://127.0.0.1:54321",
        posthogHost: undefined,
      })
    )
    expect(local.get("connect-src")).toEqual([
      "'self'",
      "https://calm-owl-12.clerk.accounts.dev",
      "https://*.protect.clerk.com:*",
      "http://127.0.0.1:54321",
      "ws://127.0.0.1:54321",
    ])
  })

  it("forbids framing by any site, plugins, and a changed base", () => {
    expect(policy.get("frame-ancestors")).toEqual(["'none'"])
    expect(policy.get("object-src")).toEqual(["'none'"])
    expect(policy.get("base-uri")).toEqual(["'none'"])
    expect(policy.get("default-src")).toEqual(["'self'"])
  })

  it("reads Clerk's frontend API from its key, and refuses one that isn't", () => {
    expect(clerkFrontendApi(SOURCES.clerkPublishableKey)).toBe(
      "https://calm-owl-12.clerk.accounts.dev"
    )
    expect(() => clerkFrontendApi("pk_test_nope")).toThrow()
  })

  it("takes a new 128-bit nonce for every response", () => {
    const nonce = newNonce()
    expect(atob(nonce)).toHaveLength(16)
    expect(newNonce()).not.toBe(nonce)
  })
})
