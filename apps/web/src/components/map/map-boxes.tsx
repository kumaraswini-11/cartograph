import { memo, useEffect, useRef } from "react"
import { Handle, Position } from "@xyflow/react"
import type { Node, NodeProps } from "@xyflow/react"
import { MORE, ROW_HEIGHT } from "@workspace/graph"
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
  fanIn: number
  fanOut: number
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

/** A closed box: its label, opened by Enter, Space or a click (FR-007). */
/** Moves focus to `ref` when this box or panel replaces one that had it. */
function useFocusOnMount(focus: boolean) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (focus) ref.current?.focus()
  }, [focus])
  return ref
}

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
        aria-pressed={data.selected}
        aria-label={`${data.label}, ${data.files} files. Open`}
        className={cn(
          "size-full justify-start px-4 font-mono text-[13px] font-normal aria-pressed:border-map-selection aria-pressed:ring-2 aria-pressed:ring-map-selection",
          !data.strong && "opacity-25"
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
 */
export const PanelView = memo(function Panel({
  data,
}: NodeProps<PanelElement>) {
  const ref = useFocusOnMount(data.focusOnMount)
  const counts = [
    `${data.files} files`,
    `in ${data.fanIn}`,
    `out ${data.fanOut}`,
  ]
  return (
    <Card
      role="group"
      aria-label={`${data.label}, ${data.files} files`}
      data-selected={data.selected}
      className={cn(
        "size-full gap-0 rounded-md py-0 data-[selected=true]:ring-2 data-[selected=true]:ring-map-selection",
        !data.strong && "opacity-25"
      )}
    >
      <div className="relative" style={{ height: ROW_HEIGHT }}>
        <EdgeHandles />
        <Button
          ref={ref}
          variant="ghost"
          onClick={data.onClose}
          onFocus={data.onFocused}
          aria-expanded="true"
          aria-label={`${data.label}, ${data.files} files, ${data.fanIn} in, ${data.fanOut} out. Close`}
          className="size-full justify-start gap-2 rounded-none border-b-border px-4 font-normal"
        >
          <span className="truncate font-mono text-[13px] font-medium">
            {data.label}
          </span>
          {counts.map((count) => (
            <Badge key={count} variant="secondary" className="tabular-nums">
              {count}
            </Badge>
          ))}
          {data.matches !== null && (
            <Badge className="ms-auto tabular-nums">{data.matches} match</Badge>
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
              aria-pressed={row.selected}
              title={row.path}
              className={cn(
                "size-full rounded-none px-4 py-0 aria-pressed:bg-muted",
                !row.strong && "opacity-25"
              )}
            >
              <ItemMedia>
                <TierSwatch tier={row.tier} />
              </ItemMedia>
              <ItemTitle className="font-mono text-[13px] font-normal">
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
              <ItemDescription>{data.more} more files</ItemDescription>
            </Item>
          </div>
        )}
      </ItemGroup>
    </Card>
  )
})
