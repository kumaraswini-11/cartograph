// A file's source as a model is handed it (spec 009, C-05; spec 010, C-03):
// shortened to its first lines, and fenced off as data. One source, so an
// explanation and a chat lookup show the model the same thing. Pure, so
// browser-safe at `@workspace/ai/source`.

/** The most lines of a file sent to the model (spec 009). */
export const EXPLAIN_MAX_LINES = 500

/** A source cut to its first `EXPLAIN_MAX_LINES` lines, and whether it was. */
export function shortenSource(source: string): {
  text: string
  lines: number
  shortened: boolean
} {
  const lines = source.split("\n")
  const shortened = lines.length > EXPLAIN_MAX_LINES
  return {
    text: (shortened ? lines.slice(0, EXPLAIN_MAX_LINES) : lines).join("\n"),
    lines: lines.length,
    shortened,
  }
}

/** The source between markers, so it reads as data, never as instructions. */
export const fenced = (text: string) => `<<<SOURCE\n${text}\nSOURCE>>>`
