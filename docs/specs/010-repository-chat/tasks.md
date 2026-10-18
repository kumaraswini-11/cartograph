# 010 — Repository chat: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** Built; the browser checks are carried into the next
phase (see T06)

## T01 — The checks carried from 009

**Status:** Carried into the next phase, still the owner's: `009`'s
browser rows, then every `009` row on production with its carried `008`,
`007` and `006` checks
**Blocked by:** none
**Covers:** `009` AC-01, AC-03, AC-04, AC-06, AC-08, AC-09 locally, then
every `009` row on production with `009` T01's carried `008`, `007` and
`006` checks

**What to build:** nothing, unless a check fails.

**Done when:**

- [ ] Each passes, or what fails is fixed, and `009`'s tasks file says so.

## T02 — The lookups, as queries

**Status:** Done
**Blocked by:** none
**Covers:** FR-002, FR-003, C-01, AC-04, AC-07

**What to build:** `findFiles`, `fileDetails` and `neighbours` in
`@workspace/graph`, beside `walk`, `insights` and the routes.

**Done when:**

- [x] Tests show each lookup returns its data from the analysis (AC-07),
      and the walk the chat uses goes to every level, as the detail pane's
      does. That the chat's lookup returns that walk unchanged (AC-04) is
      T03's test, where the lookup becomes a tool.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — The chat's loop

**Status:** Done
**Blocked by:** T02
**Covers:** FR-001, FR-004 to FR-007, FR-010, C-01, C-03, C-04, AC-02,
AC-03, AC-04, AC-05, AC-08, D-01, D-04 to D-08

**What to build:** `CHAT_MODEL`; the lookups as tools; `answerQuestion` with
the limits, the held answer, grounding with one retry, and the fixed
sentences; the prompt.

**Done when:**

- [x] Tests with the mock model pass for AC-02, AC-03, AC-05 and AC-08, the
      request limit, and the model's shortened output; a blast radius from
      the tool equals the detail pane's walk (AC-04).
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — The chat route

**Status:** Done
**Blocked by:** T03
**Covers:** FR-001, FR-002 (source, explanation), D-02, D-03, D-07

**What to build:** `sourceAtCommit` shared; `handleChat`; the server route;
the CSRF filter widened.

**Done when:**

- [x] Tests show another site's `POST` refused, the organization from the
      session, and another organization's analysis not found. Also checked
      on the dev server: another site's `POST` gets 403, a signed-out one 401.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — The Chat tab

**Status:** Built and tested; its browser checks and the `interface-review`
skill are carried (T06)
**Blocked by:** T04
**Covers:** FR-004, FR-008, FR-009, FR-011, FR-012, C-02, AC-01, AC-06,
AC-09, D-09

**What to build:** the pane's Details and Chat tabs; the chat panel, from
the registry first; the conversation's state for the page's life.

**Done when:**

- [ ] Locally: a blast radius question shows its lookup first and the
      answer's files match it (AC-01); an unrelated question is declined
      with no lookups (AC-06); the answer uses `009`'s formatting and a
      path moves the map (AC-09).
- [ ] The `interface-review` skill's checks pass, with nothing shifting as
      lookups and the answer arrive.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T06 — Acceptance

**Status:** Carried into the next phase, by the owner's decision on
2026-10-18: the PR is raised with the test rows passing and the browser
rows still to check. Chat runs on `gemini-3.5-flash-lite`, with its own
free quota, so they needn't wait for 3.6 Flash's reset.

| Row                                      | How it's checked | State                                                    |
| ---------------------------------------- | ---------------- | -------------------------------------------------------- |
| AC-02, AC-03, AC-04, AC-05, AC-07, AC-08 | test             | Pass                                                     |
| AC-01, AC-06, AC-09                      | browser, local   | Carried: three questions in the Chat tab, signed in      |
| T05's `interface-review`                 | the owner        | Carried: `/interface-review` in Claude Code, not a route |
| Every row on production                  | browser          | Carried, after merge, with T01                           |

**Blocked by:** T02 to T05
**Covers:** AC-01 to AC-09

**Done when:**

- [ ] Every acceptance criterion passes, each checked the way its row says:
      locally before merge, and on production after it.
- [ ] Build status at the top of this file set to Done.
