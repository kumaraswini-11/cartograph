import { describe, expect, it } from "vitest"

import {
  analysisTopic,
  organizationTopic,
  stageChangeFrom,
} from "./progress.ts"

describe("pushed progress (spec 008, FR-011, C-03)", () => {
  it("names the topics the database's trigger sends on", () => {
    // The same names the migration's trigger and policy use, which the
    // database tests pin on their side.
    expect(organizationTopic("org_a")).toBe("organization:org_a")
    expect(analysisTopic("org_a", "a1")).toBe("organization:org_a:analysis:a1")
  })

  it("reads a stage change, leaving out what Realtime adds", () => {
    expect(
      stageChangeFrom({
        id: "message-id",
        analysisId: "a1",
        stage: "parsing",
        message: "Parsing expressjs/express",
      })
    ).toEqual({
      analysisId: "a1",
      stage: "parsing",
      message: "Parsing expressjs/express",
    })
  })

  it("ignores anything that isn't one", () => {
    for (const payload of [
      null,
      "parsing",
      { analysisId: "a1", stage: "queued", message: "x" },
      { analysisId: 1, stage: "done", message: "x" },
      { analysisId: "a1", stage: "done" },
    ]) {
      expect(stageChangeFrom(payload)).toBeNull()
    }
  })
})
