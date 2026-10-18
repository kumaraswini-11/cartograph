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
