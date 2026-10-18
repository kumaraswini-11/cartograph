// `pnpm --filter web browser-check <check> <base> <path…> [--port N]`:
// checks pages in a real browser, which the unit tests can't (spec 012):
//
//   console  each page's console errors, uncaught errors, and what the
//            content security policy blocked (T03)
//   axe      axe-core's WCAG 2.2 A and AA rules, contrast and target size
//            included, in light and in dark (T05, AC-14)
//   profile  where the main thread's time went while the page loaded, at
//            Lighthouse's 4x CPU slowdown, by script (T06)
//
// Without --port, a headless Edge or Chrome of its own; with --port, the
// browser running there, so a signed-in page can be checked (README:
// "Checking in a real browser").
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

import { openBrowser, wait } from "./browser.ts"
import type { Page } from "./browser.ts"

const [check, base, ...rest] = process.argv.slice(2)
const portAt = rest.indexOf("--port")
const port = portAt === -1 ? undefined : Number(rest[portAt + 1])
const paths = rest.filter((_, i) => i !== portAt && i !== portAt + 1)

if (
  !["console", "axe", "profile"].includes(check ?? "") ||
  base === undefined ||
  paths.length === 0
) {
  console.error(
    "Usage: browser-check <console|axe|profile> <base> <path…> [--port N]"
  )
  process.exit(1)
}

/** Opens a page and waits for it to settle (a map lays itself out). */
async function visit(page: Page, path: string, settle = 8000) {
  await page.send("Page.navigate", { url: new URL(path, base).href })
  await wait(settle)
}

/** The page's console and policy reports, one line each. */
async function consoleCheck(page: Page) {
  const seen: Array<string> = []
  page.on((method, params) => {
    if (method === "Runtime.exceptionThrown") {
      const details = params.exceptionDetails as {
        text: string
        exception?: { description?: string }
      }
      seen.push(`uncaught: ${details.exception?.description ?? details.text}`)
    }
    if (method === "Runtime.consoleAPICalled") {
      const { type, args } = params as {
        type: string
        args: Array<{ value?: unknown; description?: string }>
      }
      if (type === "error" || type === "warning") {
        const text = args
          .map((a) => String(a.value ?? a.description ?? ""))
          .join(" ")
        seen.push(`console.${type}: ${text}`)
      }
    }
    if (method === "Audits.issueAdded") {
      const { issue } = params as {
        issue: {
          code: string
          details: {
            contentSecurityPolicyIssueDetails?: {
              violatedDirective: string
              blockedURL?: string
            }
          }
        }
      }
      const csp = issue.details.contentSecurityPolicyIssueDetails
      if (csp) {
        seen.push(
          `blocked by ${csp.violatedDirective}: ${csp.blockedURL ?? "inline"}`
        )
      }
    }
  })
  for (const domain of ["Runtime", "Audits", "Page"]) {
    await page.send(`${domain}.enable`)
  }
  for (const path of paths) {
    seen.length = 0
    await visit(page, path)
    console.log(`== ${path}: ${seen.length === 0 ? "clear" : ""}`)
    for (const line of new Set(seen)) console.log(`   ${line.slice(0, 300)}`)
  }
}

/** axe-core's WCAG 2.2 A and AA rules, on each page, in each theme. */
async function axeCheck(page: Page) {
  const axe = readFileSync(
    createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
    "utf8"
  )
  await page.send("Page.enable")
  for (const scheme of ["light", "dark"]) {
    await page.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: scheme }],
    })
    for (const path of paths) {
      await visit(page, path, 7000)
      await page.send("Runtime.evaluate", { expression: axe })
      const { result } = (await page.send("Runtime.evaluate", {
        awaitPromise: true,
        returnByValue: true,
        expression: `axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }).then((r) => r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ") + ": " + (n.failureSummary ?? "").replace(/\\s+/g, " ")) })))`,
      })) as { result: { value: Array<{ id: string; nodes: Array<string> }> } }
      const violations = result.value
      console.log(`== ${scheme} ${path}: ${violations.length} violations`)
      for (const v of violations) {
        console.log(`   ${v.id}`)
        for (const node of v.nodes.slice(0, 5)) {
          console.log(`     - ${node.slice(0, 240)}`)
        }
      }
    }
  }
  await page.send("Emulation.setEmulatedMedia", { features: [] })
}

type ProfileNode = {
  id: number
  callFrame: { url: string; functionName: string }
}

/** The main thread's time while each page loads, by script. */
async function profileCheck(page: Page) {
  await page.send("Page.enable")
  await page.send("Profiler.enable")
  await page.send("Emulation.setCPUThrottlingRate", { rate: 4 })
  for (const path of paths) {
    await page.send("Page.navigate", { url: "about:blank" })
    await page.send("Profiler.start")
    await visit(page, path, 12000)
    const { profile } = (await page.send("Profiler.stop")) as {
      profile: {
        nodes: Array<ProfileNode>
        samples: Array<number>
        timeDeltas: Array<number>
      }
    }
    const self = new Map<number, number>()
    profile.samples.forEach((id, i) => {
      self.set(id, (self.get(id) ?? 0) + (profile.timeDeltas[i + 1] ?? 0))
    })
    const byScript = new Map<string, number>()
    for (const node of profile.nodes) {
      const script =
        node.callFrame.url || `(${node.callFrame.functionName || "native"})`
      byScript.set(
        script,
        (byScript.get(script) ?? 0) + (self.get(node.id) ?? 0) / 1000
      )
    }
    console.log(`== ${path}: milliseconds of main thread at 4x, by script`)
    for (const [script, ms] of [...byScript]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)) {
      console.log(`   ${String(Math.round(ms)).padStart(6)}  ${script}`)
    }
  }
  await page.send("Emulation.setCPUThrottlingRate", { rate: 1 })
}

const { page, end } = await openBrowser(base, port)
try {
  // A tab in the background doesn't lay itself out (a map stays unfitted).
  await page.send("Page.bringToFront")
  if (check === "console") await consoleCheck(page)
  if (check === "axe") await axeCheck(page)
  if (check === "profile") await profileCheck(page)
} finally {
  end()
}
