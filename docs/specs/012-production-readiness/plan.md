# 012 — Production readiness: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

Five pieces, each small, then the ship criteria checked one by one:

1. **Errors and events** go to one service, PostHog, on its free plan:
   unhandled errors from the server and the browser, tagged with the
   release, and the five product events of FR-002. The browser keeps
   nothing on the device (FR-012); nothing sent holds source, explanation
   or chat text, or an email address (FR-003, C-01).
2. **Security headers** on every response the app renders, from the request
   middleware that already guards CSRF: a content security policy naming
   each source the app uses (C-02), strict transport security, `nosniff`, a
   referrer policy and a permissions policy (FR-004, FR-005).
3. **Limits** per organization, counted in storage: runs from the runs
   table, model calls from a new, small table of calls (FR-006, FR-007).
   Refused with the time the next one is allowed.
4. **Accessibility and speed**, measured: an automated WCAG audit of every
   page's markup in the tests, a keyboard pass, Lighthouse on the
   production address, and real-user Core Web Vitals from Vercel Speed
   Insights (FR-009 to FR-011, C-04).
5. **The ship criteria** of `docs/project-doc.md` checked as each row says,
   with the results recorded in this spec's tasks (FR-008).

Everything stays at $0: PostHog's and Vercel's free plans, and the sign-in
provider's development instance until there's a domain (spec, resolved).

## Modules and interfaces

| Module                                   | What it does                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/telemetry.ts`          | The five events by name and their allowed properties: one source for both sides, and the only shape an event can take (FR-002, FR-003).                             |
| `apps/web/src/lib/telemetry.browser.ts`  | The browser's PostHog client: memory persistence, nothing captured but exceptions, loaded once the page is idle; errors before then held and sent (FR-001, FR-012). |
| `apps/web/src/lib/telemetry.server.ts`   | The server's: the five events and unhandled errors, each sent immediately and awaited, so nothing waits on a function that has ended.                               |
| `apps/web/src/lib/headers.ts`            | The security headers and the policy, built from the configured addresses: one list of sources, no wildcard (FR-004, FR-005, C-02).                                  |
| `apps/web/src/start.ts`                  | The request middleware sets the headers on every response, after CSRF and the sign-in provider's; it and a function middleware report unhandled errors.             |
| `packages/database/supabase/migrations/` | `model_calls`: one row per model call, per organization, written with the secret key, read by members under `007`'s policy.                                         |
| `packages/database/src/limits.ts`        | `runTimesSince` and `modelCallTimesSince`: the latest times a limit counts, newest first; `modelCallWriter` records a call with the secret key.                     |
| `apps/web/src/lib/limits.ts`             | `RUN_LIMIT`, `MODEL_CALL_LIMIT` and their windows; when a limit lifts; the refusals' sentences, in the member's own time zone. Shared by both sides.                |
| `apps/web/src/lib/limits.server.ts`      | The check before a run, an explanation's model call or a chat question, refusing with when it's allowed again (FR-006, FR-007).                                     |
| `apps/web/src/a11y.test.tsx`             | Every page's markup, rendered as the server renders it, audited with axe-core for WCAG 2.2 AA (AC-14).                                                              |
| `README.md`                              | A short "What's next", pointing to `docs/future-improvements.md`, and the features list brought up to date.                                                         |

## Data

```sql
-- One row per model call (FR-007): what the daily limit counts.
model_calls (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations (id) on delete cascade,
  kind text not null check (kind in ('explanation', 'chat')),
  called_at timestamptz not null default now()
)
-- index (organization_id, called_at); members select under 007's policy;
-- service_role inserts. Rows older than the window aren't needed, and an
-- organization's deletion removes its rows.
```

Runs need no new table: the runs table already holds each run's
organization and start time.

## Decisions

- **D-01 PostHog for errors and events, on its free plan.**
  - 100,000 exceptions and the product events a month free, with error
    tracking and analytics in one place, and a memory-only mode that stores
    nothing on the device (FR-012).
  - Considered: Sentry for errors. Rejected: its free plan holds 5,000
    errors a month, and events would need a second service. Considered:
    Vercel Web Analytics for events. Rejected: custom events are on paid
    plans only.
  - Events go to PostHog's US cloud, the owner's choice (2026-10-19). The EU
    cloud, which PostHog recommends for GDPR, was weighed for keeping EU
    visitors' data in the EU. Nothing in the code depends on the region: the
    host is configuration, and the content security policy is built from it.
- **D-02 What may be sent.** An event is one of five names with a fixed set
  of properties: ids, counts, durations and outcomes, never text. An error
  report sends the message, stack and release, never request bodies or
  variables, so a file's source can't ride along (C-01). A test lists a
  session's events and checks each (AC-08, AC-11).
  - **The server sends all five events**, where each is known for certain:
    an ad blocker can't drop them, and the browser loads no code for them.
    A sign-in is Clerk's `session.created` notice, to the webhook that
    already takes `organization.deleted`.
  - **The browser sends exceptions only**, and keeps nothing on the device:
    PostHog's `memory` persistence, checked in a browser's document by a
    test (FR-012); its `no-external` bundle, for sites with a strict
    policy, so it loads no script from elsewhere (C-02). About 100 KB
    compressed, loaded when the browser is idle after the page is
    interactive, so the first load pays nothing; with no key, the build
    leaves it out.
  - **An event's person is the Clerk user id**, never an email, and no
    person profile is kept (`$process_person_profile: false`; the
    browser's `person_profiles: "never"`).
  - **An error is reported bare**: its name, its message cut to 500
    characters and its stack's frames. The AI SDK's errors carry the
    request's and response's bodies, and a cause may carry anything; none
    of it is sent. A thrown value that isn't an Error is reported without
    its contents.
  - **The release is the build's commit** (`VERCEL_GIT_COMMIT_SHA`, a
    Vercel system variable), defined into both bundles at build time.
    Turbo's build cache is keyed on it and on every `VITE_` variable
    (`turbo.json`): the build writes both in, and on Vercel they come from
    the environment, not a file the cache already reads.
  - Errors are caught by the request middleware (pages, server routes), a
    function middleware (server functions, whose errors Start answers
    itself), work after the response, the router's error page, and the
    browser's unhandled errors and rejections. Each is reported once.
  - Tests run in a browser's document with jsdom 29: 30 needs Node 24.15
    or later, and the repository declares Node 24.x.
- **D-03 The policy names each source.** `'self'`, the sign-in provider's
  frontend host, its image host, Cloudflare's challenge host, the storage
  provider's address (data and Realtime), and PostHog's ingestion host, each
  exact (C-02). Speed Insights is served from this origin, so `'self'`
  covers it.
  - **Inline scripts carry a nonce**, new for every response: the router
    writes it on its own (hydration data, head and body scripts, the theme's
    `ScriptOnce`), from `ssr.nonce`, which reads it from the request's
    context. No `'unsafe-inline'` or `'unsafe-eval'` for scripts.
    Considered: `'strict-dynamic'`, which trusts what a nonced script loads;
    rejected, as it makes the policy's host list meaningless, where C-02
    wants each source named. Base UI writes inline scripts only when a
    component asks for them (`renderBeforeHydration`), and none does.
  - **Styles may be inline**: Clerk's components write theirs at run time
    (its CSP guide), and React writes style attributes.
  - **Clerk Protect** is on for every Clerk application (Device
    Intelligence; only Clerk's support can turn it off) and probes a
    subdomain of `client.protect.clerk.com` made for the session, on
    several ports. Blocked, it refuses every sign-up when "Require Device
    Intelligence checks" is on. So, as Clerk's CSP guide gives it,
    `https://*.protect.clerk.com` for scripts and frames and
    `https://*.protect.clerk.com:*` for connections: C-02's one wildcard,
    amended with the owner (2026-10-18). Found in a browser, with the
    policy enforced on a local production build.
  - `data:` images (Clerk's components draw some) and `blob:` workers
    (Clerk's) are the two scheme sources; neither can run a script in the
    page.
  - Clerk's development instance reports usage to clerk-telemetry.com; it's
    turned off on the provider (`telemetry={false}`) rather than allowed.
  - `frame-ancestors 'none'` forbids framing (FR-005), with
    `X-Frame-Options: DENY` for browsers that predate it.
- **D-04 Headers from the request middleware.** Every rendered page and
  server route passes through it, so one place sets them. Static assets are
  served by Vercel's CDN, which sends strict transport security for HTTPS
  itself.
  - It's the outermost middleware, so CSRF's refusals and Clerk's
    redirects get the headers too. The response is copied, as a redirect's
    headers can't be changed.
  - The policy is sent by a built app only: Vite's development server
    writes its own inline scripts and opens its own socket, with no nonce.
    The other headers are sent everywhere.
- **D-05 Limits are counted, not cached.** A count over the window, in
  storage, at the moment of asking: no counter to drift, nothing to reset.
  The refusal says when the oldest counted run or call leaves the window
  (FR-006, FR-007).
  - The latest `RUN_LIMIT` (or `MODEL_CALL_LIMIT`) times are read, newest
    first, and the limit lifts when the last of them leaves the window: right
    even if two requests at once let the count one past the limit.
  - An explanation's every model call counts, recorded before it's made, so
    a call that fails still counts, as it does for the model's quota; a
    cached explanation asks nothing and counts nothing.
  - A chat question counts once, however many steps its lookups take: the
    limit counts what a member asks for, and the model's own quota stays the
    real ceiling (D-06).
  - At the run limit, an address the organization has already analysed
    still opens its analysis; only a new run is refused.
  - The server sends when a limit lifts; the browser says it in the
    member's own time zone, not the server's.
- **D-06 One free key, two limits.** Every organization shares one Gemini
  key: its free daily quota is the real ceiling, and the model's own refusal
  (`009`, `010`: "the free request limit is reached") stays as it is. The
  per-organization limit stops one organization from spending everyone's.
- **D-07 The audit runs on server-rendered markup.** Each page's
  components rendered as the server renders them, through axe-core in the
  tests, so a signed-in page is audited without signing in. Colour contrast
  needs a real browser, so it's checked in Lighthouse on the public pages
  and by hand on the rest.
- **D-08 Measured on production.** Two measurements, each for what it can
  see:
  - **Speed Insights**, real page loads on the production address, at the
    75th percentile: LCP, INP and CLS against `LCP_MAX`, `INP_MAX` and
    `CLS_MAX`. INP is measured here only: it needs a person's
    interactions, which a page-load lab run doesn't make.
  - **Lighthouse's default mobile profile** (a mid-range phone on a slow 4G
    connection), on the production address before release: LCP and CLS
    against their thresholds, and total blocking time as the lab's stand-in
    for INP, held to the same 200 ms.
    `008`'s map-page findings (total blocking time about 1.1 s, small tap
    targets on mobile) are the first to fix.
  - **What the profile showed** (the map of `t3-oss/create-t3-app`, 182
    files, at Lighthouse's 4× CPU slowdown): dagre's layout was 612 ms of
    the map's 981, in one call during the render; React's hydrating and
    drawing 1,368 ms; Clerk's script and components about 1,300 ms, which
    a signed-in page needs, as it keeps the session's token fresh.
  - **The layout runs in a Web Worker** (`layout.worker.ts`): sent the map
    once, then asked for each layout by its open panels and pinned file.
    The last layout stays drawn while the next is made, a layout overtaken
    by a newer request is dropped, and the map waits in its placeholder
    until the first arrives. Opening a panel no longer blocks the page
    either. Considered: laying it out on the server with the page; rejected,
    as it adds the layout to every page's response time, and a panel
    opened later still needs it in the browser.
  - **The map is drawn in a transition**, so React renders it in slices.
  - **The first view fits no smaller than 0.6**, where a box (40 px at
    least) keeps WCAG 2.2's 24 px target (2.5.8): a map too large for the
    view at that zoom opens at its centre, to be panned or zoomed out. A
    refit for a panel (`003` FR-011) still zooms out as far as it must.
  - **Speed Insights** (`@vercel/speed-insights/react`) in the root
    document, by route pattern (`/analyses/$analysisId`), so every
    analysis's map is one page. Its script and its reports are on this
    origin; neither it nor the script Vercel serves uses a cookie or the
    browser's storage (read, 2026-10-19).
- **D-09 Known limits of this release.** The sign-in provider's
  development instance adds about 2 s of redirects on a first visit and
  shows a "Development mode" badge, Lighthouse's one contrast failure; both
  go with a domain of our own (spec, resolved).

## Thresholds

| Name                      | Value  | Where       | Why                                    |
| ------------------------- | ------ | ----------- | -------------------------------------- |
| `RUN_LIMIT`               | 20     | `limits.ts` | The spec.                              |
| `RUN_LIMIT_WINDOW`        | 1 hour | `limits.ts` | The spec.                              |
| `MODEL_CALL_LIMIT`        | 100    | `limits.ts` | The spec: below the shared free quota. |
| `MODEL_CALL_LIMIT_WINDOW` | 1 day  | `limits.ts` | The spec.                              |
| `LCP_MAX`                 | 2.5 s  | AC-13       | Core Web Vitals' "good".               |
| `INP_MAX`                 | 200 ms | AC-13       | Core Web Vitals' "good".               |
| `CLS_MAX`                 | 0.1    | AC-13       | Core Web Vitals' "good".               |

## What needs doing outside the code

By the repository's owner:

- **PostHog:** an account on the US cloud, free plan, no card; a project
  named `cartograph`; its project key and host into `.env.local` and
  Vercel (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`). The project key is
  public by design; it only writes events. In the project's settings,
  "Discard client IP data" on, so a browser's address isn't kept.
- **Clerk:** the webhook endpoint takes `session.created` as well as
  `organization.deleted` (a sign-in's event).
- **Vercel:** Speed Insights on for the project (Hobby: free for one
  project, 10,000 data points a month).
- **The production address:** the project's public production domain, for
  AC-09 and AC-13 (deployment URLs sit behind Vercel's sign-in).
- **Browser checks:** AC-02, AC-06, AC-07, AC-15, signed in.

## Testing

- **Vitest, the web app:**
  - AC-08 and AC-11: a session's events, through a recording client, are the
    five, and none holds text or an email.
  - AC-10 and AC-12: at the limit, a run and an explanation are refused with
    the time they're allowed again.
  - AC-09's policy: every header present, no source with a wildcard.
  - AC-14: axe-core finds no WCAG 2.2 AA violation in any page's markup.
- **pgTAP:** `model_calls` under `007`'s every-table checks (AC-03, AC-04).
- **Terminal:** AC-01 (five files' imports read by hand against the
  parser's), AC-05 (`pnpm eval`), AC-09 and AC-13 on the production
  address.
- **Browser, by the owner:** AC-02, AC-06, AC-07, AC-15.

## Risks

- **A policy that breaks sign-in.** The sign-in provider's script and
  frames are the most likely to be blocked; the preview is checked signed
  in before merge, with the browser console open.
- **Telemetry that leaks.** The event shapes are fixed in one module and
  tested; error reports never include request bodies.
- **Free quotas.** PostHog's and Speed Insights' are far above this
  project's traffic; each stops recording, never bills, when reached.
