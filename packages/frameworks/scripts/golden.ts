// `pnpm --filter @workspace/frameworks golden`: downloads each golden
// repository at its pinned commit, parses and detects it, and prints its
// frameworks, role counts and routes beside the spec's golden data, held
// here too (spec 002, T05). Exits 1 on any drift.
import { compareCounts, compareList, runGolden, timed } from "@workspace/golden"
import type { Counts } from "@workspace/golden"
import { isTooLarge, parseRepository } from "@workspace/parser"

import { detectFrameworks } from "../src/index.ts"
import type { Detection } from "../src/index.ts"

type Golden = {
  repository: string
  commit: string
  /** Pinned by the first run that passed the hand checks. */
  pinned: { counts: Counts; routes: Array<string> } | undefined
}

const GOLDEN: ReadonlyArray<Golden> = [
  {
    repository: "vercel/commerce",
    commit: "3761e52e60df9c6a316e067dbfd7032e494d3634",
    pinned: {
      counts: {
        "package (root)": "Next.js",
        files: 66,
        "Page routes": 5,
        "API endpoints": 1,
        "Server actions": 1,
        "Metadata files": 5,
        Layouts: 3,
        "Loading and error UI": 2,
        Components: 31,
        Configuration: 2,
        Utilities: 15,
        Unidentified: 1,
        "entry points": 18,
        routes: 1,
      },
      routes: ["POST /api/revalidate  app/api/revalidate/route.ts:4"],
    },
  },
  {
    repository: "shadcn-ui/taxonomy",
    commit: "298a8857c7128a0d121e7f699dfd729f23b3966d",
    pinned: {
      counts: {
        "package (root)": "Next.js",
        files: 131,
        "Page routes": 14,
        "API endpoints": 7,
        "Metadata files": 1,
        Layouts: 8,
        "Loading and error UI": 5,
        Components: 66,
        Hooks: 3,
        Proxy: 1,
        Configuration: 10,
        Utilities: 12,
        Unidentified: 4,
        "entry points": 41,
        routes: 8,
      },
      routes: [
        "GET /api/og  app/api/og/route.tsx:15",
        "GET /api/posts  app/api/posts/route.ts:14",
        "POST /api/posts  app/api/posts/route.ts:41",
        "DELETE /api/posts/[postId]  app/api/posts/[postId]/route.ts:14",
        "PATCH /api/posts/[postId]  app/api/posts/[postId]/route.ts:44",
        "PATCH /api/users/[userId]  app/api/users/[userId]/route.ts:14",
        "GET /api/users/stripe  app/api/users/stripe/route.ts:12",
        "POST /api/webhooks/stripe  app/api/webhooks/stripe/route.ts:8",
      ],
    },
  },
  {
    repository: "lujakob/nestjs-realworld-example-app",
    commit: "c1c2cc4e448b279ff083272df1ac50d20c3304fa",
    pinned: {
      counts: {
        "package (root)": "NestJS",
        files: 36,
        Controllers: 6,
        Services: 4,
        Modules: 5,
        Entities: 5,
        DTOs: 4,
        Pipes: 1,
        Middleware: 1,
        Unidentified: 10,
        "entry points": 3,
        routes: 21,
      },
      routes: [
        "GET /api  src/app.controller.ts:5",
        "GET /api/articles  src/article/article.controller.ts:24",
        "POST /api/articles  src/article/article.controller.ts:51",
        "DELETE /api/articles/:slug  src/article/article.controller.ts:68",
        "GET /api/articles/:slug  src/article/article.controller.ts:38",
        "PUT /api/articles/:slug  src/article/article.controller.ts:59",
        "GET /api/articles/:slug/comments  src/article/article.controller.ts:43",
        "POST /api/articles/:slug/comments  src/article/article.controller.ts:76",
        "DELETE /api/articles/:slug/comments/:id  src/article/article.controller.ts:84",
        "DELETE /api/articles/:slug/favorite  src/article/article.controller.ts:101",
        "POST /api/articles/:slug/favorite  src/article/article.controller.ts:93",
        "GET /api/articles/feed  src/article/article.controller.ts:33",
        "GET /api/profiles/:username  src/profile/profile.controller.ts:18",
        "DELETE /api/profiles/:username/follow  src/profile/profile.controller.ts:28",
        "POST /api/profiles/:username/follow  src/profile/profile.controller.ts:23",
        "GET /api/tags  src/tag/tag.controller.ts:17",
        "GET /api/user  src/user/user.controller.ts:21",
        "PUT /api/user  src/user/user.controller.ts:26",
        "POST /api/users  src/user/user.controller.ts:32",
        "DELETE /api/users/:slug  src/user/user.controller.ts:37",
        "POST /api/users/login  src/user/user.controller.ts:43",
      ],
    },
  },
  {
    repository: "hagopj13/node-express-boilerplate",
    commit: "179ae84efec61b14206d0305d941daed6c6d07f9",
    pinned: {
      counts: {
        "package (root)": "Express",
        files: 50,
        Routes: 4,
        Controllers: 3,
        Services: 5,
        Models: 6,
        Validations: 4,
        Middleware: 4,
        Configuration: 6,
        Utilities: 4,
        Unidentified: 14,
        "entry points": 10,
        routes: 0,
      },
      routes: [],
    },
  },
]

function countsOf(result: Detection): Counts {
  return {
    ...Object.fromEntries(
      result.packages.map((p) => [
        `package ${p.path || "(root)"}`,
        p.framework ?? "none",
      ])
    ),
    files: result.files.length,
    ...Object.fromEntries(
      result.taxonomy.filter((t) => t.files > 0).map((t) => [t.role, t.files])
    ),
    "entry points": result.files.filter((f) => f.entryPoint).length,
    routes: result.routes.length,
  }
}

await runGolden(GOLDEN, "detected", (golden, directory) => {
  const parsed = parseRepository(directory)
  if (isTooLarge(parsed)) throw new Error(`${golden.repository} is too large`)
  const [result, seconds] = timed(() => detectFrameworks(directory, parsed))
  const counts = compareCounts(countsOf(result), golden.pinned?.counts)
  const routes = compareList(
    result.routes.map((r) => `${r.method} ${r.path}  ${r.file}:${r.line}`),
    golden.pinned?.routes
  )
  return {
    seconds,
    lines: [...counts.lines, "  routes:", ...routes.lines],
    drift: counts.drift || routes.drift,
  }
})
