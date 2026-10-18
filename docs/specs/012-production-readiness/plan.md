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

| Module                                   | What it does                                                                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/telemetry.ts`          | The five events by name and their allowed properties: one source for both sides, and the only shape an event can take (FR-002, FR-003).                               |
| `apps/web/src/lib/telemetry.client.ts`   | The browser's PostHog client: memory persistence, no autocapture, exceptions captured with the release (FR-001, FR-012).                                              |
| `apps/web/src/lib/telemetry.server.ts`   | The server's: errors from server functions and routes, and the events the server sees (run done or failed, chat question asked), flushed before a function ends.      |
| `apps/web/src/lib/headers.ts`            | The security headers and the policy, built from the configured addresses: one list of sources, no wildcard (FR-004, FR-005, C-02).                                    |
| `apps/web/src/start.ts`                  | The request middleware sets the headers on every response, after CSRF and the sign-in provider's.                                                                     |
| `packages/database/supabase/migrations/` | `model_calls`: one row per model call, per organization, written with the secret key, read by members under `007`'s policy.                                           |
| `packages/database/src/limits.ts`        | `runsSince` and `modelCallsSince`: the counts a limit checks, and the time the oldest counted one ages out.                                                           |
| `apps/web/src/lib/limits.server.ts`      | `RUN_LIMIT`, `MODEL_CALL_LIMIT` and their windows; the check before a run, an explanation or a chat question, refusing with when it's allowed again (FR-006, FR-007). |
| `apps/web/src/a11y.test.tsx`             | Every page's markup, rendered as the server renders it, audited with axe-core for WCAG 2.2 AA (AC-14).                                                                |
| `README.md`                              | A short "What's next", pointing to `docs/future-improvements.md`, and the features list brought up to date.                                                           |

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
  - Events go to PostHog's EU cloud.
- **D-02 What may be sent.** An event is one of five names with a fixed set
  of properties: ids, counts, durations and outcomes, never text. An error
  report sends the message, stack and release, never request bodies or
  variables, so a file's source can't ride along (C-01). A test lists a
  session's events and checks each (AC-08, AC-11).
- **D-03 The policy names each source.** `'self'`, the sign-in provider's
  frontend host, its image host, Cloudflare's challenge host, the storage
  provider's address (data and Realtime), PostHog's EU hosts and Vercel's
  Speed Insights endpoint, each exact (C-02).
  - The sign-in provider's components need `style-src 'unsafe-inline'`
    (Clerk: runtime CSS-in-JS); recorded as its one exception.
  - Clerk's newer docs list `*.protect.clerk.com` for its fraud protection;
    Cartograph doesn't use Clerk Protect, so it's left out rather than let a
    wildcard in. Checked when the policy is tested on the preview.
  - `frame-ancestors 'none'` forbids framing (FR-005).
- **D-04 Headers from the request middleware.** Every rendered page and
  server route passes through it, so one place sets them. Static assets are
  served by Vercel's CDN, which sends strict transport security for HTTPS
  itself.
- **D-05 Limits are counted, not cached.** A count over the window, in
  storage, at the moment of asking: no counter to drift, nothing to reset.
  The refusal says when the oldest counted run or call leaves the window
  (FR-006, FR-007).
- **D-06 One free key, two limits.** Every organization shares one Gemini
  key: its free daily quota is the real ceiling, and the model's own refusal
  (`009`, `010`: "the free request limit is reached") stays as it is. The
  per-organization limit stops one organization from spending everyone's.
- **D-07 The audit runs on server-rendered markup.** Each page's
  components rendered as the server renders them, through axe-core in the
  tests, so a signed-in page is audited without signing in. Colour contrast
  needs a real browser, so it's checked in Lighthouse on the public pages
  and by hand on the rest.
- **D-08 Measured on production.** Lighthouse's default mobile profile (a
  mid-range phone on a slow 4G connection) on the production address for
  AC-13, and Speed Insights for the 75th percentile of real page loads.
  `008`'s map-page findings (total blocking time about 1.1 s, small tap
  targets on mobile) are the first to fix.
- **D-09 Known limits of this release.** The sign-in provider's
  development instance adds about 2 s of redirects on a first visit and
  shows a "Development mode" badge, Lighthouse's one contrast failure; both
  go with a domain of our own (spec, resolved).

## Thresholds

| Name                      | Value  | Where              | Why                                    |
| ------------------------- | ------ | ------------------ | -------------------------------------- |
| `RUN_LIMIT`               | 20     | `limits.server.ts` | The spec.                              |
| `RUN_LIMIT_WINDOW`        | 1 hour | `limits.server.ts` | The spec.                              |
| `MODEL_CALL_LIMIT`        | 100    | `limits.server.ts` | The spec: below the shared free quota. |
| `MODEL_CALL_LIMIT_WINDOW` | 1 day  | `limits.server.ts` | The spec.                              |
| `LCP_MAX`                 | 2.5 s  | AC-13              | Core Web Vitals' "good".               |
| `INP_MAX`                 | 200 ms | AC-13              | Core Web Vitals' "good".               |
| `CLS_MAX`                 | 0.1    | AC-13              | Core Web Vitals' "good".               |

## What needs doing outside the code

By the repository's owner:

- **PostHog:** an account on the EU cloud, free plan, no card; a project
  named `cartograph`; its project key and host into `.env.local` and
  Vercel (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`). The project key is
  public by design; it only writes events.
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
