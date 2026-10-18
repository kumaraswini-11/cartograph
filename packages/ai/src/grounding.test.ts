import { describe, expect, it } from "vitest"

import { pathIndex, resolvePath, ungroundedPaths } from "./grounding.ts"

const index = pathIndex([
  "lib/application.js",
  "lib/router/index.js",
  "lib/router/route.js",
  "index.js",
  "test/index.js",
  "config/app.json",
  "lib/utils.js",
  "test/utils.js",
])

describe("grounding (spec 009, FR-005, plan D-07)", () => {
  it("accepts a real folder named like a file, without making it a link", () => {
    const named = pathIndex(["packages/socket.io/lib/index.js"])
    expect(ungroundedPaths("The `packages/socket.io` box.", named)).toEqual([])
    expect(resolvePath("packages/socket.io", named)).toBeNull()
    expect(ungroundedPaths("See `packages/ghost.io`.", named)).toEqual([
      "packages/ghost.io",
    ])
  })

  it("accepts paths the analysis has, written as code or plain", () => {
    expect(
      ungroundedPaths(
        "`lib/application.js` builds on lib/router/index.js and `route.js`.",
        index
      )
    ).toEqual([])
  })

  it("names every path the analysis doesn't have", () => {
    expect(
      ungroundedPaths(
        "It calls `lib/missing.js`, and also lib/router/ghost.ts and `nowhere.ts`.",
        index
      )
    ).toEqual(["lib/missing.js", "lib/router/ghost.ts", "nowhere.ts"])
  })

  it("doesn't take packages, calls or products for files", () => {
    expect(
      ungroundedPaths(
        "Uses `express`, `@tanstack/react-router`, `res.json()` and runs on Node.js or Next.js.",
        index
      )
    ).toEqual([])
  })

  it("resolves a path, or a name only one file has, for a link", () => {
    expect(resolvePath("lib/router/route.js", index)).toBe(
      "lib/router/route.js"
    )
    expect(resolvePath("./application.js", index)).toBe("lib/application.js")
    // An exact path wins: index.js is a file at the root.
    expect(resolvePath("index.js", index)).toBe("index.js")
    // Two files are called utils.js, and neither is at the root: not a
    // link, and not invented either.
    expect(resolvePath("utils.js", index)).toBeNull()
    expect(ungroundedPaths("See `utils.js`.", index)).toEqual([])
    expect(resolvePath("lib/none.js", index)).toBeNull()
  })
})
