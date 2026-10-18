# 012 — Production readiness: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** In progress

## T01 — The checks carried from 011, 010 and 009

**Status:** Todo
**Blocked by:** none
**Covers:** `011` AC-03 and AC-05 (a second evaluation run, after 3.6
Flash's daily reset); `010` AC-01, AC-06, AC-09 and its `interface-review`;
`009`'s browser rows; then every row on production with the carried `008`,
`007` and `006` checks

**Done when:**

- [ ] Each passes, or what fails is fixed, and each spec's tasks file says
      so.

## T02 — Errors and events

**Status:** Done (AC-07 is the owner's browser check, with PostHog's key)
**Blocked by:** none
**Covers:** FR-001 to FR-003, FR-012, C-01, AC-07, AC-08, AC-11, D-01, D-02

**What to build:** the event shapes; PostHog in the browser (memory
persistence, no autocapture) and on the server; exceptions with the
release; the five events.

**Done when:**

- [x] Tests pass for AC-08 and AC-11.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — Security headers

**Status:** Done
**Blocked by:** T02 (the policy lists PostHog's hosts)
**Covers:** FR-004, FR-005, C-02, AC-09, D-03, D-04

**What to build:** the headers and the policy; the middleware that sets
them.

**Done when:**

- [x] A test finds every header and no wildcard source but C-02's one.
- [x] Locally, the app loads with the policy enforced and the console clear:
      a production build, in headless Edge, on home, sign-in (Clerk's
      components, Protect and Cloudflare's check) and a missing page. Left:
      Clerk's development-keys warning and its development cookie (D-09).
      Then signed in, in the owner's window: the dashboard, the organization
      and two maps, with Realtime connected and the console clear. A Vercel
      build alone renders Speed Insights, whose script only Vercel serves.
      An error the app doesn't answer gets the headers too, at the server
      entry, where Start answers it.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — Limits

**Status:** Done
**Blocked by:** none
**Covers:** FR-006, FR-007, C-03, AC-10, AC-12, D-05, D-06

**What to build:** `model_calls` and its policy; the counts; the checks
before a run, an explanation and a chat question; the refusals.

**Done when:**

- [x] Tests pass for AC-10 and AC-12; pgTAP covers `model_calls`.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — Accessibility

**Status:** Done (the keyboard pass, AC-15, is the owner's browser check)
**Blocked by:** none
**Covers:** FR-010, FR-011, AC-14, D-07

**What to build:** the axe-core audit of every page's markup; fixes for
what it finds.

**Done when:**

- [x] The audit reports no WCAG 2.2 AA violation (AC-14):
      `apps/web/src/a11y.test.tsx` renders every page through the app's
      router (home, sign-in, the dashboard, the organization, an analysis
      with its map and one whose run is under way, a missing page, a failed
      page) and runs axe-core's WCAG 2.2 A and AA rules; planted violations
      fail it.
- [x] Contrast and target size, which need a laid-out page: axe-core in
      headless Edge on a local production build, light and dark, on home,
      sign-in and a missing page. One violation, Clerk's development badge
      (D-09). Then signed in, the same audit on the dashboard, the
      organization and two maps, light and dark: React Flow's attribution
      link failed contrast (2.84:1), now the theme's muted text; nothing
      else.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T06 — Speed

**Status:** Done (Speed Insights' data: the owner turns it on, on Vercel)
**Blocked by:** none
**Covers:** FR-009, C-04, AC-13, D-08

**What to build:** Speed Insights; `008`'s map-page findings fixed.

**Done when:**

- [x] Locally, Lighthouse on the production build shows the map page's
      total blocking time and tap targets improved, measured before and
      after: Lighthouse 13.4.1's mobile profile in a signed-in window, the
      map of `t3-oss/create-t3-app` (182 files), median of the runs that
      finished without a DevTools timeout (this machine is often busy, so
      single runs vary widely: 486 ms to 6 s after, 743 ms to 2.1 s before).

      | | Before | After |
      | --- | --- | --- |
      | Total blocking time (median) | 1,093 ms | 771 ms |
      | Largest contentful paint | 1.56 s | 1.56 s |
      | Layout shift | 0 | 0 |
      | Targets under 24 px | 21 boxes | 1, partly under the zoom buttons |
      | The map's own main-thread time (CPU profile, 4×) | 981 ms | 161 ms |

      Left for AC-13 on production: Clerk's script and React's hydrating
      (most of what remains), and the one box the zoom buttons can cover
      while the map is panned.

- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T07 — The README

**Status:** Done
**Blocked by:** none
**Covers:** the owner's request (2026-10-18)

**What to build:** "What's next", pointing to
`docs/future-improvements.md`; the features list brought up to date.

**Done when:**

- [x] Format passes.

## T08 — Acceptance and the ship criteria

**Status:** Todo
**Blocked by:** T02 to T07
**Covers:** AC-01 to AC-15, FR-008

**Done when:**

- [ ] Every acceptance criterion passes as its row says, and the results
      are recorded here, the six ship criteria first.
- [ ] Build status at the top of this file set to Done.
