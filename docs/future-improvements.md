# Future improvements

<!--
  Product ideas not yet specified, kept so they aren't lost. Each says what
  it is, who it's for, how it fits the rule everything rests on
  (docs/project-doc.md), and its rough size. When one is taken up, it
  becomes a spec under docs/specs and leaves this list. Ideas the project
  doc already rules out are listed at the end, with the reason.
-->

## Where Cartograph stands among repository tools

Compared on 2026-10-18 with the tools in
[a GitHub URL tricks cheat sheet](research/github-url-tricks-cheatsheet.pdf),
each described from its own site. All six open a public repository from a
changed GitHub address. They differ in what they do with it, and above all
in **how**: from the code, or from a model reading it.

| Tool                                        | What it does, in its own words                                                                        | How the structure is found                                                                                                                                                                                                                                            | Cartograph today                                                                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [GitDiagram](https://gitdiagram.com/)       | "Turn any GitHub repository into an interactive architecture diagram or a one-minute explainer video" | A model draws the graph, edges included, from a bounded excerpt of the file tree, the README and some source; the server then checks the paths it names exist ([its architecture doc](https://github.com/ahmedkhaleel2004/gitdiagram/blob/main/docs/architecture.md)) | The map (`003`): every line is an import the parser resolved, folders fold into boxes, and what couldn't be resolved is counted, never drawn    |
| [ExplainGitHub](https://explaingithub.com/) | "AI-powered chat, history, and insights to speed up code comprehension"                               | A model reads the repository and explains it                                                                                                                                                                                                                          | Explanations (`009`) and chat (`010`): written from parsed facts, every named file checked against the analysis, the chat's lookups shown first |
| [Gitingest](https://gitingest.com/)         | A "prompt-friendly text" of a repository: summary, directory structure, file contents                 | None: the files, as text, for a model to read                                                                                                                                                                                                                         | Nothing like it                                                                                                                                 |
| [Uithub](https://uithub.com/)               | Repository context "to use as context for your LLM"                                                   | None: the files, as text                                                                                                                                                                                                                                              | Nothing like it                                                                                                                                 |
| [GitReverse](https://gitreverse.com/)       | "Reverse engineer a GitHub repo or a website into a prompt you can build from"                        | A model summarises the repository into a prompt                                                                                                                                                                                                                       | Nothing like it                                                                                                                                 |
| [github.dev](https://github.dev/)           | The repository in a browser-based editor                                                              | None: it's an editor                                                                                                                                                                                                                                                  | Not our job: Cartograph explains code, it doesn't edit it                                                                                       |

### What's different about Cartograph

- **The structure is parsed, never generated.** GitDiagram, the closest
  tool, lets a model decide what connects to what. Cartograph's edges are
  resolved imports; the AI only explains and labels (the project doc's rule).
- **Its limits are stated, not hidden.** Coverage says how much was parsed
  and names each unresolved import; a route is shown only when its method and
  path are both recovered exactly.
- **Answers are checked.** No explanation or answer names a file the analysis
  doesn't have, and `011` measures it on pinned cases.
- **Questions get arithmetic.** Blast radius and dependency chain are walks
  over the edges, the same in the pane and in chat.

The others are faster to build and open any repository in seconds; that's
the trade the project doc chose not to make.

## Ideas worth considering

### Open a repository by changing its address

- **What:** every tool above starts from a changed GitHub address. Cartograph
  could too: `…/github.com/owner/name` opening that repository's analysis,
  or starting one, after sign-in.
- **For:** anyone who meets a repository on GitHub and wants its map now.
- **Fits the rule:** yes; it changes only how an analysis is asked for.
- **Size:** small. Best after a domain of our own (`012`), so the address is
  short.

### Open a file where it lives

- **What:** from the detail pane, a file's own page on GitHub at the analysed
  commit (`github.com/owner/name/blob/<commit>/<path>`), or in github.dev.
- **For:** a reader who wants the code behind a box, at exactly the commit
  the map shows.
- **Fits the rule:** yes; a link, built from facts the analysis already has.
- **Size:** small.

### Give an AI assistant the map's facts

- **What:** Gitingest, Uithub and GitReverse hand a model the files as text,
  and the model still has to work out the structure. Cartograph could hand
  over the structure itself, already parsed:
  - an export of the analysis as Markdown or JSON: files and roles, edges,
    routes, insights, coverage;
  - or the chat's lookups (`010`) as an MCP server, so a coding assistant
    asks Cartograph "what breaks if this changes?" instead of guessing.
- **For:** developers working with AI coding assistants, the people the
  project doc says now ship code they haven't read.
- **Fits the rule:** yes, closely: the assistant gets parsed facts, never a
  model's guess. It's the distinctive version of what three of these tools
  do.
- **Size:** medium for the export; larger for the MCP server, which needs
  its own authentication and limits.

### Export the map as a diagram

- **What:** the map, or one box's part of it, as Mermaid, SVG or PNG, as
  GitDiagram exports its diagrams.
- **For:** a README, a design document, a review.
- **Fits the rule:** yes: unlike a generated diagram, every arrow is an
  import.
- **Size:** small to medium; the layout already exists (`003`).

### Share an analysis by link

- **What:** a read-only link to a public repository's map, for someone
  without an account, as the public tools' pages are.
- **For:** sending a map to a colleague or a candidate.
- **Fits the rule:** yes, but it meets `007`'s rule that every analysis
  belongs to an organization. It needs a decision on what a link may show and
  for how long.
- **Size:** medium.

### Keep conversations

- **What:** ExplainGitHub keeps a chat's history; `010` decided not to
  (FR-012), to keep stored text and who-may-read-whose out of v1.
- **Fits the rule:** yes; it's a privacy and storage question, not a
  structure one.
- **Size:** medium: storage, a list, deletion.

### Plans and pricing, past the limits

- **What:** `012` limits each organization's runs and model calls. Past a
  limit, instead of only "try again tomorrow", offer a plan: "Your
  organization has used today's 100 model calls: upgrade for more." Plans
  per organization, a usage meter, and a paywall at the limit.
- **For:** organizations that use Cartograph every day; and, as a piece of
  work, it shows plans, metering and payments end to end.
- **Fits the rule:** yes; it changes how much, never what's shown.
- **How:** Clerk, already the sign-in and organizations, has Billing for
  organizations (B2B plans, paid through your own Stripe account, 0.7% a
  transaction on top of Stripe's fees). It's in beta: its APIs may change.
- **Before it can be built:**
  - a production Clerk instance, which needs a domain of our own (`012`
    stays on the development instance, at $0);
  - a Stripe account of our own;
  - Gemini's paid tier: on the free tier, Google may use the requests to
    improve its products (ADR 0003), which a paying customer shouldn't
    accept.
- **Also considered:** letting a heavy user bring their own model key, so
  their use costs us nothing.
- **Size:** large.
- **Sources:** [Clerk Billing for B2B SaaS](https://clerk.com/docs/nextjs/guides/billing/for-b2b).

### A cookie notice: not needed now, and when it would be

- **Now:** none is needed. The EU rule (ePrivacy Directive, Article 5(3))
  asks consent to store or read anything on a visitor's device, except what
  is strictly necessary for the service they asked for, such as sign-in
  session cookies (Clerk's). `012`'s analytics keep events in memory, with no
  cookie or local storage, and no personal data (FR-003), so nothing is
  stored to ask about. A banner shown when it isn't required only adds
  friction.
- **Still worth doing:** a short privacy page saying what's collected and
  why, which GDPR's duty to inform asks for whatever the cookies.
- **It becomes needed if** we add cookie-based analytics, session replay,
  advertising or marketing pixels: then consent before they run, with
  "reject" as easy as "accept".
- **Caveat:** the sources are mostly compliance vendors' summaries, and the
  directive is applied by each country's law; not legal advice. Check before
  marketing in the EU.
- **Sources:** [Article 5(3) and its exemptions](https://presencis.com/regulations/eprivacy-directive/article-5-3/),
  [strictly necessary cookies](https://www.cookieyes.com/cookie-consent-exemption-for-strictly-necessary-cookies/),
  [PostHog on cookieless, GDPR-friendly analytics](https://posthog.com/blog/best-gdpr-compliant-analytics-tools).

### A component workshop and visual review: Storybook and Chromatic

- **What:** a Storybook of the interface: the shared compositions in
  `packages/ui` and the app's presentational components (the map's boxes and
  panels, the detail pane, a chat reply and its lookups, run progress, the
  empty and error states), each in the states that matter: loading, empty,
  failed, a very long path, dark theme. Chromatic publishes it on every pull
  request, takes a snapshot of each story, and shows what changed, pixel by
  pixel, for someone to accept or send back.
- **For:** catching what the tests can't see: a theme token, a shadcn
  update or a layout change that moves something, before it merges.
  Reviewing the interface in the pull request rather than by running the
  branch. And a catalogue of the components for whoever builds on them.
- **Fits the rule:** yes; it's tooling, and nothing on the map changes.
- **How:**
  - Storybook's TanStack React framework (`@storybook/tanstack-react`, on
    `@storybook/react-vite`): each story renders inside a memory-backed
    router, and `createServerFn` handlers are replaced with mocks a story
    can set. That suits this repository's rule that presentational
    components are given their data, never fetch it (`AGENTS.md`).
  - Storybook's Vitest addon (`@storybook/addon-vitest`) runs every story as
    a test in a real Chromium browser, with accessibility checks alongside:
    the laid-out complement to `apps/web/src/a11y.test.tsx`, which audits
    whole pages but has no layout, so can't measure contrast or target
    size.
  - The stories' data from the fixtures the tests already use (a parsed
    repository turned into a map's input), so a story shows a real map, not
    a drawing of one.
  - Chromatic in CI on each pull request, with TurboSnap so only the stories
    a change can affect are snapshotted again.
- **Before it can be built:** a Chromatic project and its token as a GitHub
  Actions secret; the packages pinned in the catalog; the first stories
  chosen (the map's boxes, the detail pane, a chat reply, the account
  header).
- **Cost:** $0 on Chromatic's free plan: 5,000 snapshots a month, Chrome
  only. Every story counts once per theme and per viewport, so the stories
  are chosen, not everything.
- **Size:** medium.
- **Sources:** [Storybook for TanStack React](https://storybook.js.org/docs/get-started/frameworks/tanstack-react),
  [the Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon),
  [Chromatic's pricing](https://www.chromatic.com/pricing).

## Already ruled out

From `docs/project-doc.md` ("Out of scope, and why"), and what these tools
show of each:

- **A model drawing the diagram** (GitDiagram's approach). The rule
  everything rests on: the AI may explain and label; it may never decide two
  files are connected.
- **An explainer video of the architecture.** Narrating structure is the
  same risk; if it ever comes, it's built from the map's facts, never from a
  model reading the code.
- **Editing code** (github.dev). Cartograph explains a codebase; it doesn't
  change one.
- **Private repositories.** They need a stored token; not in v1.
- **Scores and grades.** It explains; it doesn't review.
