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

Skill collections for coding agents. Installed skills are committed as plain
files in `.claude/skills/`, with their source and content hash in
`skills-lock.json`. Always install with `-a claude-code --copy`: Claude Code
only loads project skills from `.claude/skills/`, and `--copy` avoids the
symlinks git can't carry on Windows. Never use `--all`, which installs to
every agent's folder. Update everything with `npx skills@latest update`.

Each collection lists what is installed; skills for platforms Cartograph
doesn't use (native mobile, other web frameworks) are left out on purpose.

- [shadcn/ui](https://github.com/shadcn-ui/ui/tree/main/skills/shadcn): `shadcn`, the shadcn CLI, registries and component rules for this project's `components.json`. Install: `npx skills@latest add shadcn/ui --skill shadcn -a claude-code --copy`.
- [Anthropic skills](https://github.com/anthropics/skills) (Apache-2.0): `frontend-design`. Install: `npx skills@latest add anthropics/skills --skill frontend-design -a claude-code --copy`.
- [AI Hero](https://www.aihero.dev/): Matt Pocock's site (courses and tutorials on building with AI); skills from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT): `code-review`, `codebase-design`, `diagnosing-bugs`, `grill-me`, `improve-codebase-architecture`, `pr`, `setup-matt-pocock-skills`, `teach`, `chief-of-staff`, `loop-me`. Install more with `npx skills@latest add mattpocock/skills --skill <name> -a claude-code --copy`.
- [Jakub Krehel's interface skills](https://jakub.kr/skills) (author's site: <https://jakub.kr/>): all fourteen from [jakubkrehel/skills](https://github.com/jakubkrehel/skills): `better-*` (accessibility, colors, interface, layout, typography, ui, writing), `break`, `build-design`, `explain-interface`, `interface-review`, `state-machine`, `technical-drawing`, `variant`. Install: `npx skills@latest add jakubkrehel/skills --skill '*' -a claude-code --copy`.
- [Emil Kowalski's skills](https://github.com/emilkowalski/skills): motion and UI polish: `animate`, `animation-performance`, `animation-vocabulary`, `apple-design`, `ask-sonner`, `break-ui`, `emil-design-eng`, `find-animation-opportunities`, `improve-animations`, `mobile-native`, `pick-ui-library`, `prototype`, `review-animations`. Not installed: `animate-expo`, `write-swift` (native only).
- [Clerk agent skills](https://github.com/clerk/skills): `clerk`, `clerk-setup`, `clerk-cli`, `clerk-tanstack-patterns`, `clerk-react-patterns`, `clerk-custom-ui`, `clerk-orgs`, `clerk-webhooks`, `clerk-testing`. Not installed: `clerk-backend-api`, which pre-approves unrestricted `Bash` while active (`clerk-cli` covers user and org management); and the Android, Swift, Expo, Next.js, Nuxt, Vue, Astro, React Router, Chrome extension and billing skills.
- [Supabase agent skills](https://github.com/supabase/agent-skills) (MIT): `supabase`, `supabase-postgres-best-practices`. Install: `npx skills@latest add supabase/agent-skills --skill '*' -a claude-code --copy`.
- [JS Mastery Engineering Workflow](https://jsmastery.com/skills): catalog and docs for nine workflow skills (scope, audit, architect, develop, check, test, document, sync, debug). Not installed. Install: `npx skills@latest add jsmastery-pro/skills -a claude-code --copy`.
