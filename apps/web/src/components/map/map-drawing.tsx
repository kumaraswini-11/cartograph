// The map itself (spec 003): React Flow drawing what @workspace/graph lays
// out. Browser-only, loaded inside <ClientOnly> (plan D-03).
import "@xyflow/react/dist/base.css"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { fullStrength, layoutMap, roleCounts } from "@workspace/graph"
import { fileName } from "@workspace/parser/paths"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import { ButtonGroup } from "@workspace/ui/components/shadcn-ui/button-group"

import { useMapData } from "@/components/map/map-data"
import { useMapState } from "@/components/map/map-state"
import { BoxView, PanelView } from "@/components/map/map-boxes"
import type { BoxElement, PanelElement } from "@/components/map/map-boxes"

const ELEMENT_TYPES = { box: BoxView, panel: PanelView }
const ANIMATION_MS = 200

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

function Drawing() {
  const { input, boxMap } = useMapData()
  const { state, actions } = useMapState()
  const { selection, role, open } = state
  const flow = useReactFlow()
  const wrapper = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const duration = reducedMotion ? 0 : ANIMATION_MS

  const layout = useMemo(
    () => layoutMap(boxMap, input.edges, open),
    [boxMap, input.edges, open]
  )
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
  const tierOf = useMemo(
    () => new Map(input.taxonomy.map((t) => [t.role, t.tier])),
    [input.taxonomy]
  )

  /** Whether a box or panel is fully on screen. */
  const inView = useCallback(
    (id: string) => {
      const placed = layout.boxes.find((b) => b.id === id)
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
    [flow, layout.boxes]
  )

  // Opening a panel refits so it's visible, only ever zooming out (FR-011,
  // C-03): read after the new layout is drawn, never before.
  // A box and its panel are different elements: whichever replaces the one
  // that had the focus takes it, so the keyboard keeps its place (FR-023).
  const focusTarget = useRef<string | null>(null)

  const opened = useRef<ReadonlySet<string>>(open)
  useEffect(() => {
    const added = [...open].filter((id) => !opened.current.has(id))
    opened.current = open
    const id = added.at(0)
    if (id === undefined) return
    const frame = requestAnimationFrame(() => {
      if (inView(id)) return
      void flow.fitView({
        nodes: [{ id }],
        maxZoom: flow.getZoom(),
        padding: 0.1,
        duration,
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, flow, inView, duration])

  /** Keyboard focus brings a box into view (FR-023). */
  const bringIntoView = useCallback(
    (id: string) => {
      if (inView(id)) return
      const placed = layout.boxes.find((b) => b.id === id)
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
    [flow, inView, layout.boxes, duration]
  )

  const elements = useMemo(() => {
    const boxStrong = (id: string) =>
      (strength === null || strength.kept.has(id)) &&
      (matches === null || (matches.get(id) ?? 0) > 0)
    // Tab order follows the picture: columns left to right, then top down.
    const ordered = [...layout.boxes].sort((a, b) => a.x - b.x || a.y - b.y)
    return ordered.map((placed): BoxElement | PanelElement => {
      const box = boxMap.boxes.find((b) => b.id === placed.id)
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
      }
      const selected =
        selection?.box === placed.id && selection.file === undefined
      const base = {
        label,
        files,
        strong: boxStrong(placed.id),
        selected,
        focusOnMount: focusTarget.current === placed.id,
        onOpen: () => {
          focusTarget.current = placed.id
          actions.select({ box: placed.id })
          if (!open.has(placed.id)) actions.toggleOpen(placed.id)
        },
        onFocused: () => bringIntoView(placed.id),
      }
      if (!placed.open) return { ...common, type: "box", data: base }
      return {
        ...common,
        type: "panel",
        data: {
          ...base,
          // Inside an open panel, its rows carry the strength.
          strong: strength === null || strength.kept.has(placed.id),
          fanIn: box?.fanIn ?? 0,
          fanOut: box?.fanOut ?? 0,
          more: placed.more,
          matches: matches === null ? null : (matches.get(placed.id) ?? 0),
          rows: placed.rows.map((path) => {
            const fileRoleName = fileRole.get(path) ?? ""
            const inSelection =
              strength === null ||
              strength.kept.has(`${placed.id}\0${path}`) ||
              (selection?.box === placed.id && selection.file === undefined)
            return {
              path,
              name: fileName(path),
              tier: tierOf.get(fileRoleName) ?? "unidentified",
              strong: inSelection && (role === null || fileRoleName === role),
              selected: selection?.file === path,
            }
          }),
          onClose: () => {
            focusTarget.current = placed.id
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
    open,
    actions,
    bringIntoView,
    fileRole,
    tierOf,
    role,
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
            opacity: strength === null ? 0.6 : into || outOf ? 1 : 0.12,
          },
        }
      }),
    [layout.edges, strength]
  )

  return (
    // React Flow's attribution stays (its docs allow removing it only with a
    // Pro subscription), without its own white background, which clashes with
    // the dark palette: cleared through React Flow's theming variable.
    // Its link keeps React Flow's grey (#999), faint on white. To take a theme
    // colour instead, load React Flow's styles in Tailwind's base layer, as its
    // theming docs advise (`@import "@xyflow/react/dist/base.css" layer(base)`):
    // they load outside any layer now, so they win over Tailwind's classes.
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
        fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
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
              onClick={() => void flow.fitView({ padding: 0.1, duration })}
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
