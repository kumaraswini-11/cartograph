import type { UIMessage } from "ai"
import { describe, expect, it } from "vitest"

import { recentText } from "./history.ts"
import { KEPT_QUESTIONS } from "./limits.ts"

const text = (id: string, role: "user" | "assistant"): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text: id }],
})
/** A reply with no text: its outcome only, as a declined one is. */
const silent = (id: string): UIMessage => ({
  id,
  role: "assistant",
  parts: [{ type: "data-outcome", data: { kind: "declined" } }],
})

describe("the conversation sent with a question (spec 010, plan D-06)", () => {
  it("keeps the last questions and answers as text, and the new question", () => {
    const turns = Array.from({ length: KEPT_QUESTIONS + 2 }, (_, i) => [
      text(`q${i}`, "user"),
      text(`a${i}`, "assistant"),
    ]).flat()
    const sent = recentText([...turns, text("new", "user")])
    expect(sent).toHaveLength(KEPT_QUESTIONS * 2 + 1)
    expect(sent.at(-1)?.id).toBe("new")
  })

  it("lets no reply without text take an earlier question's place", () => {
    const sent = recentText([
      text("q0", "user"),
      text("a0", "assistant"),
      ...Array.from({ length: KEPT_QUESTIONS * 2 }, (_, i) => silent(`s${i}`)),
      text("new", "user"),
    ])
    expect(sent.map((message) => message.id)).toEqual(["q0", "a0", "new"])
  })
})
