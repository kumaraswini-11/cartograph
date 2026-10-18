// @vitest-environment jsdom
// Every page's markup, rendered through the app's own router as the server
// renders it, audited with axe-core for WCAG 2.2 AA (spec 012, FR-010,
// AC-14, plan D-07). Signed-in pages are audited without signing in: the
// server functions give fixtures, and Clerk's components stand as they do
// before its script loads. Colour contrast and target size need a laid-out
// page, which jsdom doesn't have: Lighthouse checks them (D-07).
import {
  RouterContextProvider,
  RouterProvider,
  createMemoryHistory,
} from "@tanstack/react-router"
import axe from "axe-core"
import { renderToString } from "react-dom/server"
import { afterAll, describe, expect, it, vi } from "vitest"

import { detectFrameworks } from "@workspace/frameworks"
import { toMapInput } from "@workspace/graph"
import { isTooLarge, parseRepository } from "@workspace/parser"
import { makeRepository } from "@workspace/parser/testing"
import type { RunDetail } from "@workspace/database"

import type * as Start from "@tanstack/react-start"

import { RouteError } from "@/components/status/route-error"
import { getRouter } from "@/router"

const ORGANIZATION = { id: "org_a", name: "Acme", admin: true }
const MAPPED = "0d7e8a3e-5f63-4a39-9b4e-2f3c1d1e9a10"
const RUNNING = "1d7e8a3e-5f63-4a39-9b4e-2f3c1d1e9a11"

const repository = makeRepository({
  "package.json": JSON.stringify({ dependencies: { next: "1" } }),
  "app/page.tsx": 'import { b } from "../lib/b"',
  "lib/b.ts": 'import { c } from "./c"\nexport const b = c',
  "lib/c.ts": "export const c = 1",
})
const parsed = parseRepository(repository.directory)
if (isTooLarge(parsed)) throw new Error("tiny repository is too large")
const map = toMapInput(
  { repository: "owner/demo", commit: "c".repeat(40) },
  parsed,
  detectFrameworks(repository.directory, parsed)
)
afterAll(() => repository.remove())

const run = (state: RunDetail["state"]): RunDetail => ({
  id: "run_1",
  state,
  stale: false,
  message: state === "done" ? "Mapped 3 files" : "Reading owner/demo",
  failedStage: null,
  commit: state === "done" ? "c".repeat(40) : null,
  startedAt: "2026-10-18T10:00:00.000Z",
  finishedAt: state === "done" ? "2026-10-18T10:00:20.000Z" : null,
})

// No request here, so no nonce: the router's scripts don't change the audit.
vi.mock("@tanstack/react-start", async (actual) => ({
  ...(await actual<typeof Start>()),
  getGlobalStartContext: () => undefined,
}))
vi.mock("@clerk/tanstack-react-start", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  // As the server renders them: Clerk's script hasn't loaded.
  ClerkLoading: ({ children }: { children: React.ReactNode }) => children,
  ClerkLoaded: () => null,
  SignIn: () => null,
  OrganizationSwitcher: () => null,
  UserButton: () => null,
  useAuth: () => ({ isLoaded: false, getToken: () => Promise.resolve(null) }),
}))
vi.mock("@clerk/ui/themes", () => ({ shadcn: {} }))
vi.mock("@/lib/session.functions", () => ({
  getSession: () =>
    Promise.resolve({
      signedIn: true,
      userId: "user_1",
      organization: ORGANIZATION,
    }),
}))
vi.mock("@/lib/analyses.functions", () => ({
  getAnalyses: () =>
    Promise.resolve([
      { id: MAPPED, repository: "owner/demo", latestRun: run("done") },
      { id: RUNNING, repository: "owner/other", latestRun: run("parsing") },
    ]),
  getAnalysis: ({ data }: { data: { analysisId: string } }) =>
    Promise.resolve(
      data.analysisId === MAPPED
        ? {
            analysis: {
              id: MAPPED,
              repository: "owner/demo",
              latestRun: run("done"),
            },
            map,
          }
        : {
            analysis: {
              id: RUNNING,
              repository: "owner/other",
              latestRun: run("parsing"),
            },
            map: null,
          }
    ),
  getLatestRun: () => Promise.resolve(null),
  submitRepository: vi.fn(),
  rerunAnalysis: vi.fn(),
}))
vi.mock("@/lib/explanations.functions", () => ({
  explain: vi.fn(),
  staleness: vi.fn(),
}))
vi.mock("@/lib/invitations.functions", () => ({ inviteMember: vi.fn() }))

/** A page's markup, as the server renders it, made the document. */
async function render(path: string) {
  const router = getRouter()
  router.update({
    ...router.options,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  const html = renderToString(<RouterProvider router={router} />)
  const page = new DOMParser().parseFromString(html, "text/html")
  document.replaceChild(
    document.adoptNode(page.documentElement),
    document.documentElement
  )
  return router
}

/** WCAG 2.2 A and AA, as axe-core tags them. */
const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

/** What axe found, and how many of its rules the page passed. */
async function audit(): Promise<{ violations: Array<string>; passed: number }> {
  const results = await axe.run(document, {
    runOnly: { type: "tag", values: WCAG_22_AA },
    rules: {
      // Both need a laid-out page (D-07): measured by Lighthouse.
      "color-contrast": { enabled: false },
      "target-size": { enabled: false },
    },
  })
  return {
    violations: results.violations.map(
      (v) =>
        `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`
    ),
    passed: results.passes.length,
  }
}

/** Each page, its address, and its heading: proof the page itself rendered. */
const PAGES = [
  ["home", "/", "Cartograph"],
  ["sign-in", "/sign-in", null],
  ["dashboard", "/dashboard", "Acme"],
  ["organization", "/organization", "Acme"],
  ["an analysis with its map", `/analyses/${MAPPED}`, "owner/demo"],
  ["an analysis whose run is under way", `/analyses/${RUNNING}`, "owner/other"],
  ["a page that isn't there", "/no-such-page", "Page not found"],
] as const

describe("every page meets WCAG 2.2 AA in axe-core (spec 012, AC-14)", () => {
  it.each(PAGES)("%s", async (_name, path, heading) => {
    await render(path)

    expect(document.querySelector("main")).not.toBeNull()
    // Clerk's screen brings the sign-in page's heading once its script loads.
    if (heading === null) {
      expect(
        document.querySelector('[aria-label="Loading sign-in"]')
      ).not.toBeNull()
    } else {
      expect(document.querySelector("h1")?.textContent).toBe(heading)
    }
    const { violations, passed } = await audit()
    expect(violations).toEqual([])
    expect(passed).toBeGreaterThan(5)
  })

  // React renders no error boundary on the server: a page whose loader
  // failed is drawn by the browser, the router's error page in the app's
  // document. So it's audited as the browser draws it.
  it("a page that failed", async () => {
    const router = await render("/")
    document.body.innerHTML = renderToString(
      <RouterContextProvider router={router}>
        <RouteError error={new Error("Storage is down")} reset={() => {}} />
      </RouterContextProvider>
    )
    expect(document.querySelector("h1")?.textContent).toBe(
      "Something went wrong"
    )
    const { violations, passed } = await audit()
    expect(violations).toEqual([])
    expect(passed).toBeGreaterThan(5)
  })
})
