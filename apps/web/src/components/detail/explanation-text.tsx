import { resolvePath } from "@workspace/ai/grounding"
import type { PathIndex } from "@workspace/ai/grounding"
import { parseExplanation } from "@workspace/ai/text"
import type { Run } from "@workspace/ai/text"

import { useFileButton } from "@/components/detail/use-file-button"
import { useMapData } from "@/components/map/map-data"

/**
 * A model's text in its three formats (spec 009, FR-007): paragraphs and
 * bullets of plain words, bold and code, every path in it a way to that
 * file on the map (FR-008). An explanation and a chat answer (spec 010,
 * FR-008, FR-009) read alike.
 */
export function ExplanationText({ text }: { text: string }) {
  const { paths } = useMapData()
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed">
      {parseExplanation(text).map((block, b) =>
        block.kind === "paragraph" ? (
          <p key={b}>
            <Runs runs={block.runs} index={paths} />
          </p>
        ) : (
          <ul key={b} className="flex list-disc flex-col gap-1 ps-5">
            {block.items.map((runs, i) => (
              <li key={i}>
                <Runs runs={runs} index={paths} />
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

function Runs({ runs, index }: { runs: ReadonlyArray<Run>; index: PathIndex }) {
  return runs.map((run, i) => {
    if (run.kind === "bold") return <strong key={i}>{run.text}</strong>
    if (run.kind === "text") return <span key={i}>{run.text}</span>
    const path = resolvePath(run.text, index)
    return path === null ? (
      <code key={i} className="font-mono text-path break-all">
        {run.text}
      </code>
    ) : (
      <PathLink key={i} path={path} label={run.text} />
    )
  })
}

/**
 * A path the text names, as a way to that file: choosing it moves the
 * map's selection there (FR-008), as the pane's file lists do.
 */
function PathLink({ path, label }: { path: string; label: string }) {
  const button = useFileButton(path)
  return (
    <button
      type="button"
      {...button}
      className="font-mono text-path break-all underline underline-offset-4 hover:text-foreground data-[marked=true]:bg-accent"
    >
      {label}
    </button>
  )
}
