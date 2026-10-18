import { beforeEach, describe, expect, it, vi } from "vitest"

import { modelCallTimesSince, runTimesSince } from "@workspace/database"
import type { StorageClient } from "@workspace/database"

import {
  MODEL_CALL_LIMIT,
  RUN_LIMIT,
  RUN_LIMIT_WINDOW,
  liftsAt,
  modelCallLimitMessage,
  runLimitMessage,
} from "./limits"
import {
  ModelCallsSpent,
  runLimitLiftsAt,
  spendModelCall,
} from "./limits.server"

vi.mock("@tanstack/react-start/server-only", () => ({}))
vi.mock("./env.server", () => ({
  getServerEnv: () => ({
    VITE_SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_SECRET_KEY: "sb_secret_abc",
  }),
}))
const record = vi.fn((_: unknown) => Promise.resolve())
vi.mock("@workspace/database", () => ({
  runTimesSince: vi.fn(),
  modelCallTimesSince: vi.fn(),
  modelCallWriter: () => ({ record }),
}))

const storage = {} as StorageClient
const NOW = new Date("2026-10-18T12:00:00.000Z")

/** `count` times, newest first, a minute apart, the newest a minute ago. */
const minutesAgo = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    new Date(NOW.getTime() - (i + 1) * 60_000).toISOString()
  )

beforeEach(() => vi.clearAllMocks())

describe("when a limit lifts (spec 012, D-05)", () => {
  it("doesn't, under the limit", () => {
    expect(liftsAt(minutesAgo(19), RUN_LIMIT, RUN_LIMIT_WINDOW)).toBeNull()
  })

  it("at the limit, when the oldest counted leaves the window", () => {
    // The 20th newest started 20 minutes ago: the next can in 40.
    expect(liftsAt(minutesAgo(20), RUN_LIMIT, RUN_LIMIT_WINDOW)).toBe(
      "2026-10-18T12:40:00.000Z"
    )
  })
})

describe("the run limit (FR-006, AC-10)", () => {
  it("counts the last hour's runs, as many as the limit", async () => {
    vi.mocked(runTimesSince).mockResolvedValue(minutesAgo(3))
    expect(await runLimitLiftsAt(storage, NOW)).toBeNull()
    expect(runTimesSince).toHaveBeenCalledWith(
      storage,
      new Date("2026-10-18T11:00:00.000Z"),
      RUN_LIMIT
    )
  })

  it("at the limit, says when the next can start", async () => {
    vi.mocked(runTimesSince).mockResolvedValue(minutesAgo(RUN_LIMIT))
    expect(await runLimitLiftsAt(storage, NOW)).toBe("2026-10-18T12:40:00.000Z")
  })
})

describe("the model call limit (FR-007, AC-12)", () => {
  const call = { organizationId: "org_a", kind: "explanation" } as const

  it("records a call under the limit, before it's made", async () => {
    vi.mocked(modelCallTimesSince).mockResolvedValue(minutesAgo(99))
    await spendModelCall(storage, call, NOW)
    expect(modelCallTimesSince).toHaveBeenCalledWith(
      storage,
      new Date("2026-10-17T12:00:00.000Z"),
      MODEL_CALL_LIMIT
    )
    expect(record).toHaveBeenCalledWith(call)
  })

  it("at the limit, refuses with when calls resume, recording nothing", async () => {
    vi.mocked(modelCallTimesSince).mockResolvedValue(
      minutesAgo(MODEL_CALL_LIMIT)
    )
    const refused = spendModelCall(storage, call, NOW)
    await expect(refused).rejects.toBeInstanceOf(ModelCallsSpent)
    await expect(refused).rejects.toMatchObject({
      // The 100th newest was 100 minutes ago: a day after it.
      resumesAt: "2026-10-19T10:20:00.000Z",
    })
    expect(record).not.toHaveBeenCalled()
  })
})

describe("what a refusal says", () => {
  it("names the limit and when it lifts", () => {
    expect(runLimitMessage("2026-10-18T12:40:00.000Z")).toMatch(
      /^Your organization has started 20 runs in the last hour\. The next can start at .+\.$/
    )
    expect(
      modelCallLimitMessage("Answers", "2026-10-19T10:20:00.000Z")
    ).toMatch(
      /^Your organization has made its 100 model calls for today\. Answers resume at .+\.$/
    )
  })
})
