import { describe, expect, it } from "vitest"

import { pathIndex, ungroundedPaths } from "./grounding.ts"
import { parseExplanation, textOf } from "./text.ts"

describe("an explanation's formatting (spec 009, FR-007, C-03)", () => {
  it("keeps the three formats: paragraphs of code and bold, and bullets", () => {
    expect(
      parseExplanation(
        "The **router** for `lib/app.js`.\nIt routes.\n\n- `lib/router.js` matches paths\n- **Layers** run in order"
      )
    ).toEqual([
      {
        kind: "paragraph",
        runs: [
          { kind: "text", text: "The " },
          { kind: "bold", text: "router" },
          { kind: "text", text: " for " },
          { kind: "code", text: "lib/app.js" },
          { kind: "text", text: ". It routes." },
        ],
      },
      {
        kind: "bullets",
        items: [
          [
            { kind: "code", text: "lib/router.js" },
            { kind: "text", text: " matches paths" },
          ],
          [
            { kind: "bold", text: "Layers" },
            { kind: "text", text: " run in order" },
          ],
        ],
      },
    ])
  })

  // AC-02: whatever comes back, no stray backtick, asterisk or hash shows.
  it.each([
    "# A heading\nText with *emphasis* and _underline_.",
    "Unclosed `code and **bold",
    "A [link](https://example.com) and <b>HTML</b>.",
    "```ts\nconst x = 1\n```",
    "### Notes\n* a star bullet\n• a dot bullet",
    "Text ~~struck~~ and a lone * star and # hash.",
  ])("leaves no stray marks in %j", (text) => {
    const shown = textOf(parseExplanation(text))
    expect(shown).not.toMatch(/[`*#]/)
    expect(shown.trim()).not.toBe("")
  })

  it("keeps marks inside code as code", () => {
    expect(parseExplanation("Call `a ** b` here.")).toEqual([
      {
        kind: "paragraph",
        runs: [
          { kind: "text", text: "Call " },
          { kind: "code", text: "a ** b" },
          { kind: "text", text: " here." },
        ],
      },
    ])
  })
  it("drops emphasis underscores and tildes, never those inside a name", () => {
    expect(
      textOf(
        parseExplanation(
          "Reads MAX_FILE_BYTES from lib/my_util.js and pages/_app.tsx; _really_ ~~not~~ _here_."
        )
      )
    ).toBe(
      "Reads MAX_FILE_BYTES from lib/my_util.js and pages/_app.tsx; really not here."
    )
  })

  it("lets grounding read a snake_case path in plain words whole", () => {
    expect(
      ungroundedPaths("See lib/my_util.js.", pathIndex(["lib/my_util.js"]))
    ).toEqual([])
  })
})
