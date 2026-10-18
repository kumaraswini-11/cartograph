import { describe, expect, it } from "vitest"
import { z } from "zod"

import { isUuid } from "./ids"

// The loader's check and the server's must never disagree: an id one
// accepts and the other refuses would show an error, not "not found".
describe("an id's shape", () => {
  it("accepts exactly what zod's z.uuid() accepts", () => {
    const ids = [
      "0d7e8a3e-5f63-4a39-9b4e-2f3c1d1e9a10",
      "476A2DDE-57E0-43A0-BD78-4F2F8E59473E",
      "00000000-0000-0000-0000-000000000000",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "0d7e8a3e-5f63-0a39-9b4e-2f3c1d1e9a10", // version 0
      "0d7e8a3e-5f63-4a39-cb4e-2f3c1d1e9a10", // variant c
      "0d7e8a3e5f634a399b4e2f3c1d1e9a10",
      "not-a-uuid",
      "",
    ]
    for (const id of ids) {
      expect(isUuid(id), id).toBe(z.uuid().safeParse(id).success)
    }
  })
})
