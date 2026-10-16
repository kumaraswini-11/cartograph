# Specs

Cartograph is specified as thirteen specs, `000` to `012`. Each one covers a
single capability: what it must do, why, the rules it must keep, and how to
check that it's done.

The specs name no framework, library, vendor or folder layout. Anyone can
build the product from them with the stack of their choice; how this
repository builds each one is recorded separately, next to the spec.

## How the documents fit together

| Document                       | What it holds                                                                                                                                                                 | Tied to this repository's stack? |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `docs/project-doc.md`          | What Cartograph is, who it's for, the rule everything rests on, scope, ship criteria                                                                                          | No                               |
| `CONTEXT.md`                   | The glossary: one meaning per term, a [ubiquitous language](https://martinfowler.com/bliki/UbiquitousLanguage.html)                                                           | No                               |
| `docs/specs/NNN-name/spec.md`  | One capability: requirements, constraints, acceptance criteria                                                                                                                | No                               |
| `docs/specs/NNN-name/plan.md`  | How this repository builds it: modules, data shapes, stack notes, test seams                                                                                                  | Yes                              |
| `docs/specs/NNN-name/tasks.md` | The build as ordered slices, each with its status                                                                                                                             | Yes                              |
| `docs/adr/`                    | [Architecture decision records](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions): decisions that are hard to reverse, with the trade-off behind each | Yes                              |
| `AGENTS.md`                    | How to work in this repository                                                                                                                                                | Yes                              |

## Where to start

- **To build Cartograph your own way:** read `docs/project-doc.md`, then
  `CONTEXT.md`, then the `spec.md` files in the order below, and write your own
  plans and tasks. You never need this repository's plans, tasks or decision
  records.
- **To work on this repository:** read the README, then `AGENTS.md`, then the
  `spec.md`, `plan.md` and `tasks.md` of the spec you're working on.

`plan.md` and `tasks.md` are written when a spec's build starts, and a
decision record when a hard-to-reverse choice is made, so the documents grow
with the build rather than all existing up front.

## Choosing a stack

The specs ask for capabilities (`000-platform-requirements`), not products.
Any stack that provides them can build Cartograph:

- **Layout:** one package, or a monorepo of several. Either way it ships as one
  deployable application (`000` C-01), and the parser must run standalone,
  with no framework, interface or storage (`001` C-01).
- **Interface:** any UI framework that renders on the server and draws the map
  in the browser.
- **Services:** any storage, identity, AI and tracing services that provide the
  capabilities in `000`.

This repository is a modular monolith in a monorepo: one deployable app in
`apps/web`, with its code split into packages under `packages/`. It's built
with TanStack Start, shadcn/ui on Base UI, Tailwind CSS, TypeScript, pnpm and
Turborepo. The choices, the reasons and the alternatives are in
[`docs/adr/0001-stack-and-repository-layout.md`](../adr/0001-stack-and-repository-layout.md).

## The specs

| Spec                            | Milestone       | Delivers                                                                               | Depends on    |
| ------------------------------- | --------------- | -------------------------------------------------------------------------------------- | ------------- |
| `000-platform-requirements`     | M0 Foundation   | What the platform must provide, as capabilities; a deployed, checked empty application | none          |
| `001-repository-parser`         | M1 Engine       | Files, edges, folders and coverage from a directory on disk; the data contract         | 000           |
| `002-framework-detection`       | M1 Engine       | Framework adapters, file roles, exact routes, the role taxonomy                        | 001           |
| `003-dependency-map`            | M2 Explorer     | The three-column shell, folding, folder panels, selection, the role rail               | 001, 002      |
| `004-detail-pane`               | M2 Explorer     | The detail pane, neighbours, blast radius and dependency chain                         | 003           |
| `005-structural-insights`       | M2 Explorer     | Cycles, unimported files, heavily imported files, oversized files; the routes table    | 002, 004      |
| `006-sign-in-and-organizations` | M3 Platform     | Sign-in, organizations, invitations, protected pages                                   | 000           |
| `007-organization-dashboard`    | M3 Platform     | Storage with row-level access by organization; the dashboard                           | 006           |
| `008-repository-analysis`       | M3 Platform     | A public repository URL in, a stored map out, with live progress                       | 001, 002, 007 |
| `009-file-explanations`         | M4 Intelligence | Traced, cached explanations of files and folders, written from their real neighbours   | 004, 008      |
| `010-repository-chat`           | M4 Intelligence | Questions answered by looking facts up, with every lookup shown                        | 004, 009      |
| `011-ai-evaluation`             | M4 Intelligence | AI answer quality measured as a number, for explanations and chat                      | 009, 010      |
| `012-production-readiness`      | M5 Ship         | Error reporting, product analytics, security headers, the ship criteria checked        | all           |

A spec can start once every spec it depends on is done. The order above is
the recommended one; any order that respects the dependencies works.

## Why this order

The order follows three rules, each a known practice:

1. **Riskiest part first** (risk-driven, as in Barry Boehm's
   [spiral model](https://en.wikipedia.org/wiki/Spiral_model)). Cartograph's
   bet is that a map parsed from real code is correct and readable. If that
   fails, nothing else matters. So milestones M1 and M2 prove the parser and
   the map before anything else is built. They need no account, no database
   and no network.
2. **Infrastructure arrives with its first user** (deciding and building at
   [the last responsible moment](https://blog.codinghorror.com/the-last-responsible-moment/),
   from Mary and Tom Poppendieck's _Lean Software Development_). Sign-in and storage are well understood
   and supplied by mature services, so they carry little risk. Their first
   real user is "an analysis belongs to an organization", in `008`. Built
   earlier, they would sit idle while the product was still uncertain.
3. **A [walking skeleton](https://wiki.c2.com/?WalkingSkeleton) from day
   one** (Alistair Cockburn's term). `000` puts an empty application into
   production behind automated checks, so deployment problems surface on the
   first day rather than the last. The platform is chosen in `000`; each
   piece is built when its first user arrives.

Deferring sign-in doesn't mean adding tenancy later. The parser's output
carries no organization at all; organizations enter only where analyses are
stored (`007` and `008`), and that storage enforces row-level access from its
first table.

A team that prefers to start with sign-in and storage can run `006` and `007`
first: they depend only on `000`.

## One spec at a time

Build only what the current spec asks for: **YAGNI**, "You Aren't Gonna
Need It" ([Martin Fowler](https://martinfowler.com/bliki/Yagni.html)). Code is
never written ahead for a spec that hasn't started.

Later specs are drafts written ahead to show where the product is going, not
commitments. Each is resolved again when its turn comes, with what the earlier
specs taught, and changes if it needs to: the whole path is planned roughly
and each step in detail only when it's reached
([rolling-wave planning](https://en.wikipedia.org/wiki/Rolling-wave_planning)).

`000` is the one spec that looks ahead on purpose. It names the capabilities
later specs need, so the platform chosen can provide them, and builds none of
them.

## Working through a spec

1. **Resolve.** Every open question in the spec is answered, and new terms go
   into `CONTEXT.md`.
2. **Spec.** `spec.md` is reviewed and marked Approved.
3. **Plan.** `plan.md` records how this repository builds it, including the
   value it gives each platform-dependent threshold.
4. **Tasks.** `tasks.md` breaks the build into slices, each one working end to
   end on its own.
5. **Build.** One task at a time, tests first, at the seams the plan agreed.
6. **Accept.** Every acceptance criterion passes, each checked the way its
   row says.
7. **Review and merge.** The work is reviewed, committed on its own branch
   and merged, and `tasks.md` is marked Done.

## Conventions

- **Folders** are named `NNN-kebab-case-name`. Numbers are never reused or
  renumbered.
- **A spec's status** is Draft or Approved, at the top of `spec.md`.
  Approved means its product decisions are settled; it says nothing about
  this repository's build, so the specs stay true for anyone who builds from
  them.
- **The build's status** is Not started, In progress or Done, at the top of
  `tasks.md`, beside each task's own status.
- **Requirements** are numbered `FR-NNN` and written in
  [EARS](https://alistairmavin.com/ears/) form: "The parser shall…", "When…,
  the parser shall…", "If…, then the parser shall…".
- **Constraints** (`C-NN`) give the reason, and the failure that would pass a
  casual check.
- **Acceptance criteria** (`AC-NN`) are
  [Given / When / Then](https://martinfowler.com/bliki/GivenWhenThen.html), and each one names
  how it's verified: an automated test, a command and its numbers, or a person
  in a browser.
- **Every threshold has a name and a value.** No "about" or "a few". A
  threshold that defines the product (`FOLD_TARGET`) has its value in the
  spec. One that depends on the platform (`MAX_RUN_SECONDS`) is named in the
  spec with what it must cover, and each repository sets its value in its
  `plan.md`, with the reason.
- **No stack names in a `spec.md`.** Product names stay only where the product
  itself needs them: GitHub, TypeScript, JavaScript.

The templates are in [`_template/`](_template/).
