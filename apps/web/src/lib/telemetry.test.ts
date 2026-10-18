import { describe, expect, it } from "vitest"

import { MAX_ERROR_MESSAGE, bareError } from "./telemetry"

// An error as the AI SDK makes them: what was sent and what came back ride
// on it, beside the message.
class CallError extends Error {
  readonly requestBodyValues = { prompt: "export const secret = 1" }
  readonly responseBody = "an explanation's text"
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "AI_APICallError"
  }
}

describe("what an error report holds (spec 012, C-01, D-02)", () => {
  it("keeps the name, the message and the stack's frames", () => {
    const error = new CallError("Bad request")
    const bare = bareError(error)
    expect(bare.name).toBe("AI_APICallError")
    expect(bare.message).toBe("Bad request")
    expect(bare.stack?.split("\n")[0]).toBe("AI_APICallError: Bad request")
    expect(bare.stack?.split("\n").length).toBeGreaterThan(1)
  })

  it("leaves every other property behind, and the cause", () => {
    const error = new CallError("Bad request", {
      cause: new Error("the file's source"),
    })
    const bare = bareError(error)
    expect(Object.keys(bare)).toEqual(["name"])
    expect(bare.cause).toBeUndefined()
    expect(JSON.stringify(bare)).not.toMatch(/secret|explanation|source/)
  })

  it("cuts a long message, and doesn't repeat it through the stack", () => {
    const error = new Error(`${"x".repeat(MAX_ERROR_MESSAGE)}TAIL\nline two`)
    const bare = bareError(error)
    expect(bare.message).toHaveLength(MAX_ERROR_MESSAGE)
    expect(bare.stack).not.toMatch(/TAIL|line two/)
  })

  it("reports a thrown value that isn't an Error without its contents", () => {
    const bare = bareError("export const secret = 1")
    expect(bare.message).toBe("A value that isn't an Error")
    expect(bare.stack).not.toMatch(/secret/)
  })
})
