import { memo, useEffect, useRef } from "react"
import { Handle, Position } from "@xyflow/react"
import type { Node, NodeProps } from "@xyflow/react"
import { MORE, ROW_HEIGHT, countOf, matchCount } from "@workspace/graph"
import type { Tier } from "@workspace/frameworks/taxonomy"
import { Badge } from "@workspace/ui/components/shadcn-ui/badge"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import { Card } from "@workspace/ui/components/shadcn-ui/card"
import {
  Item,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/shadcn-ui/item"
import { cn } from "@workspace/ui/lib/utils"

import { TierSwatch } from "@/components/map/tier"

/** A file row as the map shows it. */
export type RowView = {
  path: string
  name: string
  tier: Tier
  /** Kept at full strength (FR-013, FR-016). */
  strong: boolean
  selected: boolean
}

export type BoxData = {
  label: string
  files: number
  strong: boolean
  selected: boolean
  onOpen: () => void
  onFocused: () => void
  /** Take focus when drawn: the box or panel this one just replaced had it. */
  focusOnMount: boolean
}

export type PanelData = BoxData & {
  /** The header's counts, as `panelCounts` (@workspace/graph) words them. */
  counts: Array<string>
  rows: Array<RowView>
  more: number
  /** Files in the role chosen on the rail, or null with none chosen. */
  matches: number | null
  onClose: () => void
  onSelectRow: (path: string) => void
}

export type BoxElement = Node<BoxData, "box">
export type PanelElement = Node<PanelData, "panel">

/**
 * Dimmed, not faded: text takes the muted colour, which keeps WCAG's 4.5:1
 * in both themes (4.7:1 light, 6.9:1 dark), where 25% opacity left 1.8:1.
 * Only decoration (a row's tier dot) fades (spec 003 plan D-13).
 */
const DIMMED = "text-muted-foreground"

/**
 * Where edges attach: one handle in on the leading edge, one out on the
 * trailing edge, out of sight, since the map draws and never connects.
 * `id` names a row; without it, the handles are the box's own.
 */
function EdgeHandles({ id }: { id?: string }) {
  const hidden = "pointer-events-none opacity-0"
  return (
    <>
      <Handle
        id={id === undefined ? "in" : `in:${id}`}
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={hidden}
      />
      <Handle
        id={id === undefined ? "out" : `out:${id}`}
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={hidden}
      />
    </>
  )
}

/** Moves focus to `ref` when this box or panel replaces one that had it. */
function useFocusOnMount(focus: boolean) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (focus) ref.current?.focus()
  }, [focus])
  return ref
}

/**
 * A closed box: its label, opened by Enter, Space or a click (FR-007). The
 * selection is marked as current (`aria-current`), not pressed: selecting
 * isn't a toggle.
 */
export const BoxView = memo(function Box({ data }: NodeProps<BoxElement>) {
  const ref = useFocusOnMount(data.focusOnMount)
  return (
    <>
      <EdgeHandles />
      <Button
        ref={ref}
        variant="outline"
        onClick={data.onOpen}
        onFocus={data.onFocused}
        aria-current={data.selected || undefined}
        aria-label={`${data.label}, ${countOf(data.files, "file", "files")}. Open`}
        className={cn(
          "size-full justify-start px-4 font-mono text-path font-normal aria-[current=true]:border-map-selection aria-[current=true]:ring-2 aria-[current=true]:ring-map-selection",
          !data.strong && DIMMED
        )}
      >
        <span className="truncate">{data.label}</span>
      </Button>
    </>
  )
})

/**
 * An open box (FR-007 to FR-010): a header that closes it, with its counts,
 * and its files as rows; past `PANEL_ROW_LIMIT`, how many more there are.
 * Focus rings sit inside, since the card clips what overflows it.
 */
export const PanelView = memo(function Panel({
  data,
}: NodeProps<PanelElement>) {
  const ref = useFocusOnMount(data.focusOnMount)
  const badges = [
    ...data.counts,
    ...(data.matches === null ? [] : [matchCount(data.matches)]),
  ]
  return (
    <Card
      role="group"
      aria-label={`${data.label}, ${data.counts[0] ?? ""}`}
      data-selected={data.selected}
      className="size-full gap-0 rounded-md py-0 data-[selected=true]:ring-2 data-[selected=true]:ring-map-selection"
    >
      <div className="relative" style={{ height: ROW_HEIGHT }}>
        <EdgeHandles />
        <Button
          ref={ref}
          variant="ghost"
          onClick={data.onClose}
          onFocus={data.onFocused}
          aria-expanded="true"
          // The visible label and counts, in their order, then the action.
          aria-label={`${[data.label, ...badges].join(", ")}. Close`}
          className={cn(
            "size-full justify-start gap-2 rounded-none border-b-border px-4 font-normal focus-visible:ring-inset",
            !data.strong && DIMMED
          )}
        >
          <span className="truncate font-mono text-path font-medium">
            {data.label}
          </span>
          {data.counts.map((count) => (
            <Badge key={count} variant="secondary" className="tabular-nums">
              {count}
            </Badge>
          ))}
          {data.matches !== null && (
            <Badge className="ms-auto tabular-nums">
              {matchCount(data.matches)}
            </Badge>
          )}
        </Button>
      </div>
      <ItemGroup className="gap-0 has-data-[size=xs]:gap-0">
        {data.rows.map((row) => (
          <div
            key={row.path}
            role="listitem"
            className="relative"
            style={{ height: ROW_HEIGHT }}
          >
            <EdgeHandles id={row.path} />
            <Item
              size="xs"
              render={<button type="button" />}
              onClick={() => data.onSelectRow(row.path)}
              onFocus={data.onFocused}
              aria-current={row.selected || undefined}
              title={row.path}
              className={cn(
                "size-full rounded-none px-4 py-0 focus-visible:ring-inset aria-[current=true]:ring-2 aria-[current=true]:ring-map-selection aria-[current=true]:ring-inset",
                !row.strong && DIMMED
              )}
            >
              <ItemMedia>
                <TierSwatch
                  tier={row.tier}
                  className={cn(!row.strong && "opacity-40")}
                />
              </ItemMedia>
              <ItemTitle className="font-mono text-path font-normal">
                {row.name}
              </ItemTitle>
            </Item>
          </div>
        ))}
        {data.more > 0 && (
          <div
            role="listitem"
            className="relative"
            style={{ height: ROW_HEIGHT }}
          >
            <EdgeHandles id={MORE} />
            <Item size="xs" className="size-full px-4 py-0">
              <ItemDescription>
                {countOf(data.more, "more file", "more files")}
              </ItemDescription>
            </Item>
          </div>
        )}
      </ItemGroup>
    </Card>
  )
})
