# Specs

Cartograph is specified as thirteen specs, `000` to `012`. Each one covers a
single capability: what it must do, why, the rules it must keep, and how to
check that it's done.

The specs name no framework, library, vendor or folder layout. Anyone can
build the product from them with the stack of their choice; how this
repository builds each one is recorded separately, next to the spec.

## How the documents fit together

| Document                       | What it holds                                                                        | Tied to this repository's stack? |
| ------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------- |
| `docs/project-doc.md`          | What Cartograph is, who it's for, the rule everything rests on, scope, ship criteria | No                               |
| `CONTEXT.md`                   | The glossary: one meaning per term                                                   | No                               |
| `docs/specs/NNN-name/spec.md`  | One capability: requirements, constraints, acceptance criteria                       | No                               |
| `docs/specs/NNN-name/plan.md`  | How this repository builds it: modules, data shapes, stack notes, test seams         | Yes                              |
| `docs/specs/NNN-name/tasks.md` | The build as ordered slices, each with its status                                    | Yes                              |
| `docs/adr/`                    | Decisions that are hard to reverse, with the trade-off behind each                   | Yes                              |
| `AGENTS.md`                    | How to work in this repository                                                       | Yes                              |

To build Cartograph your own way, take the project doc, the glossary and the
`spec.md` files, and write your own plans and tasks.

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

1. **Riskiest part first.** Cartograph's bet is that a map parsed from real
   code is correct and readable. If that fails, nothing else matters. So
   milestones M1 and M2 prove the parser and the map before anything else is
   built. They need no account, no database and no network.
2. **Infrastructure arrives with its first user** (deciding and building at
   "the last responsible moment"). Sign-in and storage are well understood
   and supplied by mature services, so they carry little risk. Their first
   real user is "an analysis belongs to an organization", in `008`. Built
   earlier, they would sit idle while the product was still uncertain.
3. **A walking skeleton from day one.** `000` puts an empty application into
   production behind automated checks, so deployment problems surface on the
   first day rather than the last. The platform is chosen in `000`; each
   piece is built when its first user arrives.

Deferring sign-in doesn't mean adding tenancy later. The parser's output
carries no organization at all; organizations enter only where analyses are
stored (`007` and `008`), and that storage enforces row-level access from its
first table.

A team that prefers to start with sign-in and storage can run `006` and `007`
first: they depend only on `000`.

## Working through a spec

1. **Resolve.** Every open question in the spec is answered, and new terms go
   into `CONTEXT.md`.
2. **Spec.** `spec.md` is reviewed and marked Approved.
3. **Plan.** `plan.md` records how this repository builds it.
4. **Tasks.** `tasks.md` breaks the build into slices, each one working end to
   end on its own.
5. **Build.** One task at a time, tests first, at the seams the plan agreed.
6. **Accept.** Every acceptance criterion passes, each checked the way its
   row says.
7. **Review and merge.** The work is reviewed, committed on its own branch
   and merged.

## Conventions

- **Folders** are named `NNN-kebab-case-name`. Numbers are never reused or
  renumbered.
- **Status** is one of Draft, Approved, In progress or Done, at the top of
  each `spec.md`.
- **Requirements** are numbered `FR-NNN` and written in
  [EARS](https://alistairmavin.com/ears/) form: "The parser shall…", "When…,
  the parser shall…", "If…, then the parser shall…".
- **Constraints** (`C-NN`) give the reason, and the failure that would pass a
  casual check.
- **Acceptance criteria** (`AC-NN`) are Given / When / Then, and each one names
  how it's verified: an automated test, a command and its numbers, or a person
  in a browser.
- **Every threshold has a name and a value.** No "about" or "a few".
- **No stack names in a `spec.md`.** Product names stay only where the product
  itself needs them: GitHub, TypeScript, JavaScript.

The templates are in [`_template/`](_template/).
