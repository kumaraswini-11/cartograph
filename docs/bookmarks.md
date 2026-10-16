# Bookmarks

<!--
  Curated external references worth coming back to while building Cartograph:
  official docs, articles, talks, repos and tools, grouped by topic.
  One line per link: the link, then why it matters.
  Toolchain sources and upgrade decisions don't belong here.
-->

## Interface and design

- [Design System Checklist](https://www.designsystemchecklist.com/): open checklist of what a design system should cover (design language, foundations like colour and type, components, tooling, process). Useful when settling Cartograph's tokens and palette; the four starting decisions in `docs/project-doc.md` still come first.
- [Design Token Naming Convention Tool](https://www.namedesigntokens.guide/): interactive guide for choosing a consistent token-naming scheme (category, property, variant, state). Pair with `token-naming.md` in Jakub Krehel's `better-colors` skill (see Agent skills) when the token set is defined.

## Products and services

- [kapa.ai](https://www.kapa.ai/): indexes a company's docs, tickets and wikis and serves AI answers (site, support, Slack) through an API or MCP server. Reference for grounded, source-backed answering, the behaviour Cartograph's chat panel must have.
- [Descope](https://www.descope.com/): customer and agent identity platform built on visual workflows, SDKs and APIs. Alternative to Clerk, which is the current choice in `docs/project-doc.md`.
- [lemlist](https://www.lemlist.com/): AI outbound sales tool for prospect finding and multichannel outreach (email, LinkedIn, phone). Go-to-market, not part of the codebase.

## Agent skills

Skills for Claude Code are committed as plain files in `.claude/skills/`, with
each skill's source and content hash in `skills-lock.json`. They're managed
with the [skills CLI](https://github.com/vercel-labs/skills).

### Commands

```bash
# Add skills from a source (--skill '*' adds every skill in it)
pnpm dlx skills@latest add <source> --skill <name> <name> -a claude-code --copy -y

# Update every installed skill, using skills-lock.json
pnpm dlx skills@latest update

# Remove a skill
pnpm dlx skills@latest remove <name> -a claude-code -y

# See what's installed, and what a source offers before installing
pnpm dlx skills@latest list
pnpm dlx skills@latest add <source> --list
```

For example:
`pnpm dlx skills@latest add clerk/skills --skill clerk-orgs -a claude-code --copy -y`.

### Flags to always use

- `-a claude-code`: installs for Claude Code only, into `.claude/skills/`, the
  only project folder it loads skills from. Without it the CLI asks which
  agents, and each extra one adds a folder (`.agents/skills/`, `skills/`, …).
- `--copy`: writes real files. The default, "Symlink", keeps the files in
  `.agents/skills/` and links to them, and git on Windows turns those links
  into duplicate copies.
- Never `--all`: it installs every skill into every agent's folder.

In the interactive picker (`add <source>` without flags), tick only Claude
Code and choose Copy.

### Before committing a skill

Skills run with the agent's permissions. Read the skill's `SKILL.md` and
anything in `scripts/`, and watch for `allowed-tools` in its frontmatter,
which lets it run those tools without asking. `.prettierignore` skips
`.claude/skills/`, because reformatting would break the hashes in
`skills-lock.json`.

### Other agents

- Cursor also loads skills from `.claude/skills/`; nothing to do.
- Codex (the CLI, the IDE extension and the ChatGPT desktop app) reads only
  `.agents/skills/`. If it's needed, install with
  `-a claude-code -a codex --copy`, which keeps a second copy there.
- ChatGPT chat on the web and mobile doesn't read the repository; skills
  reach it only through plugins.

### TanStack skills, through TanStack Intent

TanStack ships its own skills inside its npm packages
(`node_modules/<package>/skills/`), versioned with each release, so they're
not copied into `.claude/skills/`. [TanStack Intent](https://tanstack.com/intent/latest/docs/getting-started/quick-start-consumers)
(`@tanstack/intent`, a root dev dependency) finds and loads them; the
`intent-skills` block at the top of `AGENTS.md` tells agents to use it, and
`intent.skills` in `package.json` allows only `@tanstack/*` packages.

```bash
# What's available, at the installed versions
pnpm exec intent list

# Load one skill's guidance before a change
pnpm exec intent load @tanstack/start-client-core#start-core/server-functions

# After adding or removing a TanStack package, rewrite the AGENTS.md block,
# then format it (Intent writes the block unformatted)
pnpm exec intent install && pnpm format

# Skills that reference outdated documentation
pnpm exec intent stale
```

An unofficial collection (`tanstack-skills/tanstack-skills`, which calls
itself "UNOFFICIAL") is not used.

### Installed

Skills for platforms Cartograph doesn't use (native mobile, other web
frameworks) are left out on purpose.

- [shadcn/ui](https://github.com/shadcn-ui/ui/tree/main/skills/shadcn): `shadcn`, the shadcn CLI, registries and component rules for this project's `components.json`. Install: `pnpm dlx skills@latest add shadcn/ui --skill shadcn -a claude-code --copy`.
- [Anthropic skills](https://github.com/anthropics/skills) (Apache-2.0): `frontend-design`. Install: `pnpm dlx skills@latest add anthropics/skills --skill frontend-design -a claude-code --copy`.
- [AI Hero](https://www.aihero.dev/): Matt Pocock's site (courses and tutorials on building with AI); skills from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT): `code-review`, `codebase-design`, `diagnosing-bugs`, `grill-me`, `improve-codebase-architecture`, `pr`, `setup-matt-pocock-skills`, `teach`, `chief-of-staff`, `loop-me`. Install more with `pnpm dlx skills@latest add mattpocock/skills --skill <name> -a claude-code --copy`.
- [Jakub Krehel's interface skills](https://jakub.kr/skills) (author's site: <https://jakub.kr/>): all fourteen from [jakubkrehel/skills](https://github.com/jakubkrehel/skills): `better-*` (accessibility, colors, interface, layout, typography, ui, writing), `break`, `build-design`, `explain-interface`, `interface-review`, `state-machine`, `technical-drawing`, `variant`. Install: `pnpm dlx skills@latest add jakubkrehel/skills --skill '*' -a claude-code --copy`.
- [Emil Kowalski's skills](https://github.com/emilkowalski/skills): motion and UI polish: `animate`, `animation-performance`, `animation-vocabulary`, `apple-design`, `ask-sonner`, `break-ui`, `emil-design-eng`, `find-animation-opportunities`, `improve-animations`, `mobile-native`, `pick-ui-library`, `prototype`, `review-animations`. Not installed: `animate-expo`, `write-swift` (native only).
- [Clerk agent skills](https://github.com/clerk/skills): `clerk`, `clerk-setup`, `clerk-cli`, `clerk-tanstack-patterns`, `clerk-react-patterns`, `clerk-custom-ui`, `clerk-orgs`, `clerk-webhooks`, `clerk-testing`. Not installed: `clerk-backend-api`, which pre-approves unrestricted `Bash` while active (`clerk-cli` covers user and org management); and the Android, Swift, Expo, Next.js, Nuxt, Vue, Astro, React Router, Chrome extension and billing skills.
- [Supabase agent skills](https://github.com/supabase/agent-skills) (MIT): `supabase`, `supabase-postgres-best-practices`. Install: `pnpm dlx skills@latest add supabase/agent-skills --skill '*' -a claude-code --copy`.
- [JS Mastery Engineering Workflow](https://jsmastery.com/skills): catalog and docs for nine workflow skills (scope, audit, architect, develop, check, test, document, sync, debug). Not installed. Install: `pnpm dlx skills@latest add jsmastery-pro/skills -a claude-code --copy`.
