import { createContext, use, useMemo, useState } from "react"
import type { Selection } from "@workspace/graph"

/**
 * The map's state, shared by the rail, the map and the pane (spec 003). It
 * lives in the browser only: selecting, opening and filtering make no
 * request (FR-014).
 */
type MapState = {
  state: {
    /** The role chosen on the rail, or null for none (FR-016). */
    role: string | null
    selection: Selection | null
    /** Ids of the open boxes (FR-007). */
    open: ReadonlySet<string>
  }
  actions: {
    chooseRole: (role: string | null) => void
    select: (selection: Selection | null) => void
    toggleOpen: (box: string) => void
  }
}

const MapStateContext = createContext<MapState | undefined>(undefined)

export function MapStateProvider({ children }: { children: React.ReactNode }) {
  const [role, chooseRole] = useState<string | null>(null)
  const [selection, select] = useState<Selection | null>(null)
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())

  const value = useMemo<MapState>(
    () => ({
      state: { role, selection, open },
      actions: {
        chooseRole,
        select,
        toggleOpen: (box) =>
          setOpen((current) => {
            const next = new Set(current)
            if (next.has(box)) next.delete(box)
            else next.add(box)
            return next
          }),
      },
    }),
    [role, selection, open]
  )
  return <MapStateContext value={value}>{children}</MapStateContext>
}

export function useMapState(): MapState {
  const value = use(MapStateContext)
  if (!value)
    throw new Error("useMapState must be used within a MapStateProvider")
  return value
}
