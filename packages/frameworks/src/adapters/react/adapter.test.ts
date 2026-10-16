import { afterEach, describe, expect, it } from "vitest"

import { cleanUp, detected, manifest, roles } from "../../testing.ts"

afterEach(cleanUp)

describe("React (FR-013, FR-014, FR-018)", () => {
  it("gives folder, Hook and Context roles, and mounts the entry point", () => {
    const result = detected({
      "package.json": manifest(["react", "react-dom"]),
      "src/main.tsx":
        'import { createRoot } from "react-dom/client"\ncreateRoot(document.body).render(null)',
      "src/pages/home.tsx": "",
      "src/components/button.tsx": "",
      "src/components/useToggle.ts": "",
      "src/theme.tsx":
        'import { createContext } from "react"\nexport const Theme = createContext(null)',
      "src/state.tsx":
        'import * as React from "react"\nexport const State = React.createContext(0)',
      "src/lib/format.ts": "",
    })
    expect(result.packages).toEqual([{ path: "", framework: "React" }])
    expect(roles(result)).toEqual([
      ["src/components/button.tsx", "Components", false],
      ["src/components/useToggle.ts", "Hooks", false],
      ["src/lib/format.ts", "Utilities", false],
      ["src/main.tsx", "Unidentified", true],
      ["src/pages/home.tsx", "Pages", false],
      ["src/state.tsx", "Contexts", false],
      ["src/theme.tsx", "Contexts", false],
    ])
    expect(result.routes).toEqual([])
  })

  it("is Next.js, first in order, when a package declares both (FR-002)", () => {
    const result = detected({
      "package.json": manifest(["react", "next"]),
      "a.ts": "",
    })
    expect(result.packages).toEqual([{ path: "", framework: "Next.js" }])
  })
})

describe("a repository of several frameworks (FR-001, FR-009, AC-11)", () => {
  it("gives each package its own framework's roles, under one taxonomy", () => {
    const result = detected({
      "package.json": manifest([], { workspaces: ["apps/*"] }),
      "apps/web/package.json": manifest(["next", "react"]),
      "apps/web/app/page.tsx": "",
      "apps/api/package.json": manifest(["@nestjs/core"]),
      "apps/api/src/cats.controller.ts": "",
    })
    expect(result.packages).toEqual([
      { path: "", framework: null },
      { path: "apps/api", framework: "NestJS" },
      { path: "apps/web", framework: "Next.js" },
    ])
    expect(roles(result)).toEqual([
      ["apps/api/src/cats.controller.ts", "Controllers", false],
      ["apps/web/app/page.tsx", "Page routes", true],
    ])
    expect(result.taxonomy.slice(0, 7).map((t) => t.role)).toEqual([
      "Page routes",
      "API endpoints",
      "Server actions",
      "Metadata files",
      "Controllers",
      "Gateways",
      "Resolvers",
    ])
  })
})
