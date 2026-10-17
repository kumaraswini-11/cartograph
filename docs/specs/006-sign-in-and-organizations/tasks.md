# 006 — Sign-in and organizations: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** Done, with the preview's browser checks carried into
`007` (T05)

## T01 — The services, and what Clerk doesn't document

**Status:** Done
**Blocked by:** none
**Covers:** D-01, D-02, D-04, D-08, the plan's risks

**What to build:** with the repository's owner, the Clerk application
(development instance first) and the Supabase project, set up as the plan's
"What needs doing outside the code" says; then, on the development
instance, the five undocumented behaviours confirmed or not, and the plan
changed where one isn't as assumed.

**Done when:**

- [x] The development instance and the Supabase project are set up, and
      Supabase accepts the Clerk token.
- [x] Supabase's own sign-up is off.
- [x] Each of the five behaviours in the plan's risks is confirmed or the
      plan says what replaces it. The first sign-in's automatic
      organization can only be checked in the browser, so it moves to T02.

## T02 — Sign-in and the protected dashboard

**Status:** Done
**Blocked by:** T01
**Covers:** FR-001 to FR-005, FR-010 to FR-012, C-01, C-02, AC-01, AC-03 to
AC-05, AC-07

**What to build:** `start.ts` with CSRF and Clerk's middleware, the
configuration, `ClerkProvider`, `/sign-in`, `getSession`, the `_signed-in`
layout and `/dashboard` with the current organization's name in the first
paint.

**Done when:**

- [x] A first sign-in on the development instance lands on `/dashboard` in
      an organization named after the account, with no screen asking for
      one (email, in the browser with a testing token; GitHub and Google in
      T05).
- [x] A signed-out `/dashboard` is answered with a redirect and no page; a
      signed-in one has the organization's name in the server's HTML.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — Switching and inviting

**Status:** Done
**Blocked by:** T02
**Covers:** FR-006 to FR-009, the spec's edge cases, AC-02, AC-06, AC-08

**What to build:** the organization switcher; the invitation form for
admins and `inviteMember`; accepting an invitation through `/sign-in` into
that organization; the `clerk:check` script (D-09).

**Done when:**

- [x] An invitation to a second account lands it in that organization, and
      a revoked one says it no longer applies.
- [x] `clerk:check` shows the claim change on a switch and the default
      roles only.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — Storage carries the token

**Status:** Done
**Blocked by:** T02
**Covers:** FR-013, C-03 to C-05, AC-09, D-05's measurement

**What to build:** `storageClient` with the Clerk token as its access token;
no table. Home and a sample measured with Clerk's script loaded against
`012`'s thresholds.

**Done when:**

- [x] A storage request carries the signed-in person's token (AC-09).
- [x] Home and a sample still meet `012`'s thresholds, or the provider is
      moved under the routes that need it: it was moved (plan D-05).
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — Acceptance

**Status:** Done, with the preview's browser checks carried into `007`
**Blocked by:** T03, T04
**Covers:** AC-01 to AC-09

**Done when:**

- [x] Checked as their rows say: AC-06 and AC-08 by `clerk:check` against
      the development instance; AC-09 by test, and against the real
      Supabase project (a Clerk token accepted, a forged one refused).
- [x] In a real browser on the production build, locally: AC-01 for email
      (a new account lands on `/dashboard` in an organization named after
      it), AC-02 (an invitation lands its person in that organization),
      AC-03 (the organization's name in the server's HTML) and AC-04 (a
      signed-out `/dashboard` answered with a redirect and an empty body).
- [ ] On the preview deployment, by the repository's owner: AC-01 for
      GitHub and Google, AC-02, AC-03, AC-05 (a method switched off
      disappears) and AC-07 (GitHub's consent screen). Carried into the
      start of `007` at the owner's decision on 2026-10-17, since the
      preview is behind Vercel's sign-in.
- [x] The test users and organizations made on the development instance
      deleted; the owner's accounts kept.
- [x] Build status at the top of this file set to Done.
