import { createContext, use, useMemo, useState } from "react"
import type { ReactNode } from "react"

import type { ExplainResult } from "@/lib/explanations"

type Explanations = {
  analysisId: string
  /** What was explained this session, by path (spec 009, FR-004). */
  results: ReadonlyMap<string, ExplainResult>
  remember: (path: string, result: ExplainResult) => void
}

const ExplanationsContext = createContext<Explanations | null>(null)

/**
 * The explanations asked for while this map is open (spec 009, FR-004,
 * plan D-11): when the selection comes back to a file, its explanation
 * shows again without another request. Only explanations are kept; a
 * limit or a failure can be tried again.
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
      remember: (path, result) =>
        setResults((previous) => new Map(previous).set(path, result)),
    }),
    [analysisId, results]
  )
  return <ExplanationsContext value={value}>{children}</ExplanationsContext>
}

/** The session's explanations, or null on a map with no analysis behind it. */
export function useExplanations(): Explanations | null {
  return use(ExplanationsContext)
}
