import { createContext, use, useMemo, useState } from "react"
import type { ReactNode } from "react"

import type { ExplainResult, ExplainSubject } from "@/lib/explanations"

type Explanations = {
  analysisId: string
  /** What was explained this session, by subject (spec 009, FR-004). */
  results: ReadonlyMap<string, ExplainResult>
  remember: (subject: ExplainSubject, result: ExplainResult) => void
}

/** A subject's key in the results: a file and a box can share a path. */
export const subjectKey = (subject: ExplainSubject) =>
  `${subject.kind}:${subject.path}`

const ExplanationsContext = createContext<Explanations | null>(null)

/**
 * The explanations asked for while this map is open (spec 009, FR-004,
 * plan D-11): when the selection comes back to a file or a box, its
 * explanation shows again without another request. Only explanations are
 * kept; a limit or a failure can be tried again.
 */
export function ExplanationsProvider({
  analysisId,
  children,
}: {
  analysisId: string
  children: ReactNode
}) {
  const [results, setResults] = useState<ReadonlyMap<string, ExplainResult>>(
    () => new Map()
  )
  const value = useMemo<Explanations>(
    () => ({
      analysisId,
      results,
      remember: (subject, result) =>
        setResults((previous) =>
          new Map(previous).set(subjectKey(subject), result)
        ),
    }),
    [analysisId, results]
  )
  return <ExplanationsContext value={value}>{children}</ExplanationsContext>
}

/** The session's explanations, or null on a map with no analysis behind it. */
export function useExplanations(): Explanations | null {
  return use(ExplanationsContext)
}
