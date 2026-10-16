/** One fact: what it is, an optional mark before it, and its value. */
export type Fact = {
  term: string
  value: React.ReactNode
  media?: React.ReactNode
}

/**
 * The detail pane's facts as a description list (spec 004): the summary's
 * counts, a file's role and counts, a box's roles. Terms muted on the left,
 * values on the right, in tabular figures so counts line up.
 */
export function FactList({ facts }: { facts: ReadonlyArray<Fact> }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
      {facts.map(({ term, value, media }) => (
        <div key={term} className="contents">
          <dt className="flex min-w-0 items-center gap-2 text-muted-foreground">
            {media}
            <span className="truncate">{term}</span>
          </dt>
          <dd className="text-end tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
