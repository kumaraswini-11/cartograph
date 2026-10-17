import { createContext, use, useMemo, useState } from "react"
import type { ReactNode } from "react"

import type {
  ExplainResult,
  ExplainSubject,
  Staleness,
} from "@/lib/explanations"

type Explanations = {
  analysisId: string
  /** What was explained this session, by subject (spec 009, FR-004). */
  results: ReadonlyMap<string, ExplainResult>
  remember: (subject: ExplainSubject, result: ExplainResult) => void
  /** Whether each explanation still matches the repository (FR-014). */
  staleness: ReadonlyMap<string, Staleness>
  rememberStaleness: (subject: ExplainSubject, staleness: Staleness) => void
  /** The page's own Re-run, offered when an explanation is stale (FR-015). */
  rerun: ReactNode
}

/** A subject's key in the results: a file and a box can share a path. */
export const subjectKey = (subject: ExplainSubject) =>
  `${subject.kind}:${subject.path}`

/** What the session remembers, about one stored result. */
type Memory = {
  commit: string
  results: ReadonlyMap<string, ExplainResult>
  staleness: ReadonlyMap<string, Staleness>
}

const fresh = (commit: string): Memory => ({
  commit,
  results: new Map(),
  staleness: new Map(),
})

const ExplanationsContext = createContext<Explanations | null>(null)

/**
 * The explanations asked for while this map is open (spec 009, FR-004,
 * plan D-11): when the selection comes back to a file or a box, its
 * explanation shows again without another request. A re-run that stores a
 * new commit starts afresh: what was remembered was about the old one.
 */
export function ExplanationsProvider({
  analysisId,
  commit,
  rerun,
  children,
}: {
  analysisId: string
  /** The stored result's commit. */
  commit: string
  rerun: ReactNode
  children: ReactNode
}) {
  const [memory, setMemory] = useState<Memory>(() => fresh(commit))
  const value = useMemo<Explanations>(() => {
    const current = memory.commit === commit ? memory : fresh(commit)
    // Each write starts from this commit's memory, never an older one's.
    const write = (change: (memory: Memory) => Memory) =>
      setMemory((previous) =>
        change(previous.commit === commit ? previous : fresh(commit))
      )
    return {
      analysisId,
      results: current.results,
      staleness: current.staleness,
      rerun,
      remember: (subject, result) =>
        write((m) => ({
          ...m,
          results: new Map(m.results).set(subjectKey(subject), result),
        })),
      rememberStaleness: (subject, staleness) =>
        write((m) => ({
          ...m,
          staleness: new Map(m.staleness).set(subjectKey(subject), staleness),
        })),
    }
  }, [analysisId, commit, memory, rerun])
  return <ExplanationsContext value={value}>{children}</ExplanationsContext>
}

/** The session's explanations, or null on a map with no analysis behind it. */
export function useExplanations(): Explanations | null {
  return use(ExplanationsContext)
}
