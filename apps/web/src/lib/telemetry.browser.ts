import type { PostHog, PostHogConfig } from "posthog-js"

import { RELEASE, bareError } from "./telemetry"

// The browser's side of error reports (spec 012, FR-001, FR-012, plan
// D-01, D-02): its unhandled errors, and the error pages' errors, sent with
// the release. Product events are the server's to send, so the browser
// sends exceptions only, and keeps nothing on the device.

/**
 * PostHog's browser client as Cartograph runs it: everything kept in the
 * page's memory, so no cookie and no storage (FR-012); nothing captured
 * but exceptions; no script loaded from elsewhere, so the content security
 * policy names one host (C-02).
 */
export const BROWSER_CONFIG = {
  defaults: "2026-08-30",
  persistence: "memory",
  capture_exceptions: true,
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  capture_dead_clicks: false,
  capture_heatmaps: false,
  capture_performance: false,
  rageclick: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_product_tours: true,
  disable_conversations: true,
  disable_web_experiments: true,
  advanced_disable_flags: true,
  disable_external_dependency_loading: true,
  save_referrer: false,
  person_profiles: "never",
  // The one kind of event the browser sends (D-02).
  before_send: (event) => (event.event === "$exception" ? event : null),
} satisfies Partial<PostHogConfig>

let started: Promise<PostHog | null> | undefined

/**
 * Starts error reports once, after the page is interactive: PostHog's code
 * loads when the browser is idle, so it costs the page's first load
 * nothing. Errors before then are held and sent once it's loaded.
 */
export function startErrorReports(): void {
  if (started !== undefined) return
  const key = import.meta.env.VITE_POSTHOG_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST
  if (key === undefined || host === undefined) {
    started = Promise.resolve(null)
    return
  }

  const early: Array<unknown> = []
  const onError = (event: ErrorEvent) => early.push(event.error)
  const onRejection = (event: PromiseRejectionEvent) => early.push(event.reason)
  window.addEventListener("error", onError)
  window.addEventListener("unhandledrejection", onRejection)

  started = new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) requestIdleCallback(() => resolve())
    else setTimeout(resolve, 1)
  })
    .then(() => import("posthog-js/no-external"))
    .then(({ default: posthog }) => {
      posthog.init(key, { ...BROWSER_CONFIG, api_host: host })
      posthog.register({ release: RELEASE })
      // PostHog's own handlers take over from here.
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
      for (const error of early) posthog.captureException(bareError(error))
      return posthog
    })
    .catch((error: unknown) => {
      // An ad blocker, or a network failure: the page works on without it.
      console.warn("Error reports are off:", error)
      return null
    })
}

/**
 * An error a page caught rather than threw on (the error pages): reported
 * as an unhandled one would be. An error page's effect runs before the
 * root's, so this starts error reports itself if they haven't started.
 */
export function reportBrowserError(error: unknown): void {
  startErrorReports()
  void started?.then((posthog) => posthog?.captureException(bareError(error)))
}
