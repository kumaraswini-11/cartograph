// A Chromium browser for the scripts: found on this machine, launched
// headless, or a running one attached to, and spoken to over the Chrome
// DevTools Protocol (https://chromedevtools.github.io/devtools-protocol/).
// Node's own fetch and WebSocket are all it needs.
import { spawn } from "node:child_process"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** Where Edge and Chrome install, after BROWSER, which names one. */
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

/** The first Chromium browser found, or an error saying how to name one. */
export function findBrowser(): string {
  const browser = BROWSERS.find((b) => b !== undefined && existsSync(b))
  if (browser === undefined) {
    throw new Error("No Chromium browser found: set BROWSER to one.")
  }
  return browser
}

type Target = { type: string; url: string; webSocketDebuggerUrl: string }
type Message = {
  id?: number
  method?: string
  params?: Record<string, unknown>
  result?: Record<string, unknown>
  error?: { message: string }
}

/** One page, spoken to: commands sent, events heard. */
export type Page = {
  send: (
    method: string,
    params?: Record<string, unknown>
  ) => Promise<Record<string, unknown>>
  on: (
    handler: (method: string, params: Record<string, unknown>) => void
  ) => void
  close: () => void
}

async function targets(port: number): Promise<Array<Target>> {
  const reply = await fetch(`http://127.0.0.1:${port}/json/list`)
  return (await reply.json()) as Array<Target>
}

/** Connects to a page: the first whose address starts with `prefix`. */
async function connect(port: number, prefix: string): Promise<Page> {
  const pages = (await targets(port)).filter((t) => t.type === "page")
  const target = pages.find((t) => t.url.startsWith(prefix)) ?? pages[0]
  if (target === undefined) throw new Error(`No page open on port ${port}.`)
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve)
    socket.addEventListener("error", reject)
  })
  let next = 0
  const waiting = new Map<number, (message: Message) => void>()
  const handlers: Array<
    (method: string, params: Record<string, unknown>) => void
  > = []
  socket.addEventListener("message", (event: MessageEvent<string>) => {
    const message = JSON.parse(event.data) as Message
    if (message.id !== undefined) {
      waiting.get(message.id)?.(message)
      waiting.delete(message.id)
    } else if (message.method !== undefined) {
      for (const handler of handlers)
        handler(message.method, message.params ?? {})
    }
  })
  return {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++next
        waiting.set(id, (message) => {
          if (message.error)
            reject(new Error(`${method}: ${message.error.message}`))
          else resolve(message.result ?? {})
        })
        socket.send(JSON.stringify({ id, method, params }))
      }),
    on: (handler) => handlers.push(handler),
    close: () => socket.close(),
  }
}

/** A browser to drive, and how to let it go when done. */
export type Session = { page: Page; end: () => void }

/**
 * A page to drive. With `port`, the browser already running there (one
 * started with --remote-debugging-port, a person signed in to it); without,
 * a headless one of its own, on a fresh profile, ended with the session.
 */
export async function openBrowser(
  base: string,
  port?: number
): Promise<Session> {
  if (port !== undefined) {
    const page = await connect(port, base)
    return { page, end: () => page.close() }
  }
  const own = 9334
  const profile = mkdtempSync(join(tmpdir(), "browser-check-"))
  const child = spawn(
    findBrowser(),
    [
      "--headless=new",
      `--remote-debugging-port=${own}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--window-size=1280,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  )
  for (let tries = 0; tries < 50; tries++) {
    try {
      if ((await targets(own)).length > 0) break
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  const page = await connect(own, "about:blank")
  return {
    page,
    end: () => {
      page.close()
      child.kill()
      try {
        rmSync(profile, { recursive: true, force: true })
      } catch {
        // Windows may hold the folder a moment after the browser ends; it's
        // in the system's temporary folder either way.
      }
    },
  }
}

/** Waits `ms` milliseconds. */
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))
