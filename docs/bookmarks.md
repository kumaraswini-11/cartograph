# Bookmarks

<!--
  Curated external references worth coming back to while building Cartograph:
  official docs, articles, talks, repos and tools, grouped by topic.
  One line per link: the link, then why it matters.
  Toolchain sources and upgrade decisions live in stack-decisions.md, not here.
-->

## Interface and design

- [Design System Checklist](https://www.designsystemchecklist.com/): open checklist of what a design system should cover (design language, foundations like colour and type, components, tooling, process). Useful when settling Cartograph's tokens and palette; the four starting decisions in `docs/project-doc.md` still come first.

## Agent skills

- [JS Mastery Engineering Workflow](https://jsmastery.com/skills): catalog and docs for the nine workflow skills vendored in `.claude/skills/` (scope, audit, architect, develop, check, test, document, sync, debug). Install/update: `npx skills@latest add jsmastery-pro/skills -a claude-code`.
- [Jakub Krehel's interface skills](https://jakub.kr/skills) (author's site: <https://jakub.kr/>): catalog for the thirteen `better-*`, `break`, `build-design`, `explain-interface`, `interface-review`, `state-machine` and `variant` skills in `.claude/skills/`. Source: [jakubkrehel/skills](https://github.com/jakubkrehel/skills).
- [Clerk agent skills](https://github.com/clerk/skills): source of the eight `clerk*` skills in `.claude/skills/`.
- [AI Hero](https://www.aihero.dev/): Matt Pocock's site (courses and tutorials on building with AI). Source of the 27 engineering and productivity skills (`tdd`, `to-spec`, `code-review`, `research`, `grilling`, …) vendored in `.claude/skills/`: [mattpocock/skills](https://github.com/mattpocock/skills) (MIT). Install/update: `npx skills@latest add mattpocock/skills -a claude-code --copy`.
- [Anthropic skills](https://github.com/anthropics/skills): Anthropic's example and reference skills. Source of the `frontend-design` skill vendored in `.claude/skills/` (Apache-2.0). Install/update: `npx skills@latest add https://github.com/anthropics/skills --skill frontend-design -a claude-code --copy`.
