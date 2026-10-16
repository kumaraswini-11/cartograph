import { afterEach, describe, expect, it } from "vitest"

import { cleanUp, detected, manifest, roles, routes } from "../../testing.ts"

afterEach(cleanUp)

const NEXT = manifest(["next", "react"])

describe("the app folder (FR-010, FR-014, AC-01, AC-08)", () => {
  it("gives routing, special and habit files their roles and entry points", () => {
    const result = detected({
      "package.json": NEXT,
      "app/page.tsx": "",
      "app/layout.tsx": "",
      "app/loading.tsx": "",
      "app/(shop)/cart/page.tsx": "",
      "app/api/posts/route.ts": "export async function GET() {}",
      "app/opengraph-image.tsx": "",
      "app/blog/_components/post.tsx": "",
      "app/_lib/data.ts": "",
      "components/button.tsx": "",
      "hooks/use-cart.ts": "",
      "lib/utils.ts": "",
      "lib/actions.ts": '"use server"\nexport async function add() {}',
      "proxy.ts": "",
      "instrumentation.ts": "",
      "next.config.ts": "export default {}",
    })
    expect(result.packages).toEqual([{ path: "", framework: "Next.js" }])
    expect(roles(result)).toEqual([
      ["app/(shop)/cart/page.tsx", "Page routes", true],
      ["app/_lib/data.ts", "Utilities", false],
      ["app/api/posts/route.ts", "API endpoints", true],
      ["app/blog/_components/post.tsx", "Components", false],
      ["app/layout.tsx", "Layouts", true],
      ["app/loading.tsx", "Loading and error UI", true],
      ["app/opengraph-image.tsx", "Metadata files", true],
      ["app/page.tsx", "Page routes", true],
      ["components/button.tsx", "Components", false],
      ["hooks/use-cart.ts", "Hooks", false],
      ["instrumentation.ts", "Instrumentation", true],
      ["lib/actions.ts", "Server actions", false],
      ["lib/utils.ts", "Utilities", false],
      ["next.config.ts", "Configuration", true],
      ["proxy.ts", "Proxy", true],
    ])
    expect(
      result.taxonomy
        .filter((t) => t.tier === "surface")
        .map((t) => [t.role, t.files])
    ).toEqual([
      ["Page routes", 2],
      ["API endpoints", 1],
      ["Server actions", 1],
      ["Metadata files", 1],
    ])
  })

  it("reads `middleware`, Proxy's earlier name, and folders under src", () => {
    const result = detected({
      "package.json": NEXT,
      "src/app/page.tsx": "",
      "src/middleware.ts": "",
    })
    expect(roles(result)).toEqual([
      ["src/app/page.tsx", "Page routes", true],
      ["src/middleware.ts", "Proxy", true],
    ])
  })

  it("ignores src/app when app sits at the root, as Next.js does", () => {
    const result = detected({
      "package.json": NEXT,
      "app/page.tsx": "",
      "src/app/page.tsx": "",
    })
    expect(roles(result)).toEqual([
      ["app/page.tsx", "Page routes", true],
      ["src/app/page.tsx", "Unidentified", false],
    ])
  })
})

describe("the pages folder (FR-010, FR-018, AC-12)", () => {
  it("makes pages Page routes and entry points, pages/api endpoints with no route", () => {
    const result = detected({
      "package.json": NEXT,
      "pages/index.tsx": "",
      "pages/blog/[slug].tsx": "",
      "pages/_app.tsx": "",
      "pages/404.tsx": "",
      "pages/api/hello.ts": "export default function handler() {}",
    })
    expect(roles(result)).toEqual([
      ["pages/404.tsx", "Loading and error UI", true],
      ["pages/_app.tsx", "Layouts", true],
      ["pages/api/hello.ts", "API endpoints", true],
      ["pages/blog/[slug].tsx", "Page routes", true],
      ["pages/index.tsx", "Page routes", true],
    ])
    expect(result.routes).toEqual([])
  })
})

describe("routes (FR-015, FR-017, AC-07, AC-10)", () => {
  it("recovers one route per exported method, with the exact path pattern", () => {
    const result = detected({
      "package.json": NEXT,
      "app/api/posts/route.ts":
        "export async function GET() {}\nexport const POST = async () => {}",
      "app/api/posts/[postId]/route.ts":
        "const handler = () => {}\nexport { handler as DELETE, handler as PATCH }",
      "app/(admin)/@panel/stats/route.ts": "export function GET() {}",
      "app/route.ts": "export function HEAD() {}\nexport const helper = 1",
    })
    expect(routes(result)).toEqual([
      "HEAD /",
      "GET /api/posts",
      "POST /api/posts",
      "DELETE /api/posts/[postId]",
      "PATCH /api/posts/[postId]",
      "GET /stats",
    ])
    expect(result.routes[1]).toEqual({
      method: "GET",
      path: "/api/posts",
      file: "app/api/posts/route.ts",
      line: 1,
    })
  })

  it("gives no route under an intercepting segment", () => {
    const result = detected({
      "package.json": NEXT,
      "app/feed/(..)photo/route.ts": "export function GET() {}",
    })
    expect(result.routes).toEqual([])
  })

  it("leads every path with a literal base path", () => {
    const result = detected({
      "package.json": NEXT,
      "next.config.mjs": 'export default { basePath: "/docs" }',
      "app/route.ts": "export function GET() {}",
      "app/api/route.ts": "export function GET() {}",
    })
    expect(routes(result)).toEqual(["GET /docs", "GET /docs/api"])
  })

  it("gives no routes when the base path isn't a literal", () => {
    const result = detected({
      "package.json": NEXT,
      "next.config.js": "module.exports = { basePath: process.env.BASE }",
      "app/api/route.ts": "export function GET() {}",
    })
    expect(result.routes).toEqual([])
  })
})
