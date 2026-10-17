# 006 — Sign-in and organizations: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

Identity is Clerk's (`docs/adr/0001`): its sign-in screens, its
organizations and its session token, with the organization claim built in.
The app never asks Clerk who someone is at runtime; it reads the token
(C-01). Clerk's request middleware puts the verified token on every request,
`auth()` reads it in a server function, and a pathless layout route sends a
signed-out visitor to `/sign-in` from `beforeLoad`, on the server, before
any of the page is sent (FR-010).

Every first sign-in gets an organization of its own because Clerk is set to
require membership and to create the first organization itself, named after
the person (FR-005): no code creates it. Invitations are created on the
server, so they can carry this app's sign-in page as their redirect
(FR-008).

Storage is Supabase, which reads Clerk's token through its third-party
connection. No table exists yet (C-05), but the one storage client is
written now, with the token attached to every request, so `007`'s first
policy finds it (C-04).

Clerk documents most of this but not all of it. What it doesn't was
checked on a development instance before anything was built on it (T01,
the risks below), and one finding changed the spec.

## Modules and interfaces

| Module                                                           | What it does                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/start.ts`                                          | `createStart`: request middleware, CSRF protection first, then `clerkMiddleware()` (D-03).                                                                                                           |
| `apps/web/src/lib/session.functions.ts`, `session.server.ts`     | `getSession`: a server function reading `auth()`: the person, the current organization's id, name and whether they're its admin, all from the token (FR-011, FR-012, D-04).                          |
| `apps/web/src/routes/_signed-in.tsx`                             | The pathless layout of every protected page: `beforeLoad` calls `getSession` and throws `redirect` to `/sign-in` when signed out (FR-010); its children read the session from context.               |
| `apps/web/src/routes/_signed-in/dashboard.tsx`                   | `/dashboard`, where every sign-in lands (FR-002): the current organization in the first paint (FR-011), the switcher (FR-006) and, for an admin, the invitation form (FR-007). `007` fills the rest. |
| `apps/web/src/routes/sign-in.$.tsx`                              | `/sign-in`: Clerk's `<SignIn />`, which also signs up and accepts an invitation's ticket (C-02, FR-008); afterwards, `/dashboard`.                                                                   |
| `apps/web/src/lib/invitations.functions.ts`, `.server.ts`        | `inviteMember({ email })`: checks the token's admin claim itself (a route guard doesn't protect a server function), then creates the invitation with `/sign-in` as its redirect (D-06).              |
| `apps/web/src/routes/_signed-in/organization.tsx`                | `/organization`, where the switcher's "Manage" goes: an admin's invitation form, or for a member, that only an admin invites (D-06).                                                                 |
| `apps/web/src/components/organization/`                          | The switcher over a fallback of the same size (D-05), and the invitation form (shadcn `Field`, `Input`, `Button`).                                                                                   |
| `apps/web/src/components/account/account-header.tsx`             | The signed-in pages' header: the app's name, the theme and Clerk's account button over a fallback of its size.                                                                                       |
| `apps/web/src/lib/storage.ts`                                    | `storageClient(getToken)`: the one way to make a Supabase client, its `accessToken` the Clerk token (FR-013, C-03, C-04). No table, no query (C-05).                                                 |
| `apps/web/src/lib/env.server.ts`, `src/env.d.ts`, `.env.example` | The new configuration, checked at start (spec `000`, FR-011).                                                                                                                                        |

## Data

```ts
// What getSession returns: the token's claims, nothing fetched (C-01)
type Session =
  | { signedIn: false }
  | {
      signedIn: true
      userId: string
      organization: {
        id: string // token claim o.id
        name: string // custom claim org_name (D-04)
        admin: boolean // o.rol === "admin"
      }
    }

// Configuration
// Server: CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
// Browser: VITE_CLERK_PUBLISHABLE_KEY
```

The session token (version 2) carries `o: { id, slg, rol, per }` while an
organization is active; the custom claim adds `org_name: "{{org.name}}"`.

## Decisions

- **D-01** Clerk is set, in its dashboard, to require organization
  membership and to create the first organization automatically, named
  `{{user.first_name}}'s organization`, "My organization" when there's no
  first name, with naming from the email's domain off (FR-005). A first
  name is required at sign-up, so the fallback is never reached by an
  email sign-up; GitHub and Google supply it. _Why:_
  Clerk's own recommendation for "every user always has an organization"
  (Clerk: organizations, configure), and no code to own. _Rejected:_
  creating the organization from a `user.created` webhook, which Clerk
  doesn't suggest and which leaves a window with no organization; naming
  from the email domain, which would call everyone at gmail.com "Gmail".
- **D-02** Sign-in methods are Clerk's: GitHub and Google connections and an
  email code, each switched on or off in Clerk's dashboard (FR-003). GitHub
  in production uses this project's own OAuth app with no scopes added
  beyond Clerk's identity defaults (FR-004). Clerk keeps that token on its
  side, which can't be turned off; the app never reads it and stores no
  token (FR-004 as resolved).
- **D-03** `src/start.ts` registers `createCsrfMiddleware` for server
  functions, then `clerkMiddleware()`. _Why:_ once `start.ts` exists,
  TanStack Start stops adding its own CSRF protection (Clerk: TanStack
  Start quickstart), so it's added back by hand, first.
- **D-04** The organization's name is a custom claim in the session token,
  `org_name`, set in Clerk's dashboard. _Why:_ FR-011 needs it in the first
  paint, and C-01 forbids asking Clerk for it while rendering. _Rejected:_
  the Backend API on every render (a runtime question to the provider);
  the slug (not the name people gave it); rendering it only in the browser
  (not in the first paint).
- **D-05** `ClerkProvider` sits in the root document, as Clerk's TanStack
  Start guide places it; `<SignIn />`, `<OrganizationSwitcher />` and
  `<UserButton />` are Clerk's components, themed with `@clerk/ui`'s shadcn
  theme and its `@clerk/ui/themes/shadcn.css`, so they use this app's
  tokens (out of scope: styling beyond matching; `@clerk/themes` is the
  older SDKs' package). Each renders in `<ClerkLoaded>`, with a fallback of
  its size in `<ClerkLoading>`, so nothing shifts when they load (`012`
  CLS). _Why not `<ClientOnly>`_ (AGENTS.md's rule for browser-only UI):
  Clerk's components wait for Clerk's script, not only the browser, so
  `<ClientOnly>` would still leave a gap after hydration; `<ClerkLoading>`
  renders on the server and stays until the component can draw. Pages that don't sign anyone
  in, home and the samples, still load Clerk's script; T04 measures them
  against `012`'s thresholds, and if they fail, the provider moves under
  the routes that need it.
- **D-06** Invitations are created by a server function with the Backend
  API's `createOrganizationInvitation`, role `org:member` and `redirectUrl`
  this app's `/sign-in`. _Why:_ the browser's `inviteMember()` can't set a
  redirect, so its invitations would open Clerk's hosted page, not this
  app's (FR-008). The function checks the token's admin claim itself, since
  a route guard doesn't protect a server function (TanStack: auth and
  guards). Only admins see the form (FR-007, FR-009).
- **D-07** After an invitation is accepted, the invited organization becomes
  current: `<SignIn />` completes the ticket and Clerk makes that
  organization active, so no code of ours sets it (confirmed in T01: the
  invited person's session came back with the invited organization current
  and their role `member` in it). A person left with no organization gets
  a pending session with Clerk's `choose-organization` task; `auth()` treats
  it as signed out, so they're sent to `/sign-in`, whose `<SignIn />` shows
  the task (spec edge case).
- **D-08** Storage: Supabase's third-party connection to Clerk (Clerk's
  "Connect with Supabase"), which adds the `role: authenticated` claim, and
  `createClient(url, publishableKey, { accessToken })`, the Clerk token
  each time. _Why:_ Supabase's documented way, which replaced the JWT
  template deprecated on 1 April 2025; with `accessToken` set, Supabase
  Auth can't be used on that client, so there is one session system
  (C-03). `007`'s policies read `auth.jwt()->'o'->>'id'`.
- **D-09** AC-06 and AC-08 read Clerk itself, so they're checked by a script
  against the development instance (`pnpm --filter web clerk:check`), as
  the golden scripts check the parser: with test users made through the
  Backend API, it reads a session token's claims, switches organization
  and reads them again, and lists the instance's roles. Signing up can't be
  scripted (Clerk completes it only in its own component), so AC-01 stays
  in the browser. Vitest covers what's this app's own: reading the claims
  into a `Session`, the admin check, and the storage client's header
  (AC-09). _Why:_ a unit test of a mocked Clerk proves nothing about
  Clerk's token. A departure from the spec's "test" for those two rows.

## What needs doing outside the code

Done by the repository's owner, in each service's dashboard; the plan's
tasks name which they need:

- **Clerk:** an application with a development and a production instance;
  organizations on, membership required, first organization created
  automatically with D-01's naming; GitHub, Google and email code on,
  passwords off, a first name required; the `org_name` custom claim;
  component paths pointing at `/sign-in`; in production, GitHub and Google
  OAuth apps of this project's own. The development instance's settings
  were applied with `clerk config patch` and checked with `config pull`;
  production gets the same patch.
- **Supabase:** a project, with Clerk added as a third-party provider, and
  its own sign-up turned off, so Clerk is the only way in (C-03).
- **Configuration:** the four variables in `apps/web/.env.local`, and in
  Vercel for preview and production. Previews take the development
  instance's keys and production the production instance's: an invitation
  leads to the deployment that sent it (D-06), and a production instance
  accepts redirects only to its own domain, not to a preview's address.

## Testing

- Vitest: the claims read into a `Session` (signed out, no organization,
  admin and member); `inviteMember` refusing a member and a signed-out
  call; the storage client sending `Authorization: Bearer <token>` (AC-09);
  configuration missing a variable stops the server.
- Script against the development instance: AC-06 and AC-08 (D-09).
- Browser, then on the preview: each method lands on `/dashboard` in an
  organization named after the account (AC-01); an invitation to a second
  account (AC-02); the organization in the server's HTML (AC-03); a
  signed-out `/dashboard` answered with a redirect and no page (AC-04); a
  method switched off disappears (AC-05); GitHub's consent screen (AC-07).

## Risks

- **Undocumented behaviours** → checked in T01 on the development instance:
  an accepted invitation's organization becomes active; `{{org.name}}` is a
  valid claim and follows a switch; a revoked invitation is refused with
  `organization_invitation_revoked_code`; only `org:admin` and `org:member`
  exist. A last membership _can_ be removed, which changed the spec's edge
  case (D-07). The automatic organization at sign-up can only be checked in
  the browser, so T02 checks it.
- **Clerk's script on every page** → measured in T04 against `012` (D-05).
- **A removed member's token is good for up to a minute** → accepted in the
  spec (edge cases); `007`'s policies read the same token.
- **CI has no Clerk keys** → nothing at build or in tests calls Clerk: the
  build inlines the browser key when it's set and still builds without it,
  the tests use fixtures, and the script in D-09 runs locally with the
  development keys. Vercel's builds have the key set.
