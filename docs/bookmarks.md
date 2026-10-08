# Bookmarks

<!--
  Curated external references worth coming back to while building Cartograph:
  official docs, articles, talks, repos and tools, grouped by topic.
  One line per link: the link, then why it matters.
  Toolchain sources and upgrade decisions live in stack-decisions.md, not here.
-->

## Interface and design

- [Design System Checklist](https://www.designsystemchecklist.com/): open checklist of what a design system should cover (design language, foundations like colour and type, components, tooling, process). Useful when settling Cartograph's tokens and palette; the four starting decisions in `docs/project-doc.md` still come first.
- [Design Token Naming Convention Tool](https://www.namedesigntokens.guide/): interactive guide for choosing a consistent token-naming scheme (category, property, variant, state). Pair with the `better-colors` skill's `token-naming.md` when the token set is defined.

## Products and services

- [kapa.ai](https://www.kapa.ai/): indexes a company's docs, tickets and wikis and serves AI answers (site, support, Slack) through an API or MCP server. Reference for grounded, source-backed answering, the behaviour Cartograph's chat panel must have.
- [Descope](https://www.descope.com/): customer and agent identity platform built on visual workflows, SDKs and APIs. Alternative to Clerk, which is the current choice in `CLAUDE.md`.
- [lemlist](https://www.lemlist.com/): AI outbound sales tool for prospect finding and multichannel outreach (email, LinkedIn, phone). Go-to-market, not part of the codebase.

## Agent skills

- [JS Mastery Engineering Workflow](https://jsmastery.com/skills): catalog and docs for the nine workflow skills vendored in `.claude/skills/` (scope, audit, architect, develop, check, test, document, sync, debug). Install/update: `npx skills@latest add jsmastery-pro/skills -a claude-code`.
- [Jakub Krehel's interface skills](https://jakub.kr/skills) (author's site: <https://jakub.kr/>): catalog for the thirteen `better-*`, `break`, `build-design`, `explain-interface`, `interface-review`, `state-machine` and `variant` skills in `.claude/skills/`. Source: [jakubkrehel/skills](https://github.com/jakubkrehel/skills).
- [Clerk agent skills](https://github.com/clerk/skills): source of the eight `clerk*` skills in `.claude/skills/`.
- [AI Hero](https://www.aihero.dev/): Matt Pocock's site (courses and tutorials on building with AI). Source of the 27 engineering and productivity skills (`tdd`, `to-spec`, `code-review`, `research`, `grilling`, …) vendored in `.claude/skills/`: [mattpocock/skills](https://github.com/mattpocock/skills) (MIT). Install/update: `npx skills@latest add mattpocock/skills -a claude-code --copy`.
- [Anthropic skills](https://github.com/anthropics/skills): Anthropic's example and reference skills. Source of the `frontend-design` skill vendored in `.claude/skills/` (Apache-2.0). Install/update: `npx skills@latest add https://github.com/anthropics/skills --skill frontend-design -a claude-code --copy`.
