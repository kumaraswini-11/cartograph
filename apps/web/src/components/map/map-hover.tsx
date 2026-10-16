import {
  createContext,
  use,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"

/**
 * The file the pointer or the keyboard is on, in the pane or on the map
 * (spec 004, FR-013, plan D-08). A store of its own, not part of the map's
 * state: each row asks only whether it's the one, so moving across a list
 * re-renders the two rows it leaves and enters, not the map or the pane.
 */
export type HoverStore = {
  get: () => string | null
  set: (path: string | null) => void
  subscribe: (listener: () => void) => () => void
}

export function createHoverStore(): HoverStore {
  let hovered: string | null = null
  const listeners = new Set<() => void>()
  return {
    get: () => hovered,
    set: (path) => {
      if (path === hovered) return
      hovered = path
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const HoverContext = createContext<HoverStore | undefined>(undefined)

export function HoverProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(createHoverStore)
  return <HoverContext value={store}>{children}</HoverContext>
}

function useHoverStore(): HoverStore {
  const store = use(HoverContext)
  if (!store)
    throw new Error("useHoverStore must be used within a HoverProvider")
  return store
}

/** Whether `test` holds for the hovered file; re-renders when that changes. */
export function useHovered(test: (path: string) => boolean): boolean {
  const store = useHoverStore()
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const path = store.get()
      return path !== null && test(path)
    },
    () => false
  )
}

/**
 * Handlers that make `path` the hovered file while the pointer or the focus
 * is on it, so the keyboard marks as the pointer does.
 */
export function useHoverHandlers(path: string) {
  const store = useHoverStore()
  return useMemo(
    () => ({
      onPointerEnter: () => store.set(path),
      onPointerLeave: () => store.set(null),
      onFocus: () => store.set(path),
      onBlur: () => store.set(null),
    }),
    [store, path]
  )
}

/** How a marked file or box looks: an outline, which takes no space. */
export const MARKED =
  "data-[marked=true]:outline-2 data-[marked=true]:-outline-offset-2 data-[marked=true]:outline-ring"
