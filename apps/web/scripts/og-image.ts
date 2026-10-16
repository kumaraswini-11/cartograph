// `pnpm --filter web og-image`: draws public/og.png, the image link previews
// show (src/lib/share-image.ts), from HTML in a headless Chromium browser:
// Edge or Chrome, or the one named by BROWSER. Run it when the brand changes;
// the PNG is committed, so builds never need a browser.
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

import { SHARE_IMAGE } from "../src/lib/share-image.ts"

const OUT = join(import.meta.dirname, "..", "public", "og.png")
const BROWSERS = [
  process.env.BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/microsoft-edge",
]
const browser = BROWSERS.find((b) => b !== undefined && existsSync(b))
if (!browser) throw new Error("No Chromium browser found: set BROWSER to one.")

const font = pathToFileURL(
  createRequire(import.meta.url).resolve(
    "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"
  )
).href

// The app's brand: the icon's cyan on its dark ground (public/icon.svg).
const BRAND = "#22d3ee"
const GROUND = "#18181b"

/** A box of the motif: a folder's label, as on the map. */
const box = (x: number, y: number, label: string, filled = false) => `
  <rect x="${x}" y="${y}" width="${label.length * 15 + 40}" height="52" rx="12"
    fill="${filled ? BRAND : GROUND}" stroke="${BRAND}" stroke-width="3"/>
  <text x="${x + 20}" y="${y + 34}" fill="${filled ? GROUND : BRAND}"
    font-family="ui-monospace, Consolas, monospace" font-size="24">${label}</text>`

/** A line from one box's trailing edge to another's leading edge. */
const line = (x1: number, y1: number, x2: number, y2: number) => {
  const mid = (x1 + x2) / 2
  return `<path d="M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}"
    fill="none" stroke="${BRAND}" stroke-width="3" stroke-linecap="round"/>`
}

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: Inter; src: url("${font}") format("woff2"); font-weight: 100 900; }
  html, body { margin: 0; width: ${SHARE_IMAGE.width}px; height: ${SHARE_IMAGE.height}px; }
  body { background: radial-gradient(circle at 82% 50%, #22d3ee22, ${GROUND} 55%);
    background-color: ${GROUND}; color: #fafafa; font-family: Inter, sans-serif;
    display: flex; align-items: center; padding: 0 72px; box-sizing: border-box; }
  .text { flex: 1; display: flex; flex-direction: column; gap: 20px; }
  h1 { margin: 0; font-size: 96px; font-weight: 700; letter-spacing: -2px; }
  .tagline { margin: 0; font-size: 40px; font-weight: 500; line-height: 1.25; color: #e4e4e7; max-width: 620px; }
  .rule { margin: 12px 0 0; font-size: 24px; color: #a1a1aa; white-space: nowrap; }
</style></head><body>
  <div class="text">
    <h1>Cartograph</h1>
    <p class="tagline">Dependency maps for TypeScript and JavaScript</p>
    <p class="rule">Folders as boxes, imports as lines, drawn from the code itself.</p>
  </div>
  <svg width="420" height="400" viewBox="0 0 420 400">
    ${line(115, 200, 230, 66)}${line(115, 200, 230, 200)}${line(115, 200, 230, 334)}
    ${box(20, 174, "app", true)}
    ${box(230, 40, "lib")}${box(230, 174, "hooks")}${box(230, 308, "ui")}
  </svg>
</body></html>`

const work = mkdtempSync(join(tmpdir(), "og-image-"))
try {
  const page = join(work, "card.html")
  writeFileSync(page, html)
  const result = spawnSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--user-data-dir=${join(work, "profile")}`,
    `--window-size=${SHARE_IMAGE.width},${SHARE_IMAGE.height}`,
    "--virtual-time-budget=3000",
    `--screenshot=${OUT}`,
    pathToFileURL(page).href,
  ])
  // The committed image is already there, so its presence proves nothing:
  // the browser's own exit tells whether it drew a new one.
  if (result.status !== 0) {
    throw new Error(
      `The browser drew nothing: ${result.error?.message ?? String(result.stderr)}`
    )
  }
  console.log(`Wrote ${OUT}`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
