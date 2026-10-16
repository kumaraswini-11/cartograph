# Cartograph

Cartograph maps a public TypeScript or JavaScript repository from its parsed
code: folders as boxes, edges as lines, and nothing on the map guessed. This
glossary fixes one meaning per term for the specs, the code and the
interface.

## Language

### Repositories and analyses

**Repository**:
A public GitHub repository of TypeScript or JavaScript code.
_Avoid_: project, codebase, repo

**Analysis**:
An organization's map of one repository. An organization has at most one
analysis per repository.
_Avoid_: report, scan, project

**Run**:
One pass that fetches a repository at a commit, parses it and stores the
result for an analysis. It moves through named stages and ends done or
failed.
_Avoid_: job, scan, parse

**Stage**:
One named step of a run: fetching, parsing, storing.
_Avoid_: step, phase, status

**Stale run**:
A run that is neither done nor failed after `STALE_RUN_AFTER` has passed.
_Avoid_: stuck run, hung run

### Parsing

**Parser**:
The part of Cartograph that turns a directory on disk into files, edges and
coverage. It knows no framework, interface or database.
_Avoid_: analyser, scanner

**File**:
A JavaScript or TypeScript source file the parser read.
_Avoid_: module, node

**Package**:
The repository itself, or a workspace package it contains: a folder with its
own manifest. Each file belongs to the innermost package that holds it, and
each package has its own framework, or none.
_Avoid_: project, app, module

**Folder**:
A directory of the repository, holding files; the unit the map groups by.
_Avoid_: directory, module, package

**Import**:
A reference from one file to a module: a static import, a re-export, a
dynamic import with a literal string, or a `require()` with a literal string.
_Avoid_: dependency, reference

**Resolution**:
Where an import ends up: resolved (a file in the repository), external (a
package or built-in), excluded (a path deliberately not parsed) or unresolved.
_Avoid_: status, result

**Unresolved import**:
An import that should lead to a file in the repository but leads nowhere.
It always carries a reason.
_Avoid_: broken import, missing import

**Edge**:
A connection from one file to another, existing only because an import
resolved to that file.
_Avoid_: link, connection, dependency

**Type-only edge**:
An edge from an import that exists only at compile time (`import type`).
_Avoid_: type import

**Dependencies**:
The files a file has edges to. Their count is the file's fan-out.
_Avoid_: imports, outgoing files

**Dependents**:
The files with edges to a file. Their count is the file's fan-in.
_Avoid_: importers, consumers, incoming files

**Entry point**:
A file reached without any import: the framework loads it, a package
manifest names it, a script runs it, or a tool finds it by name.
_Avoid_: root, orphan

**Skipped file**:
A file the parser found but didn't read, with a reason.
_Avoid_: ignored file, dropped file

**Coverage**:
What the parser saw and what became of it: files found, parsed and skipped,
and every import by resolution, each gap with its reason.
_Avoid_: completeness, health, score

### Frameworks

**Framework**:
The conventions a package follows that an adapter recognises, or none. A
repository whose packages follow different frameworks has several.
_Avoid_: stack, platform

**Adapter**:
The knowledge of one framework: whether a repository uses it, each file's
role, and the routes.
_Avoid_: plugin, detector, driver

**Role**:
What sort of file a file is, named the way its framework names it:
Controllers, Page routes, Services, Hooks.
_Avoid_: kind, type, category

**Tier**:
Where a role sits in reading order, and the colour it takes: surface (where
a request or caller comes in), layer (what sits behind it), plumbing, and
unidentified.
_Avoid_: level, group

**Taxonomy**:
A framework's roles, in the fixed order the rail shows them. An analysis
whose packages follow several frameworks merges their taxonomies, tier by
tier.
_Avoid_: categories, classification

**Route**:
An HTTP method and full path pattern recovered exactly from the code. A
route that can't be recovered exactly isn't a route.
_Avoid_: endpoint, path

### The map

**Map**:
The picture of an analysis: folders as boxes, edges as lines between them.
_Avoid_: graph, canvas, diagram, visualisation

**Folding**:
Merging small folders into their parents, deepest first, until the map holds
at most `FOLD_TARGET` boxes.
_Avoid_: clustering, grouping, collapsing

**Box**:
One folder on the map, standing for itself and every folder folded into it.
_Avoid_: node, cluster, group

**Panel**:
An open box: a bordered box listing its files as rows.
_Avoid_: expanded node, card

**Selection**:
The one file or box chosen on the map. It, its edges and its neighbours stay
at full strength; everything else dims.
_Avoid_: focus, highlight

**Neighbour**:
A file one edge away from the selection, in either direction.
_Avoid_: adjacent file, connection

**Blast radius**:
A file's dependents, followed transitively through every level: what may
break if it changes.
_Avoid_: impact, ripple

**Dependency chain**:
A file's dependencies, followed transitively through every level: what it
needs.
_Avoid_: dependency tree, supply chain

**Rail**:
The left column: the analysis's taxonomy, each role with its file count.
Choosing a role dims every file outside it.
_Avoid_: sidebar, legend, filter panel

**Detail pane**:
The right column: everything about the selection, or a summary of the
repository when nothing is selected.
_Avoid_: inspector, sidebar, drawer

**Insight**:
A fact about the edges, stated in a fixed sentence: a cycle, an unimported
file, a heavily imported file, an oversized file. Never a score or a verdict.
_Avoid_: issue, finding, warning, problem

**Unimported file**:
A file with no dependents that is not an entry point.
_Avoid_: orphan, dead file, unused file

### Organizations

**Organization**:
A team. Every analysis belongs to one, and membership decides what a person
can see.
_Avoid_: team, workspace, tenant, account

**Member**:
A person who belongs to an organization.
_Avoid_: user, seat

**Invitation**:
An offer, sent to an email address, to join an organization.
_Avoid_: invite link

**Dashboard**:
An organization's list of its analyses, each with the state of its latest
run.
_Avoid_: home, overview, workspace

### AI

**Explanation**:
A paragraph a model writes about one file or box, from its real neighbours.
_Avoid_: summary, description, analysis

**Inferred role**:
A role a model gives a file no adapter identified. It is never a surface
role.
_Avoid_: AI label, classification

**Lookup**:
One fact the chat fetched from the analysis before answering, shown with the
answer.
_Avoid_: tool call, search

**Grounded**:
Said of AI output in which every file named exists in the analysis.
_Avoid_: accurate, verified

**Stale explanation**:
An explanation whose file, or whose repository, has changed since it was
written.
_Avoid_: outdated, expired

**Case**:
One pinned input to the evaluation: a file or box to explain, or a question
to ask, at a repository commit, with the facts its output must contain.
_Avoid_: test, sample, prompt
