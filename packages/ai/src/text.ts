// An explanation's text, read into the three formats it may use (spec 009,
// FR-007, C-03, plan D-08): inline code, bullets and bold. The model is
// asked for those; whatever else comes back is kept as words with its marks
// dropped, so no stray backtick, asterisk or hash reaches the page. Pure,
// with no Node.js import: exported at `@workspace/ai/text` for the browser.

/** A stretch of one line: plain words, bold words, or code. */
export type Run =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "code"; text: string }

/** A paragraph, or a list of bullets, each a line of runs. */
export type Block =
  | { kind: "paragraph"; runs: Array<Run> }
  | { kind: "bullets"; items: Array<Array<Run>> }

const BULLET = /^\s*[-*•]\s+/

/** The marks formatting other than the three uses, dropped from plain text. */
function plain(text: string): string {
  return (
    text
      // [label](url) → label: links aren't one of the three.
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // HTML tags, never rendered as HTML.
      .replace(/<\/?[a-z][^>]*>/gi, "")
      // Emphasis and stray marks that aren't bold or code.
      .replace(/[*`#]+/g, "")
      // Underscores and tildes only at a word's edge, where they mark
      // emphasis: inside a name they're part of it (`MAX_FILE_BYTES`,
      // `lib/my_util.js`, `pages/_app.tsx`), which grounding must read
      // whole. A full stop after one ends a sentence unless a name goes on.
      .replace(/(?<![\w/.-])[_~]+|[_~]+(?![\w/-]|\.\w)/g, "")
  )
}

/** One line's runs: `code` and **bold**, the rest plain. */
export function runsOf(line: string): Array<Run> {
  const runs: Array<Run> = []
  // Code first, so `**` inside code stays code; bold next.
  const pattern = /`([^`\n]+)`|\*\*([^*\n]+)\*\*/g
  let last = 0
  for (const match of line.matchAll(pattern)) {
    const before = plain(line.slice(last, match.index))
    if (before !== "") runs.push({ kind: "text", text: before })
    if (match[1] !== undefined) runs.push({ kind: "code", text: match[1] })
    else if (match[2] !== undefined) {
      const bold = plain(match[2])
      if (bold !== "") runs.push({ kind: "bold", text: bold })
    }
    last = match.index + match[0].length
  }
  const rest = plain(line.slice(last))
  if (rest !== "") runs.push({ kind: "text", text: rest })
  return runs
}

/**
 * The explanation as blocks: lines together make a paragraph, a blank line
 * ends one, and lines starting with `- `, `* ` or `•` make a list. A line
 * that was only a heading's marks or the like comes out empty and is left
 * out.
 */
export function parseExplanation(text: string): Array<Block> {
  const blocks: Array<Block> = []
  let paragraph: Array<string> = []
  let bullets: Array<Array<Run>> = []

  const endParagraph = () => {
    const runs = runsOf(paragraph.join(" ").replace(/\s+/g, " ").trim())
    if (runs.length > 0) blocks.push({ kind: "paragraph", runs })
    paragraph = []
  }
  const endBullets = () => {
    if (bullets.length > 0) blocks.push({ kind: "bullets", items: bullets })
    bullets = []
  }

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim()
    if (line === "") {
      endParagraph()
      endBullets()
    } else if (BULLET.test(line)) {
      endParagraph()
      const runs = runsOf(line.replace(BULLET, ""))
      if (runs.length > 0) bullets.push(runs)
    } else {
      endBullets()
      paragraph.push(line)
    }
  }
  endParagraph()
  endBullets()
  return blocks
}

/** The words a reader sees, for tests and for searching rendered text. */
export function textOf(blocks: ReadonlyArray<Block>): string {
  const line = (runs: ReadonlyArray<Run>) => runs.map((r) => r.text).join("")
  return blocks
    .map((block) =>
      block.kind === "paragraph"
        ? line(block.runs)
        : block.items.map(line).join("\n")
    )
    .join("\n\n")
}
