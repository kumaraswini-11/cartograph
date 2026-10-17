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
  /** The subjects asked for, whose answer hasn't come back yet. */
  asking: ReadonlySet<string>
  begin: (subject: ExplainSubject) => void
  /** Keeps a subject's answer, and ends its asking. */
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

/** What the session remembers, about one analysis's stored result. */
type Memory = {
  /** The analysis and the stored result's commit it's about. */
  scope: string
  results: ReadonlyMap<string, ExplainResult>
  asking: ReadonlySet<string>
  staleness: ReadonlyMap<string, Staleness>
}

const fresh = (scope: string): Memory => ({
  scope,
  results: new Map(),
  asking: new Set(),
  staleness: new Map(),
})

const ExplanationsContext = createContext<Explanations | null>(null)

/**
 * The explanations asked for while this map is open (spec 009, FR-004,
 * plan D-11): when the selection comes back to a file or a box, its
 * explanation shows again without another request. Another analysis, or a
 * re-run that stores a new commit, starts afresh: what was remembered was
 * about the old one, and an answer still on its way to it is dropped. The
 * map isn't remounted for it.
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
  const scope = `${analysisId}@${commit}`
  const [memory, setMemory] = useState<Memory>(() => fresh(scope))
  // A new scope resets the memory as it renders (React: "Adjusting some
  // state when a prop changes"), so no effect runs a frame late.
  if (memory.scope !== scope) setMemory(fresh(scope))
  const value = useMemo<Explanations>(() => {
    // An answer for an older scope, arriving late, is dropped.
    const write = (change: (memory: Memory) => Memory) =>
      setMemory((previous) =>
        previous.scope === scope ? change(previous) : previous
      )
    return {
      analysisId,
      results: memory.results,
      asking: memory.asking,
      staleness: memory.staleness,
      rerun,
      begin: (subject) =>
        write((m) => ({
          ...m,
          asking: new Set(m.asking).add(subjectKey(subject)),
        })),
      remember: (subject, result) =>
        write((m) => {
          const asking = new Set(m.asking)
          asking.delete(subjectKey(subject))
          return {
            ...m,
            asking,
            results: new Map(m.results).set(subjectKey(subject), result),
          }
        }),
      rememberStaleness: (subject, staleness) =>
        write((m) => ({
          ...m,
          staleness: new Map(m.staleness).set(subjectKey(subject), staleness),
        })),
    }
  }, [analysisId, memory, rerun, scope])
  return <ExplanationsContext value={value}>{children}</ExplanationsContext>
}

/** The session's explanations, or null on a map with no analysis behind it. */
export function useExplanations(): Explanations | null {
  return use(ExplanationsContext)
}
