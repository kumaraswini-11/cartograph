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

Skill collections for coding agents. None is installed in this repository; the
commands below install one when it's needed.

- [JS Mastery Engineering Workflow](https://jsmastery.com/skills): catalog and docs for nine workflow skills (scope, audit, architect, develop, check, test, document, sync, debug). Install: `npx skills@latest add jsmastery-pro/skills -a claude-code`.
- [Jakub Krehel's interface skills](https://jakub.kr/skills) (author's site: <https://jakub.kr/>): catalog for thirteen interface skills: `better-*`, `break`, `build-design`, `explain-interface`, `interface-review`, `state-machine` and `variant`. Source: [jakubkrehel/skills](https://github.com/jakubkrehel/skills).
- [Clerk agent skills](https://github.com/clerk/skills): eight `clerk*` skills for Clerk authentication and organizations.
- [AI Hero](https://www.aihero.dev/): Matt Pocock's site (courses and tutorials on building with AI). Source of 27 engineering and productivity skills (`tdd`, `to-spec`, `code-review`, `research`, `grilling`, …): [mattpocock/skills](https://github.com/mattpocock/skills) (MIT). Install: `npx skills@latest add mattpocock/skills -a claude-code --copy`.
- [Anthropic skills](https://github.com/anthropics/skills): Anthropic's example and reference skills, including `frontend-design` (Apache-2.0). Install: `npx skills@latest add https://github.com/anthropics/skills --skill frontend-design -a claude-code --copy`.
- [Supabase agent skills](https://github.com/supabase/agent-skills): the `supabase` and `supabase-postgres-best-practices` skills (MIT). Install: `npx skills@latest add supabase/agent-skills -a claude-code --copy`.
