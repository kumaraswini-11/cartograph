// The map itself (spec 003): React Flow drawing what @workspace/graph lays
// out. Browser-only, loaded inside <ClientOnly> (plan D-03).
import "@xyflow/react/dist/base.css"

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import {
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react"
import type { Edge } from "@xyflow/react"
import { MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react"
import {
  BOX_MIN_HEIGHT,
  PANEL_ROW_LIMIT,
  edgeEndKey,
  fullStrength,
  isBoxStrong,
  isRowStrong,
  panelCounts,
  roleCounts,
} from "@workspace/graph"
import type { BoxMap, Layout, MapEdge, Selection } from "@workspace/graph"
import { fileName } from "@workspace/parser/paths"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import { ButtonGroup } from "@workspace/ui/components/shadcn-ui/button-group"

import { useMapData } from "@/components/map/map-data"
import { useMapState } from "@/components/map/map-state"
import { BoxView, PanelView } from "@/components/map/map-boxes"
import type { BoxElement, PanelElement } from "@/components/map/map-boxes"
import { MapPlaceholder } from "@/components/map/map-view"
import type { LayoutReply, LayoutRequest } from "@/components/map/layout.worker"

const ELEMENT_TYPES = { box: BoxView, panel: PanelView }
const ANIMATION_MS = 200
/** Room around what a fit shows, as a share of the view. */
const FIT_PADDING = 0.1

/**
 * The least zoom the first view fits to: a box's button, at least
 * `BOX_MIN_HEIGHT` tall, stays 24 px, WCAG 2.2's least target (2.5.8, spec
 * 012, FR-010). A map too large for the view at that zoom opens at its
 * centre, to be panned or zoomed out; a refit for a panel (FR-011) still
 * zooms out as far as the panel needs.
 */
const FIRST_FIT_MIN_ZOOM = 24 / BOX_MIN_HEIGHT

/**
 * React Flow turns pointer events off for a node that's neither draggable
 * nor selectable, so a mouse click would reach the pane behind it; a node's
 * own style comes last and wins. Its buttons handle every click (FR-007,
 * FR-010; spec 003 plan, stack notes).
 */
const NODE_STYLE: React.CSSProperties = { pointerEvents: "all" }

/**
 * An edge's opacity: full with nothing selected, where a grey edge keeps 3:1
 * against the page (WCAG 1.4.11: 4.7:1 light, 7.6:1 dark); low when a
 * selection leaves it out. Those are background then: the selection's own
 * edges carry the information, in their own colours at full strength, and
 * clearing the selection brings every edge back (spec 003 plan D-13).
 */
const EDGE_OPACITY = { plain: 1, dimmed: 0.15 }

/** A selection as one comparable value. */
const selectionKey = (selection: Selection | null) =>
  selection === null
    ? null
    : edgeEndKey({ box: selection.box, row: selection.file })

/** Whether the system asks for reduced motion (FR-020). */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)")
      query.addEventListener("change", onChange)
      return () => query.removeEventListener("change", onChange)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true
  )
}

/** A layout, and the open panels it was laid out with. */
type LaidOut = { layout: Layout; open: ReadonlySet<string> }

/**
 * The map's layout, made in a worker (spec 012, FR-009, plan D-08): dagre
 * was most of the map page's blocking time. Null until the first arrives;
 * after that, the last one stays drawn while the next is made, and a
 * layout overtaken by a newer request is dropped. It's drawn in a
 * transition, so React renders the map in slices rather than one long task.
 */
function useLayout(
  boxMap: BoxMap,
  edges: ReadonlyArray<MapEdge>,
  open: ReadonlySet<string>,
  pinned: string | undefined
): LaidOut | null {
  const [laidOut, setLaidOut] = useState<LaidOut | null>(null)
  const worker = useRef<Worker | null>(null)
  const asked = useRef({ id: 0, open })

  useEffect(() => {
    const made = new Worker(new URL("./layout.worker.ts", import.meta.url), {
      type: "module",
    })
    made.addEventListener("message", (event: MessageEvent<LayoutReply>) => {
      const { id, layout } = event.data
      if (id !== asked.current.id) return
      const laidOutWith = asked.current.open
      startTransition(() => setLaidOut({ layout, open: laidOutWith }))
    })
    made.postMessage({ kind: "map", boxMap, edges } satisfies LayoutRequest)
    worker.current = made
    return () => {
      made.terminate()
      worker.current = null
    }
  }, [boxMap, edges])

  useEffect(() => {
    asked.current = { id: asked.current.id + 1, open }
    worker.current?.postMessage({
      kind: "layout",
      id: asked.current.id,
      open,
      pinned,
    } satisfies LayoutRequest)
  }, [boxMap, edges, open, pinned])

  return laidOut
}

function Drawing() {
  const { input, boxMap } = useMapData()
  const { state } = useMapState()
  const { selection, open } = state

  // A selected file past its panel's row limit is listed anyway (spec 004,
  // FR-012); any other selection leaves the layout as it is.
  const pinned = useMemo(() => {
    const file = selection?.file
    if (selection === null || file === undefined) return undefined
    const files = boxMap.byId.get(selection.box)?.files ?? []
    return files.indexOf(file) >= PANEL_ROW_LIMIT ? file : undefined
  }, [boxMap, selection])
  const laidOut = useLayout(boxMap, input.edges, open, pinned)
  if (laidOut === null) return <MapPlaceholder />
  return <Picture layout={laidOut.layout} open={laidOut.open} />
}

/**
 * A layout drawn. `open` is the panels it was laid out with, which may lag
 * the state's while the next layout is made: what's drawn is what's read.
 */
function Picture({
  layout,
  open,
}: {
  layout: Layout
  open: ReadonlySet<string>
}) {
  const { input, boxMap, tierOf } = useMapData()
  const { state, actions } = useMapState()
  const { selection, role } = state
  const flow = useReactFlow()
  const wrapper = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const duration = reducedMotion ? 0 : ANIMATION_MS

  const strength = useMemo(
    () => (selection ? fullStrength(layout, selection) : null),
    [layout, selection]
  )
  const matches = useMemo(
    () => (role === null ? null : roleCounts(boxMap, input.files, role)),
    [boxMap, input.files, role]
  )
  const fileRole = useMemo(
    () => new Map(input.files.map((f) => [f.path, f.role])),
    [input.files]
  )
  const placedById = useMemo(
    () => new Map(layout.boxes.map((placed) => [placed.id, placed])),
    [layout.boxes]
  )

  /** Whether a box or panel is fully on screen. */
  const inView = useCallback(
    (id: string) => {
      const placed = placedById.get(id)
      const bounds = wrapper.current?.getBoundingClientRect()
      if (!placed || !bounds) return true
      const { x, y, zoom } = flow.getViewport()
      const left = placed.x * zoom + x
      const top = placed.y * zoom + y
      return (
        left >= 0 &&
        top >= 0 &&
        left + placed.width * zoom <= bounds.width &&
        top + placed.height * zoom <= bounds.height
      )
    },
    [flow, placedById]
  )

  // A box and its panel are different elements: whichever replaces the one
  // that had the focus takes it, so the keyboard keeps its place (FR-023).
  const [focusTarget, setFocusTarget] = useState<string | null>(null)

  // A panel just opened, or the box of a file chosen in the pane (spec 004,
  // FR-011), is brought into view, only ever zooming out (FR-011, C-03):
  // read after the new layout is drawn, never before.
  const shown = useRef({ open, selected: selectionKey(selection) })
  useEffect(() => {
    const added = [...open].find((id) => !shown.current.open.has(id))
    const selected = selectionKey(selection)
    const moved =
      selected !== shown.current.selected ? selection?.box : undefined
    shown.current = { open, selected }
    const id = added ?? moved
    if (id === undefined) return
    const frame = requestAnimationFrame(() => {
      if (inView(id)) return
      void flow.fitView({
        nodes: [{ id }],
        maxZoom: flow.getZoom(),
        padding: FIT_PADDING,
        duration,
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, selection, flow, inView, duration])

  /** Keyboard focus brings a box into view (FR-023). */
  const bringIntoView = useCallback(
    (id: string) => {
      if (inView(id)) return
      const placed = placedById.get(id)
      if (!placed) return
      void flow.setCenter(
        placed.x + placed.width / 2,
        placed.y + placed.height / 2,
        {
          zoom: flow.getZoom(),
          duration,
        }
      )
    },
    [flow, inView, placedById, duration]
  )

  const elements = useMemo(() => {
    // Tab order follows the picture: columns left to right, then top down.
    const ordered = [...layout.boxes].sort((a, b) => a.x - b.x || a.y - b.y)
    return ordered.map((placed): BoxElement | PanelElement => {
      const box = boxMap.byId.get(placed.id)
      const label = box?.label ?? placed.id
      const files = box?.files.length ?? 0
      const common = {
        id: placed.id,
        position: { x: placed.x, y: placed.y },
        width: placed.width,
        height: placed.height,
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        style: NODE_STYLE,
      }
      const selected =
        selection?.box === placed.id && selection.file === undefined
      const base = {
        label,
        files,
        strong: isBoxStrong(placed.id, strength, matches),
        selected,
        focusOnMount: focusTarget === placed.id,
        onOpen: () => {
          setFocusTarget(placed.id)
          actions.select({ box: placed.id })
          actions.openBox(placed.id)
        },
        onFocused: () => bringIntoView(placed.id),
      }
      if (!placed.open) return { ...common, type: "box", data: base }
      return {
        ...common,
        type: "panel",
        data: {
          ...base,
          // Inside an open panel, its rows carry the role's strength.
          strong: isBoxStrong(placed.id, strength, null),
          counts: box ? panelCounts(box) : [],
          more: placed.more,
          matches: matches === null ? null : (matches.get(placed.id) ?? 0),
          rows: placed.rows.map((path) => {
            const fileRoleName = fileRole.get(path) ?? ""
            return {
              path,
              name: fileName(path),
              tier: tierOf(fileRoleName),
              strong: isRowStrong(
                { box: placed.id, file: path, role: fileRoleName },
                strength,
                selection,
                role
              ),
              selected: selection?.file === path,
            }
          }),
          onClose: () => {
            setFocusTarget(placed.id)
            // A closed box has no rows: a file selected in it becomes the
            // box, or nothing would be one edge away from the selection.
            if (selection?.box === placed.id && selection.file !== undefined) {
              actions.select({ box: placed.id })
            }
            actions.toggleOpen(placed.id)
          },
          onSelectRow: (path: string) =>
            actions.select({ box: placed.id, file: path }),
        },
      }
    })
  }, [
    layout,
    boxMap,
    strength,
    matches,
    selection,
    actions,
    bringIntoView,
    fileRole,
    tierOf,
    role,
    focusTarget,
  ])

  const edges = useMemo(
    () =>
      layout.edges.map((edge): Edge => {
        const into = strength?.into.has(edge.id) ?? false
        const outOf = strength?.outOf.has(edge.id) ?? false
        const color = into
          ? "var(--map-edge-into)"
          : outOf
            ? "var(--map-edge-out-of)"
            : "var(--muted-foreground)"
        return {
          id: edge.id,
          source: edge.from.box,
          target: edge.to.box,
          sourceHandle:
            edge.from.row === undefined ? "out" : `out:${edge.from.row}`,
          targetHandle: edge.to.row === undefined ? "in" : `in:${edge.to.row}`,
          focusable: false,
          selectable: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 16,
            height: 16,
          },
          style: {
            stroke: color,
            strokeWidth: into || outOf ? 2 : 1,
            strokeDasharray: edge.typeOnly ? "4 3" : undefined,
            opacity:
              strength === null || into || outOf
                ? EDGE_OPACITY.plain
                : EDGE_OPACITY.dimmed,
          },
        }
      }),
    [layout.edges, strength]
  )

  return (
    // React Flow's attribution stays (its docs allow removing it only with a
    // Pro subscription), without its own white background, which clashes with
    // the dark palette: cleared through React Flow's theming variable.
    // Its link takes the theme's muted text (src/styles.css), as React Flow's
    // own grey fails WCAG's contrast.
    <div
      ref={wrapper}
      className="size-full [--xy-attribution-background-color:transparent]"
      onKeyDown={(event) => {
        if (event.key === "Escape") actions.select(null)
      }}
    >
      <ReactFlow
        nodes={elements}
        edges={edges}
        nodeTypes={ELEMENT_TYPES}
        fitView
        fitViewOptions={{
          padding: FIT_PADDING,
          maxZoom: 1,
          minZoom: FIRST_FIT_MIN_ZOOM,
        }}
        minZoom={0.1}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        disableKeyboardA11y
        zoomOnDoubleClick={false}
        onPaneClick={() => actions.select(null)}
        aria-label={`Dependency map of ${input.repository}`}
      >
        <Panel position="bottom-left">
          <ButtonGroup orientation="vertical" aria-label="Zoom">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Zoom in"
              onClick={() => void flow.zoomIn({ duration })}
            >
              <PlusIcon />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Zoom out"
              onClick={() => void flow.zoomOut({ duration })}
            >
              <MinusIcon />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Fit the map"
              onClick={() =>
                void flow.fitView({ padding: FIT_PADDING, duration })
              }
            >
              <MaximizeIcon />
            </Button>
          </ButtonGroup>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default function MapDrawing() {
  return (
    <ReactFlowProvider>
      <Drawing />
    </ReactFlowProvider>
  )
}
