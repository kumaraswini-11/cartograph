import { createContext, use, useMemo, useState } from "react"
import type { Selection } from "@workspace/graph"

/**
 * The map's state, shared by the rail, the map and the pane (spec 003). It
 * lives in the browser only: selecting, opening and filtering make no
 * request (FR-014).
 */
type MapState = {
  /** The role chosen on the rail, or null for none (FR-016). */
  role: string | null
  selection: Selection | null
  /** Ids of the open boxes (FR-007). */
  open: ReadonlySet<string>
}

/** What changes the map's state. The same functions for the page's life. */
type MapActions = {
  chooseRole: (role: string | null) => void
  select: (selection: Selection | null) => void
  toggleOpen: (box: string) => void
}

// Two contexts: a component that only acts (a row that selects its file)
// reads the actions, which never change, so it doesn't re-render whenever
// the selection, the open boxes or the role do.
const MapStateContext = createContext<MapState | undefined>(undefined)
const MapActionsContext = createContext<MapActions | undefined>(undefined)

export function MapStateProvider({ children }: { children: React.ReactNode }) {
  const [role, chooseRole] = useState<string | null>(null)
  const [selection, select] = useState<Selection | null>(null)
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())

  const state = useMemo<MapState>(
    () => ({ role, selection, open }),
    [role, selection, open]
  )
  const actions = useMemo<MapActions>(
    () => ({
      chooseRole,
      select,
      toggleOpen: (box) =>
        setOpen((current) => {
          const next = new Set(current)
          if (next.has(box)) next.delete(box)
          else next.add(box)
          return next
        }),
    }),
    []
  )
  return (
    <MapActionsContext value={actions}>
      <MapStateContext value={state}>{children}</MapStateContext>
    </MapActionsContext>
  )
}

/** The map's state and its actions; re-renders when the state changes. */
export function useMapState(): { state: MapState; actions: MapActions } {
  const state = use(MapStateContext)
  if (!state)
    throw new Error("useMapState must be used within a MapStateProvider")
  return { state, actions: useMapActions() }
}

/** The map's actions alone; never re-renders for a change of state. */
export function useMapActions(): MapActions {
  const actions = use(MapActionsContext)
  if (!actions)
    throw new Error("useMapActions must be used within a MapStateProvider")
  return actions
}
