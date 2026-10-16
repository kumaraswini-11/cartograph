import { describe, expect, it, vi } from "vitest"

import { createHoverStore } from "./map-hover"

describe("the hover store (spec 004, FR-013)", () => {
  it("holds the hovered file, and tells listeners when it changes", () => {
    const store = createHoverStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    expect(store.get()).toBeNull()
    store.set("lib/a.ts")
    expect(store.get()).toBe("lib/a.ts")
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    store.set(null)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("tells no one when the same file is hovered again", () => {
    const store = createHoverStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.set("lib/a.ts")
    store.set("lib/a.ts")
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
